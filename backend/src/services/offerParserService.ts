import { createHash } from 'node:crypto';
import { z } from 'zod';

import type { ExtractedCatalogText, ParsedOffer, VtexOffer } from '../types/catalogOffers.js';

const pricePattern = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})(?:\s*(?:cada|un|kg|pct|cx|fardo|litro|l|ml|g))?/gi;
const packagePattern = /\b\d+(?:[,.]\d+)?\s?(?:kg|g|mg|l|lt|ml|un|und|pct|pacote|caixa|cx|fardo|rolo|rolos|leve\s*\d+|pague\s*\d+)\b/i;

const offerSchema = z.object({
  supermarketName: z.string().min(1),
  productDescription: z.string().min(2),
  price: z.number().positive()
});

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseBrazilianPrice(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'));
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function inferBrand(description: string) {
  const words = description
    .replace(/\b(?:oferta|especial|super|preco|preço|un|kg|pct|caixa|fardo)\b/gi, '')
    .split(/\s+/)
    .filter((word) => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç'-]{2,}$/.test(word));

  if (words.length <= 1) return null;
  return words.at(-1) ?? null;
}

function inferPackageSize(description: string) {
  return description.match(packagePattern)?.[0] ?? null;
}

function parseDateParts(day: string, month: string, year?: string) {
  const resolvedYear = Number(year ?? new Date().getFullYear());
  const date = new Date(resolvedYear, Number(month) - 1, Number(day), 12);
  return Number.isNaN(date.getTime()) ? null : toIsoDate(date);
}

function inferValidity(text: string) {
  const rangeWithYear = text.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\s*(?:a|até|-|–|—)\s*(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/i);
  if (rangeWithYear) {
    const startYear = normalizeYear(rangeWithYear[3] ?? rangeWithYear[6]);
    const endYear = normalizeYear(rangeWithYear[6] ?? rangeWithYear[3]);

    return {
      start: parseDateParts(rangeWithYear[1], rangeWithYear[2], startYear),
      end: parseDateParts(rangeWithYear[4], rangeWithYear[5], endYear)
    };
  }

  const until = text.match(/(?:validade|válido|valido|até|ate)\D{0,20}(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/i);
  if (until) {
    return {
      start: null,
      end: parseDateParts(until[1], until[2], normalizeYear(until[3]))
    };
  }

  return { start: null, end: null };
}

function normalizeYear(year?: string) {
  if (!year) return undefined;
  return year.length === 2 ? `20${year}` : year;
}

function inferCity(text: string, fallback?: string) {
  const cities = ['Criciúma', 'Içara', 'Tubarão', 'Jaguaruna', 'Sangão', 'Gaivota', 'Araranguá'];
  const lower = text.toLowerCase();
  return cities.find((city) => lower.includes(city.toLowerCase())) ?? fallback ?? null;
}

function statusFromEndDate(endDate: string | null): ParsedOffer['status'] {
  if (!endDate) return 'active_uncertain';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T23:59:59`);
  return end < today ? 'expired' : 'active';
}

function scoreOffer(description: string, sourceScore: number, validityEnd: string | null) {
  let score = 0.35 + sourceScore * 0.35;
  if (inferPackageSize(description)) score += 0.08;
  if (inferBrand(description)) score += 0.05;
  if (validityEnd) score += 0.1;
  if (description.length >= 8) score += 0.07;
  return Number(Math.min(0.98, score).toFixed(2));
}

function compactRawContext(lines: string[], centerIndex: number) {
  return lines.slice(Math.max(0, centerIndex - 2), centerIndex + 3).join('\n').slice(0, 700);
}

function cleanDescription(value: string) {
  return normalizeSpaces(
    value
      .replace(/\b\d+\s*por\b/gi, '')
      .replace(pricePattern, '')
      .replace(/\b(?:por|cada|oferta|a partir de|somente|apenas)\b/gi, '')
      .replace(/[|•*_]+/g, ' ')
      .replace(/^[^\p{L}\d]+/u, '')
      .replace(/\b\d{1,2}\b\s*$/g, '')
  );
}

function hasPrice(value: string) {
  pricePattern.lastIndex = 0;
  return pricePattern.test(value);
}

function isPriceOnlyLine(value: string) {
  return /^(?:R\$)?\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*(?:un|kg|g|ml|l)?$/i.test(value) || /^R\$$/i.test(value);
}

function isLikelyDescriptionLine(value: string) {
  const cleaned = cleanDescription(value);
  if (cleaned.length < 3) return false;
  if (isPriceOnlyLine(cleaned)) return false;
  if (/^\d+$/.test(cleaned)) return false;
  if (/^(validade|oferta|ofertas|encarte|domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado)\b/i.test(cleaned)) {
    return false;
  }
  return /\p{L}/u.test(cleaned);
}

function buildDescriptionCandidate(lines: string[], index: number, line: string) {
  const inlineDescription = cleanDescription(line);
  if (inlineDescription.length >= 4 && !isPriceOnlyLine(inlineDescription)) {
    return inlineDescription;
  }

  const previousDescriptions: string[] = [];

  for (let cursor = index - 1; cursor >= 0 && previousDescriptions.length < 4; cursor -= 1) {
    const candidate = lines[cursor];
    if (isPriceOnlyLine(candidate)) continue;
    if (hasPrice(candidate)) break;
    if (!isLikelyDescriptionLine(candidate)) continue;

    previousDescriptions.unshift(cleanDescription(candidate));
  }

  return normalizeSpaces(previousDescriptions.join(' '));
}

export function parseOffersFromCatalog(catalog: ExtractedCatalogText): ParsedOffer[] {
  const text = catalog.text;
  if (!text.trim()) return [];

  const validity = inferValidity(`${catalog.source.sourceName}\n${text}`);
  const lines = text
    .split(/\r?\n/)
    .map(normalizeSpaces)
    .filter((line) => line.length > 0);

  const offers: ParsedOffer[] = [];
  const capturedAt = new Date().toISOString();

  lines.forEach((line, index) => {
    const matches = Array.from(line.matchAll(pricePattern));
    if (matches.length === 0) return;

    for (const match of matches) {
      const price = parseBrazilianPrice(match[1]);
      if (!Number.isFinite(price) || price <= 0) continue;

      const descriptionCandidate = buildDescriptionCandidate(lines, index, line);

      if (descriptionCandidate.length < 3 || /^\d/.test(descriptionCandidate)) continue;

      const rawText = compactRawContext(lines, index);
      const city = inferCity(rawText, catalog.source.city);
      const offerEndDate = validity.end;
      const parsedOffer: ParsedOffer = {
        supermarketName: catalog.source.supermarketName,
        sourceName: catalog.source.sourceName,
        sourceUrl: catalog.source.sourceUrl,
        city,
        productDescription: descriptionCandidate.slice(0, 180),
        brand: inferBrand(descriptionCandidate),
        packageSize: inferPackageSize(descriptionCandidate),
        price,
        originalPrice: inferOriginalPrice(rawText, price),
        unitPrice: inferUnitPrice(rawText),
        offerStartDate: validity.start,
        offerEndDate,
        capturedAt,
        imageUrl: catalog.pageImages?.[0] ?? null,
        cropImagePath: null,
        rawText,
        confidenceScore: scoreOffer(descriptionCandidate, catalog.confidenceScore, offerEndDate),
        status: statusFromEndDate(offerEndDate)
      };

      if (offerSchema.safeParse(parsedOffer).success) {
        offers.push(parsedOffer);
      }
    }
  });

  return offers;
}

function inferOriginalPrice(rawText: string, price: number) {
  if (!/\b(de|antes|preço normal|preco normal|listprice)\b/i.test(rawText)) {
    return null;
  }

  const prices = Array.from(rawText.matchAll(pricePattern))
    .map((match) => parseBrazilianPrice(match[1]))
    .filter((value) => value > price);

  return prices[0] ?? null;
}

function inferUnitPrice(rawText: string) {
  return rawText.match(/R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*\/\s*(?:kg|l|un|100g|m²|m2)/i)?.[0] ?? null;
}

export function offerHash(input: Pick<ParsedOffer, 'supermarketName' | 'city' | 'productDescription' | 'price' | 'offerEndDate'>) {
  return createHash('sha1')
    .update(
      [
        input.supermarketName,
        input.city ?? '',
        input.productDescription.toLowerCase(),
        input.price.toFixed(2),
        input.offerEndDate ?? ''
      ].join('|')
    )
    .digest('hex')
    .slice(0, 16);
}

export function toVtexOffer(offer: ParsedOffer): VtexOffer {
  const productId = offerHash(offer);
  const productName = offer.packageSize
    ? `${offer.productDescription}`.replace(/\s+/g, ' ')
    : offer.productDescription;

  return {
    productId,
    productName,
    brand: offer.brand,
    description: offer.productDescription,
    supermarketName: offer.supermarketName,
    seller: offer.supermarketName,
    city: offer.city,
    price: offer.price,
    listPrice: offer.originalPrice,
    available: offer.status !== 'expired',
    validFrom: offer.offerStartDate,
    validUntil: offer.offerEndDate,
    sourceUrl: offer.sourceUrl,
    imageUrl: offer.imageUrl ?? offer.cropImagePath,
    categories: ['Supermercado', 'Ofertas'],
    rawText: offer.rawText,
    confidenceScore: offer.confidenceScore,
    status: offer.status
  };
}

export function dedupeOffers(offers: ParsedOffer[]) {
  const unique = new Map<string, ParsedOffer>();

  for (const offer of offers) {
    const key = offerHash(offer);
    const existing = unique.get(key);
    if (!existing || offer.confidenceScore > existing.confidenceScore) {
      unique.set(key, offer);
    }
  }

  return Array.from(unique.values());
}
