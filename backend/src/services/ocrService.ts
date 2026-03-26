import Tesseract from 'tesseract.js';

export async function extractTextFromFlyer(imageUrl: string) {
  const result = await Tesseract.recognize(imageUrl, 'por');
  return result.data.text;
}

export function extractPriceHints(ocrText: string) {
  const regex = /\b\d{1,3}[\.,]\d{2}\b/g;
  return ocrText.match(regex) ?? [];
}
