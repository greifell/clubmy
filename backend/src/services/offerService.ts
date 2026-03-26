import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { inferCategory, normalizeName } from './normalizer.js';
import type { NormalizedOfferInput, OfferFilters } from '../types/offers.js';

const CACHE_TTL_SECONDS = 60 * 5;

function cacheKey(filters: OfferFilters) {
  return `offers:${JSON.stringify(filters)}`;
}

export async function listRegions() {
  const rows = await prisma.supermarket.findMany({
    distinct: ['state', 'city'],
    select: { state: true, city: true },
    orderBy: [{ state: 'asc' }, { city: 'asc' }]
  });

  return rows.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.state]) acc[row.state] = [];
    acc[row.state].push(row.city);
    return acc;
  }, {});
}

export async function listSupermarkets(city?: string) {
  return prisma.supermarket.findMany({
    where: city ? { city } : undefined,
    orderBy: [{ state: 'asc' }, { city: 'asc' }, { name: 'asc' }]
  });
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

  const where: Prisma.OfferWhereInput = {
    expiresAt: {
      gte: new Date()
    },
    supermarket: filters.city ? { city: filters.city } : undefined,
    product: productWhere
  };

  if (filters.supermarket) {
    where.supermarket = { ...where.supermarket, name: filters.supermarket };
  }

  const offers = await prisma.offer.findMany({
    where,
    include: {
      product: true,
      supermarket: true
    },
    orderBy: [{ price: 'asc' }, { createdAt: 'desc' }],
    take: 200
  });

  if (redis?.isOpen) {
    await redis.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(offers));
  }

  return offers;
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
      expiresAt: { gte: new Date() }
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

    const supermarket = await prisma.supermarket.upsert({
      where: {
        id: -1
      },
      update: {},
      create: {
        name: input.supermarket.name,
        city: input.supermarket.city,
        state: input.supermarket.state
      }
    }).catch(async () => {
      const existing = await prisma.supermarket.findFirst({
        where: {
          name: input.supermarket.name,
          city: input.supermarket.city,
          state: input.supermarket.state
        }
      });

      if (existing) return existing;

      return prisma.supermarket.create({
        data: {
          name: input.supermarket.name,
          city: input.supermarket.city,
          state: input.supermarket.state
        }
      });
    });

    const product = await prisma.product.upsert({
      where: { id: -1 },
      update: {},
      create: {
        name: input.productName,
        normalized,
        category
      }
    }).catch(async () => {
      const existing = await prisma.product.findFirst({ where: { normalized } });
      if (existing) {
        return prisma.product.update({
          where: { id: existing.id },
          data: { name: input.productName, category }
        });
      }

      return prisma.product.create({
        data: {
          name: input.productName,
          normalized,
          category
        }
      });
    });

    await prisma.offer.create({
      data: {
        productId: product.id,
        supermarketId: supermarket.id,
        price: input.price,
        imageUrl: input.imageUrl,
        source: input.source,
        expiresAt: input.expiresAt
      }
    });
  }
}

export async function removeExpiredOffers() {
  await prisma.offer.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
