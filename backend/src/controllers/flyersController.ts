import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function getFlyers(req: Request, res: Response) {
  const city =
    typeof req.query.city === 'string' && req.query.city.trim()
      ? req.query.city.trim()
      : undefined;

  const flyers = await prisma.flyer.findMany({
    where: {
      isActive: true,
      ...(city
        ? {
            city: {
              equals: city,
              mode: 'insensitive'
            }
          }
        : {})
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  res.json(flyers);
}