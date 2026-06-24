import axios from 'axios';
import { readFile } from 'node:fs/promises';
import Tesseract, { type Worker } from 'tesseract.js';

import type { CatalogSource, ExtractedCatalogText } from '../types/catalogOffers.js';
import { logOfferCollector } from './offerLoggerService.js';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function detectSupportedImageFormat(buffer: Buffer) {
  if (buffer.length < 12) return null;

  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'jpeg';
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }

  if (buffer.subarray(0, 2).toString('ascii') === 'BM') {
    return 'bmp';
  }

  const tiffHeader = buffer.subarray(0, 4).toString('hex');
  if (tiffHeader === '49492a00' || tiffHeader === '4d4d002a') {
    return 'tiff';
  }

  return null;
}

async function loadImageBuffer(source: CatalogSource) {
  if (source.localPath) {
    return readFile(source.localPath);
  }

  const response = await axios.get<ArrayBuffer>(source.sourceUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxRedirects: 5,
    maxContentLength: MAX_IMAGE_BYTES,
    maxBodyLength: MAX_IMAGE_BYTES,
    headers: {
      accept: 'image/jpeg,image/png,image/bmp,image/tiff;q=0.9,*/*;q=0.1',
      'user-agent': 'ClubMyOffersBot/1.0 (+https://www.clubmy.com.br; OCR)'
    },
    validateStatus: (status) => status >= 200 && status < 400
  });

  return Buffer.from(response.data);
}

export async function extractImageCatalogText(source: CatalogSource): Promise<ExtractedCatalogText> {
  let worker: Worker | null = null;
  let workerError: unknown = null;

  try {
    const imageBuffer = await loadImageBuffer(source);
    const imageFormat = detectSupportedImageFormat(imageBuffer);

    if (!imageFormat) {
      await logOfferCollector('ocr source ignored because it is not a supported image', {
        sourceUrl: source.sourceUrl,
        bytes: imageBuffer.length
      });

      return {
        source,
        text: '',
        confidenceScore: 0
      };
    }

    worker = await Tesseract.createWorker('por', 1, {
      logger: () => undefined,
      errorHandler: (error) => {
        workerError = error;
      }
    });
    const result = await worker.recognize(imageBuffer);

    if (workerError) {
      throw workerError;
    }

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
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    }
  }
}
