import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { inferCategory, normalizeName } from './normalizer.js';
import type { NormalizedOfferInput, OfferFilters } from '../types/offers.js';

const CACHE_TTL_SECONDS = 60 * 5;

const ANGELONI_COVERAGE_CITIES = [
  'Florianópolis',
  'Joinville',
  'Blumenau',
  'Balneário Camboriú',
  'Criciúma',
  'Itajaí',
  'São José',
  'Brusque',
  'Jaraguá do Sul',
  'Araranguá',
  'Lages',
  'Biguaçu',
  'Porto Belo',
  'Içara'
];

function normalizeCity(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isAngeloniCoverageCity(city?: string) {
  if (!city) return false;
  const normalizedCity = normalizeCity(city);
  return ANGELONI_COVERAGE_CITIES.some(
    (coverageCity) => normalizeCity(coverageCity) === normalizedCity
  );
}

function cacheKey(filters: OfferFilters) {
  return `offers:${JSON.stringify(filters)}`;
}

async function clearOffersCache() {
  if (redis?.isOpen) {
    const keys = await redis.keys('offers:*');

    if (keys.length > 0) {
      await redis.del(keys);
    }
  }
}

export async function listRegions() {
  const rows = await prisma.supermarket.findMany({
    distinct: ['state', 'city'],
    select: { state: true, city: true },
    orderBy: [{ state: 'asc' }, { city: 'asc' }]
  });

  const regions = rows.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.state]) acc[row.state] = [];
    acc[row.state].push(row.city);
    return acc;
  }, {});

  regions.SC = Array.from(
    new Set([...(regions.SC ?? []), ...ANGELONI_COVERAGE_CITIES])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return regions;
}

export async function listSupermarkets(city?: string) {
  const supermarkets = await prisma.supermarket.findMany({
    where: city
      ? isAngeloniCoverageCity(city)
        ? {
            OR: [{ city }, { name: 'Angeloni' }]
          }
        : { city }
      : undefined,
    orderBy: [{ state: 'asc' }, { city: 'asc' }, { name: 'asc' }]
  });

  const localizedSupermarkets = supermarkets.map((supermarket) =>
    city && supermarket.name === 'Angeloni'
      ? {
          ...supermarket,
          city
        }
      : supermarket
  );

  return Array.from(
    new Map(localizedSupermarkets.map((supermarket) => [supermarket.name, supermarket])).values()
  );
}

export async function listOffers(filters: OfferFilters) {
  const key = cacheKey(filters);

  if (redis?.isOpen) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  }

  const productWhere: Prisma.ProductWhereInput = {
    category: filters.category,
    normalized: filters.search
      ? {
          contains: normalizeName(filters.search)
        }
      : undefined
  };

  const supermarketWhere: Prisma.SupermarketWhereInput = {};

  if (filters.supermarket) {
    supermarketWhere.name = filters.supermarket;
  }

  const citySupermarketWhere: Prisma.SupermarketWhereInput | undefined = filters.city
    ? isAngeloniCoverageCity(filters.city)
      ? {
          OR: [{ city: filters.city }, { name: 'Angeloni' }],
          ...(filters.supermarket ? { name: filters.supermarket } : {})
        }
      : {
          city: filters.city,
          ...(filters.supermarket ? { name: filters.supermarket } : {})
        }
    : filters.supermarket
      ? supermarketWhere
      : undefined;

  const where: Prisma.OfferWhereInput = {
  expiresAt: {
    gte: new Date()
  },
  supermarket: citySupermarketWhere,
  product: productWhere
};

  const offers = await prisma.offer.findMany({
    where,
    include: {
      product: true,
      supermarket: true
    },
    orderBy: [{ price: 'asc' }, { createdAt: 'desc' }],
    take: 5000
  });

  const localizedOffers = offers.map((offer) =>
    filters.city && offer.supermarket.name === 'Angeloni'
      ? {
          ...offer,
          supermarket: {
            ...offer.supermarket,
            city: filters.city
          }
        }
      : offer
  );

  if (redis?.isOpen) {
    await redis.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(localizedOffers));
  }

  return localizedOffers;
}

export async function compareProduct(name: string) {
  const normalized = normalizeName(name);

  return prisma.offer.findMany({
    where: {
      product: {
        normalized: {
          contains: normalized
        }
      },
      expiresAt: {
        gte: new Date()
      }
    },
    include: {
      product: true,
      supermarket: true
    },
    orderBy: [{ price: 'asc' }, { createdAt: 'desc' }],
    take: 50
  });
}

export async function upsertOffers(inputs: NormalizedOfferInput[]) {
  for (const input of inputs) {
    const normalized = normalizeName(input.productName);
    const category = input.category ?? inferCategory(input.productName);

    const supermarket =
      (await prisma.supermarket.findFirst({
        where: {
          name: input.supermarket.name,
          city: input.supermarket.city,
          state: input.supermarket.state
        }
      })) ??
      (await prisma.supermarket.create({
        data: {
          name: input.supermarket.name,
          city: input.supermarket.city,
          state: input.supermarket.state
        }
      }));

    const existingProduct = await prisma.product.findFirst({
      where: {
      normalized
             }
    });

    const product = existingProduct
      ? await prisma.product.update({
        where: {
        id: existingProduct.id
        },
        data: {
        name: input.productName,
        category
        }
      })
      : await prisma.product.create({
      data: {
        name: input.productName,
        normalized,
        category
      }
    });

   const existingOffer = await prisma.offer.findFirst({
  where: {
    productId: product.id,
    supermarketId: supermarket.id,
    source: input.source
  }
});

if (existingOffer) {
  await prisma.offer.update({
    where: {
      id: existingOffer.id
    },
    data: {
      price: input.price,
      imageUrl: input.imageUrl,
      productUrl: input.productUrl,
      expiresAt: input.expiresAt,
      updatedAt: new Date()
    }
  });
} else {
  await prisma.offer.create({
    data: {
      productId: product.id,
      supermarketId: supermarket.id,
      price: input.price,
      imageUrl: input.imageUrl,
      productUrl: input.productUrl,
      source: input.source,
      expiresAt: input.expiresAt
    }
  });
}
  }

  await clearOffersCache();
}

export async function removeExpiredOffers() {
  await prisma.offer.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });

  await clearOffersCache();
}
