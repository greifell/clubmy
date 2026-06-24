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

export type Region = {
  city: string;
  state: string;
};

export type SupermarketOption = {
  id: number;
  name: string;
  city: string;
  state: string;
};

const ANGELONI_COVERAGE_CITIES = new Set(
  [
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
  ].map(normalizeText)
);

function isAngeloniAvailableInCity(city: string) {
  return ANGELONI_COVERAGE_CITIES.has(normalizeText(city));
}

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
    if (
      filters.city &&
      offer.supermarket.city !== filters.city &&
      !(
        offer.supermarket.name === 'Angeloni' &&
        isAngeloniAvailableInCity(filters.city)
      )
    ) {
      return false;
    }
    if (filters.supermarket && offer.supermarket.name !== filters.supermarket) return false;
    if (filters.category && offer.product.category !== filters.category) return false;
    if (search && !normalizeText(offer.product.name).includes(search)) return false;
    return true;
  });
}

function offerKey(offer: Offer) {
  return [
    offer.supermarket.name,
    offer.supermarket.city,
    normalizeText(offer.product.name),
    Number(offer.price).toFixed(2)
  ].join('|');
}

function mergeOffers(apiOffers: Offer[], staticOffers: Offer[]) {
  const apiKeys = new Set<string>();
  const merged = [...apiOffers];

  for (const offer of apiOffers) {
    apiKeys.add(offerKey(offer));
  }

  for (const offer of staticOffers) {
    if (!apiKeys.has(offerKey(offer))) {
      merged.push(offer);
    }
  }

  return merged;
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

  const filteredOffers = applyStaticFilters(offers, filters).map((offer) =>
    filters.city &&
    offer.supermarket.name === 'Angeloni' &&
    isAngeloniAvailableInCity(filters.city)
      ? {
          ...offer,
          supermarket: {
            ...offer.supermarket,
            city: filters.city
          }
        }
      : offer
  );

  return {
    generatedAt: data.generatedAt ?? null,
    offers: filteredOffers
  };
}

export async function fetchOffers(filters: OfferFilters = {}) {
  const staticFeed = await fetchStaticOfferFeed(filters);

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
    const offers = mergeOffers(apiOffers as Offer[], staticFeed.offers);

    return {
      source: staticFeed.offers.length > 0 ? ('mixed' as const) : ('api' as const),
      generatedAt: staticFeed.generatedAt,
      offers
    };
  } catch {
    // The static JSON is the public fallback for deploys without the backend API.
  }

  return {
    source: 'static' as const,
    generatedAt: staticFeed.generatedAt,
    offers: staticFeed.offers
  };
}

export async function fetchStaticRegions(): Promise<Region[]> {
  const { offers } = await fetchStaticOfferFeed();
  const regions = new Map<string, Region>();

  for (const offer of offers) {
    regions.set(`${offer.supermarket.city}-${offer.supermarket.state}`, {
      city: offer.supermarket.city,
      state: offer.supermarket.state
    });
  }

  return Array.from(regions.values());
}

export async function fetchStaticSupermarkets(city?: string): Promise<SupermarketOption[]> {
  const { offers } = await fetchStaticOfferFeed({ city });
  const markets = new Map<string, SupermarketOption>();

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

export async function fetchRegions(): Promise<Region[]> {
  const staticRegions = await fetchStaticRegions();

  try {
    const response = await api.get('/regions');
    const data = response.data;
    const apiRegions: Region[] = Array.isArray(data)
      ? data
      : Object.entries(data ?? {}).flatMap(([state, cities]) =>
          Array.isArray(cities)
            ? cities.map((city) => ({
                city: String(city),
                state: String(state)
              }))
            : []
        );

    return mergeByKey([...apiRegions, ...staticRegions], (region) => `${region.city}-${region.state}`);
  } catch {
    return staticRegions;
  }
}

export async function fetchSupermarkets(city?: string): Promise<SupermarketOption[]> {
  const staticMarkets = await fetchStaticSupermarkets(city);

  try {
    const response = await api.get('/supermarkets', {
      params: {
        city: city || undefined
      }
    });
    const apiMarkets = (response.data ?? []) as SupermarketOption[];
    const merged = mergeByKey([...apiMarkets, ...staticMarkets], (market) => `${market.name}-${market.city}`);

    return merged.map((market, index) => ({
      ...market,
      id: market.id ?? index + 1
    }));
  } catch {
    return staticMarkets;
  }
}

export async function fetchCategories() {
  const staticCategories = await fetchStaticCategories();

  try {
    const response = await api.get('/categories');
    return Array.from(new Set([...(response.data ?? []), ...staticCategories])).sort();
  } catch {
    return staticCategories;
  }
}

function mergeByKey<T>(items: T[], getKey: (item: T) => string) {
  const merged = new Map<string, T>();

  for (const item of items) {
    merged.set(getKey(item), item);
  }

  return Array.from(merged.values());
}
