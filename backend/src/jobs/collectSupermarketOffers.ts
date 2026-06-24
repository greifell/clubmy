import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { discoverManualCatalogs, discoverRemoteCatalogs } from '../services/catalogDiscoveryService.js';
import { extractFlipsnackCatalog } from '../services/flipsnackExtractorService.js';
import { extractImageCatalogText } from '../services/ocrExtractorService.js';
import { parseOffersFromCatalog } from '../services/offerParserService.js';
import { saveOffersFile } from '../services/offerStorageService.js';
import { extractPdfCatalogText } from '../services/pdfExtractorService.js';
import { extractWebCatalogText } from '../services/webCatalogExtractorService.js';
import { logOfferCollector } from '../services/offerLoggerService.js';
import type { CatalogSource, ExtractedCatalogText, ParsedOffer } from '../types/catalogOffers.js';

const rootDir = process.cwd().endsWith('backend')
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

async function ensureRuntimeFolders() {
  await Promise.all([
    mkdir(path.join(rootDir, 'input_catalogs'), { recursive: true }),
    mkdir(path.join(rootDir, 'oferta'), { recursive: true }),
    mkdir(path.join(rootDir, 'archive'), { recursive: true }),
    mkdir(path.join(rootDir, 'logs'), { recursive: true }),
    mkdir(path.join(rootDir, 'public', 'data'), { recursive: true })
  ]);
}

async function extractCatalog(source: CatalogSource): Promise<ExtractedCatalogText> {
  if (source.type === 'pdf' || source.type === 'local') {
    return extractPdfCatalogText(source);
  }

  if (source.type === 'image') {
    return extractImageCatalogText(source);
  }

  if (source.type === 'flipsnack') {
    const extracted = await extractFlipsnackCatalog(source);
    if (extracted.source.type === 'pdf' && extracted.source.sourceUrl !== source.sourceUrl) {
      const pdfText = await extractPdfCatalogText(extracted.source);
      return {
        ...pdfText,
        pageImages: extracted.pageImages,
        confidenceScore: Math.max(pdfText.confidenceScore, extracted.confidenceScore)
      };
    }
    return extracted;
  }

  return extractWebCatalogText(source);
}

export async function collectSupermarketOffers(options: { includeRemote?: boolean } = {}) {
  await ensureRuntimeFolders();
  await logOfferCollector('offer collection started');

  const includeRemote = options.includeRemote ?? true;
  const [remoteSources, manualSources] = await Promise.all([
    includeRemote ? discoverRemoteCatalogs() : Promise.resolve([]),
    discoverManualCatalogs()
  ]);

  const maxSources = Number(process.env.COLLECT_OFFERS_MAX_SOURCES ?? 30);
  const sources = Array.from(
    new Map([...remoteSources, ...manualSources].map((source) => [source.localPath ?? source.sourceUrl, source])).values()
  )
    .sort((a, b) => sourcePriority(a) - sourcePriority(b))
    .slice(0, maxSources);

  const parsedOffers: ParsedOffer[] = [];

  for (const source of sources) {
    await logOfferCollector('processing catalog source', source);

    const extracted = await extractCatalog(source);
    const offers = parseOffersFromCatalog(extracted);

    parsedOffers.push(...offers);

    await logOfferCollector('catalog source processed', {
      sourceUrl: source.sourceUrl,
      textLength: extracted.text.length,
      offers: offers.length,
      confidenceScore: extracted.confidenceScore
    });
  }

  const output = await saveOffersFile(parsedOffers);

  await logOfferCollector('offer collection finished', {
    sources: sources.length,
    offers: parsedOffers.length,
    saved: output.total
  });

  return {
    sources: sources.length,
    extracted: parsedOffers.length,
    saved: output.total
  };
}

function sourcePriority(source: CatalogSource) {
  if (source.localPath) return 0;
  if (source.type === 'pdf') return 1;
  if (source.type === 'flipsnack') return 2;
  if (source.type === 'image') return 3;
  return 4;
}
