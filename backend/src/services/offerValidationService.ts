import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { VtexOffersFile } from '../types/catalogOffers.js';

const rootDir = process.cwd().endsWith('backend')
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

const offersPath = path.join(rootDir, 'public', 'data', 'offers-vtex.json');

export async function validateOffersOutput() {
  const content = await readFile(offersPath, 'utf8');
  const parsed = JSON.parse(content) as VtexOffersFile;
  const errors: string[] = [];
  const seen = new Set<string>();

  if (!Array.isArray(parsed.items)) {
    errors.push('items precisa ser um array.');
  }

  for (const [index, item] of parsed.items.entries()) {
    if (typeof item.price !== 'number' || Number.isNaN(item.price) || item.price <= 0) {
      errors.push(`Item ${index}: price precisa ser número positivo.`);
    }

    if (!item.description?.trim() && !item.productName?.trim()) {
      errors.push(`Item ${index}: productDescription/productName não pode estar vazio.`);
    }

    if (!item.supermarketName?.trim()) {
      errors.push(`Item ${index}: supermarketName não pode estar vazio.`);
    }

    if (item.validUntil && new Date(`${item.validUntil}T23:59:59`) < new Date()) {
      errors.push(`Item ${index}: oferta vencida apareceu no arquivo principal.`);
    }

    const key = [
      item.supermarketName,
      item.city ?? '',
      (item.description || item.productName).toLowerCase(),
      item.price.toFixed(2),
      item.validUntil ?? ''
    ].join('|');

    if (seen.has(key)) {
      errors.push(`Item ${index}: oferta duplicada detectada.`);
    }
    seen.add(key);
  }

  if (parsed.total !== parsed.items.length) {
    errors.push(`total (${parsed.total}) difere do tamanho de items (${parsed.items.length}).`);
  }

  return {
    valid: errors.length === 0,
    total: parsed.items.length,
    errors
  };
}
