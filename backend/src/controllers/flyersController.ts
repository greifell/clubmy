import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function getFlyers(req: Request, res: Response) {
  const flyers = await prisma.flyer.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  res.json(flyers);
}