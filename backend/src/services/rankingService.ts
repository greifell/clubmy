import type { Offer } from '@prisma/client';

export function rankBestOffers<T extends Offer>(offers: T[]) {
  return [...offers].sort((a, b) => Number(a.price) - Number(b.price));
}
