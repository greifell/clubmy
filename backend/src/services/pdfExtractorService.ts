import axios from 'axios';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
  let tempDir: string | null = null;

  try {
    const buffer = await loadPdfBuffer(source);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const text = result.text.trim();
    if (text.length >= 80) {
      await parser.destroy();
      return {
        source,
        text,
        confidenceScore: 0.88
      };
    }

    await logOfferCollector('pdf text extraction produced little text; trying OCR fallback', {
      sourceUrl: source.sourceUrl,
      textLength: text.length
    });

    tempDir = await mkdtemp(path.join(tmpdir(), 'clubmy-pdf-ocr-'));
    const maxPages = Number(process.env.COLLECT_OFFERS_PDF_OCR_PAGES ?? 6);
    const screenshot = await parser.getScreenshot({
      scale: 2,
      first: maxPages
    });
    await parser.destroy();

    const ocrTexts: string[] = [];
    let confidenceSum = 0;

    for (const [index, page] of screenshot.pages.entries()) {
      if (!page.data) continue;

      const imagePath = path.join(tempDir, `page-${index + 1}.png`);
      await writeFile(imagePath, page.data);

      const ocrResult = await extractImageCatalogText({
        ...source,
        sourceName: `${source.sourceName} página ${index + 1}`,
        localPath: imagePath,
        type: 'image'
      });

      if (ocrResult.text.trim()) {
        ocrTexts.push(ocrResult.text.trim());
        confidenceSum += ocrResult.confidenceScore;
      }
    }

    const ocrText = ocrTexts.join('\n\n').trim();

    return {
      source,
      text: [text, ocrText].filter(Boolean).join('\n\n'),
      confidenceScore: ocrTexts.length > 0 ? Math.max(0.45, confidenceSum / ocrTexts.length) : text.length > 0 ? 0.35 : 0.1
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
  } finally {
    if (tempDir) {
      await rm(tempDir, {
        recursive: true,
        force: true
      });
    }
  }
}
