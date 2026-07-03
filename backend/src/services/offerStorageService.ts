import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ParsedOffer, VtexOffer, VtexOffersFile } from '../types/catalogOffers.js';
import { dedupeOffers, offerHash, sanitizeProductDescription, toVtexOffer } from './offerParserService.js';
import { logOfferCollector } from './offerLoggerService.js';

const rootDir = process.cwd().endsWith('backend')
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

const dataDir = path.join(rootDir, 'public', 'data');
const frontendDataDir = path.join(rootDir, 'frontend', 'public', 'data');
const archiveDir = path.join(rootDir, 'archive');
const offersPath = path.join(dataDir, 'offers-vtex.json');
const frontendOffersPath = path.join(frontendDataDir, 'offers-vtex.json');
const expiredPath = path.join(archiveDir, 'expired-offers.json');

async function readExistingOffers(): Promise<VtexOffer[]> {
  try {
    const file = await readFile(offersPath, 'utf8');
    const parsed = JSON.parse(file) as VtexOffersFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function readExpiredOffers(): Promise<VtexOffer[]> {
  try {
    const file = await readFile(expiredPath, 'utf8');
    const parsed = JSON.parse(file) as VtexOffersFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function isExpired(offer: VtexOffer) {
  if (!offer.validUntil) return false;
  return new Date(`${offer.validUntil}T23:59:59`) < new Date();
}

function sanitizeVtexOffer(offer: VtexOffer) {
  const productName = sanitizeProductDescription(offer.productName);
  const description = sanitizeProductDescription(offer.description);
  const resolvedName = productName || description;

  if (!resolvedName) return null;

  return {
    ...offer,
    productName: resolvedName,
    description: description || resolvedName
  };
}

function keyFromVtex(offer: VtexOffer) {
  return offer.productId || offerHash({
    supermarketName: offer.supermarketName,
    city: offer.city,
    productDescription: offer.description,
    price: offer.price,
    offerEndDate: offer.validUntil
  });
}

function sortOffers(offers: VtexOffer[]) {
  return [...offers].sort((a, b) => {
    const market = a.supermarketName.localeCompare(b.supermarketName, 'pt-BR');
    if (market !== 0) return market;
    return a.productName.localeCompare(b.productName, 'pt-BR');
  });
}

function saoPauloTimestamp(date = new Date()) {
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

export async function saveOffersFile(newParsedOffers: ParsedOffer[]) {
  await mkdir(dataDir, { recursive: true });
  await mkdir(frontendDataDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });

  const existingOffers = (await readExistingOffers())
    .map(sanitizeVtexOffer)
    .filter((offer): offer is VtexOffer => Boolean(offer));
  const newOffers = dedupeOffers(newParsedOffers)
    .map(toVtexOffer)
    .map(sanitizeVtexOffer)
    .filter((offer): offer is VtexOffer => Boolean(offer));
  const hasManualInput = newOffers.some((offer) => offer.sourceUrl.startsWith('manual://'));
  const merged = new Map<string, VtexOffer>();

  for (const offer of existingOffers) {
    if (hasManualInput && offer.sourceUrl.startsWith('manual://')) continue;
    merged.set(keyFromVtex(offer), offer);
  }

  for (const offer of newOffers) {
    merged.set(keyFromVtex(offer), offer);
  }

  const allOffers = Array.from(merged.values());
  const activeOffers = sortOffers(allOffers.filter((offer) => !isExpired(offer) && offer.status !== 'expired'));
  const expiredOffers = sortOffers(allOffers.filter((offer) => isExpired(offer) || offer.status === 'expired'));

  const output: VtexOffersFile = {
    generatedAt: saoPauloTimestamp(),
    total: activeOffers.length,
    items: activeOffers
  };

  const expiredOutput: VtexOffersFile = {
    generatedAt: saoPauloTimestamp(),
    total: expiredOffers.length,
    items: sortOffers([...(await readExpiredOffers()), ...expiredOffers])
  };

  const tempPath = `${offersPath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await rename(tempPath, offersPath);
  await writeFile(frontendOffersPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  if (expiredOutput.items.length > 0) {
    await writeFile(expiredPath, `${JSON.stringify(expiredOutput, null, 2)}\n`, 'utf8');
  }

  await logOfferCollector('offers file saved', {
    path: offersPath,
    frontendPath: frontendOffersPath,
    active: output.total,
    expired: expiredOutput.total
  });

  return output;
}
