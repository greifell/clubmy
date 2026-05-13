import axios from 'axios';
import * as cheerio from 'cheerio';

import type { CatalogSource, ExtractedCatalogText } from '../types/catalogOffers.js';
import { logOfferCollector } from './offerLoggerService.js';

const REQUEST_HEADERS = {
  'user-agent': 'ClubMyOffersBot/1.0 (+https://www.clubmy.com.br; flipsnack extraction)',
  accept: 'text/html,application/json,image/*;q=0.9,*/*;q=0.8'
};

function cleanupUrl(rawUrl: string) {
  return rawUrl.replaceAll('\\/', '/').replace(/^["']|["']$/g, '').replace(/[),.]+$/, '');
}

export async function extractFlipsnackCatalog(source: CatalogSource): Promise<ExtractedCatalogText> {
  try {
    const response = await axios.get<string>(source.sourceUrl, {
      headers: REQUEST_HEADERS,
      timeout: 30000,
      responseType: 'text',
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const html = response.data;
    const pdfUrl = (html.match(/https?:\\?\/\\?\/[^"']+?\.pdf[^"']*/i)?.[0] ?? null)?.replaceAll('\\/', '/');
    const imageUrls = Array.from(
      new Set(
        (html.match(/https?:\\?\/\\?\/[^"']+?\.(?:jpg|jpeg|png|webp)[^"']*/gi) ?? []).map(cleanupUrl)
      )
    );

    const $ = cheerio.load(html);
    const visibleText = $('body').text().replace(/\s+/g, ' ').trim();
    const jsonText = Array.from(html.matchAll(/"(?:title|description|name|text)"\s*:\s*"([^"]+)"/gi))
      .map((match) => match[1].replaceAll('\\n', '\n').replaceAll('\\"', '"'))
      .join('\n');

    const text = [visibleText, jsonText, pdfUrl ? `PDF interno: ${pdfUrl}` : ''].filter(Boolean).join('\n');

    await logOfferCollector('flipsnack extraction completed', {
      sourceUrl: source.sourceUrl,
      pdfUrl,
      images: imageUrls.length,
      textLength: text.length
    });

    return {
      source: pdfUrl
        ? {
            ...source,
            sourceUrl: pdfUrl,
            type: 'pdf'
          }
        : source,
      text,
      pageImages: imageUrls,
      confidenceScore: text.length > 80 || imageUrls.length > 0 ? 0.55 : 0.2
    };
  } catch (error) {
    await logOfferCollector('flipsnack extraction failed', {
      sourceUrl: source.sourceUrl,
      error: error instanceof Error ? error.message : error
    });

    return {
      source,
      text: '',
      confidenceScore: 0
    };
  }
}
