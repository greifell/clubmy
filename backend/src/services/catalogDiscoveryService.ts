import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';

import { supermarketCatalogs } from '../data/supermarkets.js';
import type { CatalogSource, CatalogSourceType, SupermarketCatalogConfig } from '../types/catalogOffers.js';
import { logOfferCollector } from './offerLoggerService.js';

const REQUEST_HEADERS = {
  'user-agent': 'ClubMyOffersBot/1.0 (+https://www.clubmy.com.br; catalog discovery)',
  accept: 'text/html,application/pdf,image/*;q=0.9,*/*;q=0.8'
};

const rootDir = process.cwd().endsWith('backend')
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

const inputCatalogsDir = path.join(rootDir, 'input_catalogs');

function absoluteUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

function guessSourceType(url: string, text = ''): CatalogSourceType {
  const value = `${url} ${text}`.toLowerCase().replaceAll('&amp;', '&');

  if (value.includes('flipsnack.com')) return 'flipsnack';
  if (value.match(/\.(pdf)(\?|#|$)/)) return 'pdf';
  if (value.match(/\.(png|jpe?g|webp)(\?|#|$)/)) return 'image';
  return 'webpage';
}

function isNoisyAsset(url: string, label = '') {
  const value = `${url} ${label}`.toLowerCase();
  return (
    value.includes('/favicon') ||
    value.includes('logo-assets') ||
    value.includes('/sticker/') ||
    value.includes('/og/image/') ||
    value.includes('apple-icon') ||
    value.includes('ms-icon') ||
    value.includes('web-app-manifest') ||
    value.includes('whatsapp.com')
  );
}

function looksLikeCatalog(text: string, href: string, config: SupermarketCatalogConfig) {
  const haystack = `${text} ${href}`.toLowerCase();
  const keywords = [
    'oferta',
    'ofertas',
    'encarte',
    'catalogo',
    'catálogo',
    'bebidas',
    'semana',
    'promoc'
  ];

  return (
    keywords.some((keyword) => haystack.includes(keyword)) ||
    config.sourceNames.some((name) => haystack.includes(name.toLowerCase())) ||
    haystack.includes('flipsnack') ||
    haystack.includes('.pdf')
  );
}

function inferCity(text: string, cities: string[]) {
  const lower = text.toLowerCase();
  return cities.find((city) => lower.includes(city.toLowerCase()));
}

async function fetchHtml(url: string) {
  const response = await axios.get<string>(url, {
    headers: REQUEST_HEADERS,
    timeout: 20000,
    maxRedirects: 5,
    responseType: 'text',
    validateStatus: (status) => status >= 200 && status < 400
  });

  return response.data;
}

async function discoverFromUrl(config: SupermarketCatalogConfig, url: string): Promise<CatalogSource[]> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const sources = new Map<string, CatalogSource>();
    const discoveredAt = new Date().toISOString();

    $('a[href], iframe[src], embed[src], object[data], img[src], source[src]').each((_, element) => {
      const el = $(element);
      const href = el.attr('href') ?? el.attr('src') ?? el.attr('data');
      if (!href) return;

      const sourceUrl = absoluteUrl(href, url);
      if (!sourceUrl) return;

      const label = el.text().trim() || el.attr('alt') || el.attr('title') || sourceUrl;
      if (isNoisyAsset(sourceUrl, label)) return;

      if (!looksLikeCatalog(label, sourceUrl, config)) return;

      const sourceName =
        config.sourceNames.find((name) => `${label} ${sourceUrl}`.toLowerCase().includes(name.toLowerCase())) ??
        label.slice(0, 80) ??
        config.supermarketName;

      sources.set(sourceUrl, {
        supermarketName: config.supermarketName,
        sourceName,
        sourceUrl,
        type: guessSourceType(sourceUrl, label),
        city: inferCity(`${label} ${sourceUrl}`, config.cities) ?? config.city,
        discoveredAt
      });
    });

    const jsonLikeMatches = html.match(/https?:\\?\/\\?\/[^"'\s<>]+?(?:\.pdf|flipsnack\.com|\.jpg|\.jpeg|\.png|\.webp)[^"'\s<>]*/gi) ?? [];
    for (const rawUrl of jsonLikeMatches) {
      const cleanUrl = rawUrl.replaceAll('\\/', '/').replaceAll('&amp;', '&').replace(/[),.]+$/, '');
      const sourceUrl = absoluteUrl(cleanUrl, url);
      if (!sourceUrl) continue;
      if (isNoisyAsset(sourceUrl)) continue;

      sources.set(sourceUrl, {
        supermarketName: config.supermarketName,
        sourceName: config.supermarketName,
        sourceUrl,
        type: guessSourceType(sourceUrl),
        city: inferCity(sourceUrl, config.cities) ?? config.city,
        discoveredAt
      });
    }

    await logOfferCollector('catalog discovery completed', {
      supermarketName: config.supermarketName,
      url,
      total: sources.size
    });

    return Array.from(sources.values());
  } catch (error) {
    await logOfferCollector('catalog discovery failed', {
      supermarketName: config.supermarketName,
      url,
      error: error instanceof Error ? error.message : error
    });
    return [];
  }
}

export async function discoverRemoteCatalogs(): Promise<CatalogSource[]> {
  const allSources: CatalogSource[] = [];

  for (const config of supermarketCatalogs) {
    const urls = [config.siteUrl, ...(config.extraUrls ?? [])];
    for (const url of urls) {
      allSources.push(...(await discoverFromUrl(config, url)));
    }
  }

  return Array.from(new Map(allSources.map((source) => [source.sourceUrl, source])).values());
}

export async function discoverManualCatalogs(): Promise<CatalogSource[]> {
  try {
    const files = await readdir(inputCatalogsDir);
    const sources: CatalogSource[] = [];

    for (const file of files) {
      const localPath = path.join(inputCatalogsDir, file);
      const fileStat = await stat(localPath);
      if (!fileStat.isFile()) continue;

      const lower = file.toLowerCase();
      const supported =
        lower.endsWith('.pdf') ||
        lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.webp');

      if (!supported) continue;

      sources.push({
        supermarketName: inferManualSupermarket(file),
        sourceName: file,
        sourceUrl: `manual://${file}`,
        type: lower.endsWith('.pdf') ? 'pdf' : 'image',
        city: inferManualCity(file),
        localPath,
        discoveredAt: fileStat.mtime.toISOString()
      });
    }

    await logOfferCollector('manual catalog discovery completed', { total: sources.length });
    return sources;
  } catch (error) {
    await logOfferCollector('manual catalog discovery failed', {
      error: error instanceof Error ? error.message : error
    });
    return [];
  }
}

function inferManualSupermarket(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.includes('moniari')) return 'Super Moniari';
  if (lower.includes('rosso') || lower.includes('mm')) return 'MM Rosso';
  return 'Manual WhatsApp';
}

function inferManualCity(fileName: string) {
  const cities = supermarketCatalogs.flatMap((config) => config.cities);
  return inferCity(fileName, cities);
}
