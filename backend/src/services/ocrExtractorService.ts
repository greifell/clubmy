import Tesseract from 'tesseract.js';

import type { CatalogSource, ExtractedCatalogText } from '../types/catalogOffers.js';
import { logOfferCollector } from './offerLoggerService.js';

export async function extractImageCatalogText(source: CatalogSource): Promise<ExtractedCatalogText> {
  const target = source.localPath ?? source.sourceUrl;

  try {
    const result = await Tesseract.recognize(target, 'por', {
      logger: () => undefined
    });

    return {
      source,
      text: result.data.text,
      confidenceScore: Math.max(0.25, Math.min(0.95, result.data.confidence / 100))
    };
  } catch (error) {
    await logOfferCollector('ocr extraction failed', {
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
