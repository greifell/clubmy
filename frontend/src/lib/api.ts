import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
});

export type Offer = {
  id: number;
  price: string;
  imageUrl?: string;
  productUrl?: string;
  createdAt: string;
  expiresAt?: string;
  product: {
    name: string;
    category: string;
  };
  supermarket: {
    name: string;
    city: string;
    state: string;
  };
};

export type VtexOffersFile = {
  generatedAt: string;
  total: number;
  items: VtexOffer[];
};

export type VtexOffer = {
  productId: string;
  productName: string;
  brand: string | null;
  description: string;
  supermarketName: string;
  seller: string;
  city: string | null;
  price: number;
  listPrice: number | null;
  available: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  categories: string[];
  rawText: string;
  confidenceScore: number;
  status: 'active' | 'expired' | 'active_uncertain';
};

export type OfferFilters = {
  city?: string;
  category?: string;
  supermarket?: string;
  search?: string;
};

export type StaticOfferFeed = {
  generatedAt: string | null;
  offers: Offer[];
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferCategory(item: VtexOffer) {
  return item.categories.at(-1) ?? 'Ofertas';
}

function vtexToOffer(item: VtexOffer, index: number): Offer {
  return {
    id: Number.parseInt(item.productId.slice(0, 12), 16) || index + 1,
    price: String(item.price),
    imageUrl: item.imageUrl ?? undefined,
    productUrl: item.sourceUrl,
    createdAt: item.validFrom ?? new Date().toISOString(),
    expiresAt: item.validUntil ?? undefined,
    product: {
      name: item.productName || item.description,
      category: inferCategory(item)
    },
    supermarket: {
      name: item.supermarketName,
      city: item.city ?? 'Santa Catarina',
      state: 'SC'
    }
  };
}

function applyStaticFilters(offers: Offer[], filters: OfferFilters) {
  const search = normalizeText(filters.search ?? '');

  return offers.filter((offer) => {
    if (filters.city && offer.supermarket.city !== filters.city) return false;
    if (filters.supermarket && offer.supermarket.name !== filters.supermarket) return false;
    if (filters.category && offer.product.category !== filters.category) return false;
    if (search && !normalizeText(offer.product.name).includes(search)) return false;
    return true;
  });
}

export async function fetchStaticOfferFeed(filters: OfferFilters = {}): Promise<StaticOfferFeed> {
  const response = await fetch('/data/offers-vtex.json', {
    cache: 'no-store'
  });

  if (!response.ok) {
    return {
      generatedAt: null,
      offers: []
    };
  }

  const data = (await response.json()) as VtexOffersFile;
  const offers = (data.items ?? [])
    .filter((item) => item.available && item.status !== 'expired')
    .map(vtexToOffer);

  return {
    generatedAt: data.generatedAt ?? null,
    offers: applyStaticFilters(offers, filters)
  };
}

export async function fetchOffers(filters: OfferFilters = {}) {
  try {
    const response = await api.get('/offers', {
      params: {
        city: filters.city || undefined,
        supermarket: filters.supermarket || undefined,
        category: filters.category || undefined,
        search: filters.search || undefined
      }
    });

    const apiOffers = response.data.offers ?? [];

    if (apiOffers.length > 0) {
      return {
        source: 'api' as const,
        generatedAt: null,
        offers: apiOffers as Offer[]
      };
    }
  } catch {
    // The static JSON is the public fallback for deploys without the backend API.
  }

  const staticFeed = await fetchStaticOfferFeed(filters);

  return {
    source: 'static' as const,
    generatedAt: staticFeed.generatedAt,
    offers: staticFeed.offers
  };
}

export async function fetchStaticRegions() {
  const { offers } = await fetchStaticOfferFeed();
  const regions = new Map<string, { city: string; state: string }>();

  for (const offer of offers) {
    regions.set(`${offer.supermarket.city}-${offer.supermarket.state}`, {
      city: offer.supermarket.city,
      state: offer.supermarket.state
    });
  }

  return Array.from(regions.values());
}

export async function fetchStaticSupermarkets(city?: string) {
  const { offers } = await fetchStaticOfferFeed({ city });
  const markets = new Map<string, { id: number; name: string; city: string; state: string }>();

  for (const offer of offers) {
    markets.set(`${offer.supermarket.name}-${offer.supermarket.city}`, {
      id: markets.size + 1,
      name: offer.supermarket.name,
      city: offer.supermarket.city,
      state: offer.supermarket.state
    });
  }

  return Array.from(markets.values());
}

export async function fetchStaticCategories() {
  const { offers } = await fetchStaticOfferFeed();
  return Array.from(new Set(offers.map((offer) => offer.product.category))).sort();
}
