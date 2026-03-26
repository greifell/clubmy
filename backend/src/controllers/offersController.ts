import type { Request, Response } from 'express';
import { z } from 'zod';

import { compareProduct, listOffers, listRegions, listSupermarkets } from '../services/offerService.js';
import { rankBestOffers } from '../services/rankingService.js';

const offerQuerySchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  supermarket: z.string().optional()
});

export async function getRegions(_req: Request, res: Response) {
  const data = await listRegions();
  res.json(data);
}

export async function getSupermarkets(req: Request, res: Response) {
  const city = typeof req.query.city === 'string' ? req.query.city : undefined;
  const data = await listSupermarkets(city);
  res.json(data);
}

export async function getOffers(req: Request, res: Response) {
  const parseResult = offerQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Parâmetros inválidos', details: parseResult.error.format() });
  }

  const offers = await listOffers(parseResult.data);
  const ranked = rankBestOffers(offers as never);
  return res.json({ offers: ranked, total: ranked.length });
}

export async function getCompare(req: Request, res: Response) {
  const product = typeof req.query.product === 'string' ? req.query.product : '';

  if (!product) {
    return res.status(400).json({ error: 'Informe o parâmetro product.' });
  }

  const offers = await compareProduct(product);
  const ranked = rankBestOffers(offers as never);

  return res.json({
    product,
    bestOffer: ranked[0] ?? null,
    offers: ranked
  });
}
