import axios from 'axios';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

import type { CatalogSource, ExtractedCatalogText } from '../types/catalogOffers.js';
import { logOfferCollector } from './offerLoggerService.js';
import { extractImageCatalogText } from './ocrExtractorService.js';

const REQUEST_HEADERS = {
  'user-agent': 'ClubMyOffersBot/1.0 (+https://www.clubmy.com.br; pdf extraction)',
  accept: 'application/pdf,*/*;q=0.8'
};

async function loadPdfBuffer(source: CatalogSource) {
  if (source.localPath) {
    return readFile(source.localPath);
  }

  const response = await axios.get<ArrayBuffer>(source.sourceUrl, {
    headers: REQUEST_HEADERS,
    timeout: 30000,
    responseType: 'arraybuffer',
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400
  });

  return Buffer.from(response.data);
}

export async function extractPdfCatalogText(source: CatalogSource): Promise<ExtractedCatalogText> {
  try {
    const buffer = await loadPdfBuffer(source);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const text = result.text.trim();
    if (text.length >= 80) {
      return {
        source,
        text,
        confidenceScore: 0.88
      };
    }

    await logOfferCollector('pdf text extraction produced little text; OCR fallback skipped for PDF pages', {
      sourceUrl: source.sourceUrl,
      textLength: text.length
    });

    return {
      source,
      text,
      confidenceScore: text.length > 0 ? 0.35 : 0.1
    };
  } catch (error) {
    await logOfferCollector('pdf extraction failed', {
      sourceUrl: source.sourceUrl,
      error: error instanceof Error ? error.message : error
    });

    if (source.localPath && /\.(png|jpe?g|webp)$/i.test(source.localPath)) {
      return extractImageCatalogText(source);
    }

    return {
      source,
      text: '',
      confidenceScore: 0
    };
  }
}
