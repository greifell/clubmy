import type { NormalizedOfferInput } from '../types/offers.js';

type ScraperResult = {
  supermarket: string;
  offers: NormalizedOfferInput[];
  error?: unknown;
};

type KochStore = {
  id: string;
  alias?: string | null;
  name?: string | null;
  slug?: string | null;
  salesEnabled?: boolean;
  fullAddress?: {
    city?: string | null;
    state?: string | null;
  } | null;
};

type KochSearchHit = {
  id: string;
  name: string;
  brandName?: string | null;
  image?: string | null;
  slug?: string | null;
  categories?: string[];
  pricing?: {
    price?: number | null;
    promotion?: boolean | null;
    promotionalPrice?: number | null;
  } | null;
  quantity?: {
    inStock?: number | null;
  } | null;
};

const SEARCH_TERMS = [
  'arroz',
  'feijao',
  'leite',
  'cafe',
  'detergente',
  'sabao',
  'amaciante',
  'papel',
  'cerveja',
  'refrigerante',
  'frango',
  'carne'
];

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const KOCH_GRAPHQL_URL = 'https://api.superkoch.com.br:443/storefront/graphql';
const KOCH_SEARCH_BASE_URL = 'https://sense.osuper.com.br/295';
const KOCH_SITE_URL = 'https://www.superkoch.com.br';
const KOCH_FALLBACK_STORES: KochStore[] = [
  {
    id: '1415',
    name: 'Koch Camboriu',
    fullAddress: {
      city: 'Camboriu',
      state: 'SC'
    }
  }
];

const browserHeaders = {
  accept: 'application/json',
  origin: KOCH_SITE_URL,
  referer: `${KOCH_SITE_URL}/`,
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
};

function detectCategory(name: string): NormalizedOfferInput['category'] {
  const text = name.toLowerCase();

  if (
    text.includes('arroz') ||
    text.includes('feijao') ||
    text.includes('feijão') ||
    text.includes('macarrao') ||
    text.includes('macarrão') ||
    text.includes('oleo') ||
    text.includes('óleo')
  ) {
    return 'ALIMENTOS';
  }

  if (
    text.includes('detergente') ||
    text.includes('sabao') ||
    text.includes('sabão') ||
    text.includes('amaciante')
  ) {
    return 'LIMPEZA';
  }

  if (
    text.includes('shampoo') ||
    text.includes('condicionador') ||
    text.includes('sabonete')
  ) {
    return 'HIGIENE';
  }

  if (
    text.includes('refrigerante') ||
    text.includes('suco') ||
    text.includes('cerveja')
  ) {
    return 'BEBIDAS';
  }

  return 'OUTROS';
}

function offerExpiresAt() {
  return new Date(Date.now() + ONE_DAY_MS);
}

function offerDedupeKey(offer: NormalizedOfferInput) {
  return [
    offer.supermarket.name,
    offer.supermarket.city,
    offer.productName,
    offer.price.toFixed(2)
  ].join('|');
}

function dedupeOffers(offers: NormalizedOfferInput[]) {
  const uniqueMap = new Map<string, NormalizedOfferInput>();

  for (const offer of offers) {
    if (offer.price <= 0) continue;

    const key = offerDedupeKey(offer);

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, offer);
    }
  }

  return Array.from(uniqueMap.values());
}

async function scrapeBistekApi(): Promise<NormalizedOfferInput[]> {
  console.log('Buscando ofertas Bistek via API VTEX...');

  const allOffers: NormalizedOfferInput[] = [];

  for (const term of SEARCH_TERMS) {
    try {
      const response = await fetch(
        `https://www.bistek.com.br/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=20`
      );

      const products = await response.json();
      const offers = products
        .map((product: any) => {
          const item = product.items?.[0];
          const seller = item?.sellers?.[0];
          const commercial = seller?.commertialOffer;

          if (!commercial?.Price || commercial.Price <= 0) {
            return null;
          }

          return {
            productName: product.productName,
            category: detectCategory(product.productName),
            price: commercial.Price,
            imageUrl: item?.images?.[0]?.imageUrl || null,
            productUrl: product.link || null,
            supermarket: {
              name: 'Bistek',
              city: 'Criciúma',
              state: 'SC'
            },
            expiresAt: offerExpiresAt(),
            source: 'bistek-vtex-api'
          };
        })
        .filter(Boolean) as NormalizedOfferInput[];

      allOffers.push(...offers);
    } catch (error) {
      console.error(`Bistek erro no termo ${term}`, error);
    }
  }

  return dedupeOffers(allOffers);
}

async function scrapeVtexMarket(config: {
  name: string;
  city: string;
  state: string;
  baseUrl: string;
  source: string;
}): Promise<NormalizedOfferInput[]> {
  console.log(`Buscando ofertas ${config.name} via API VTEX...`);

  const allOffers: NormalizedOfferInput[] = [];

  for (const term of SEARCH_TERMS) {
    try {
      const response = await fetch(
        `${config.baseUrl}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=20`
      );

      const products = await response.json();
      const offers = products
        .map((product: any) => {
          const item = product.items?.[0];
          const seller = item?.sellers?.[0];
          const commercial = seller?.commertialOffer;

          if (!commercial?.Price || commercial.Price <= 0) return null;

          return {
            productName: product.productName,
            category: detectCategory(product.productName),
            price: commercial.Price,
            imageUrl: item?.images?.[0]?.imageUrl || null,
            productUrl: product.link || null,
            supermarket: {
              name: config.name,
              city: config.city,
              state: config.state
            },
            expiresAt: offerExpiresAt(),
            source: config.source
          };
        })
        .filter(Boolean) as NormalizedOfferInput[];

      allOffers.push(...offers);
    } catch (error) {
      console.error(`${config.name} erro no termo ${term}`, error);
    }
  }

  return dedupeOffers(allOffers);
}

async function fetchKochStores(): Promise<KochStore[]> {
  const query = `
    query KochStores {
      publicViewer {
        id
        stores {
          id
          alias
          name
          slug
          salesEnabled
          fullAddress {
            city
            state
          }
        }
      }
    }
  `;

  const response = await fetch(KOCH_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      ...browserHeaders,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    throw new Error(`Koch stores request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      publicViewer?: {
        stores?: KochStore[];
      };
    };
  };

  return (payload.data?.publicViewer?.stores ?? []).filter(
    (store) =>
      store.salesEnabled !== false &&
      store.fullAddress?.state === 'SC' &&
      Boolean(store.fullAddress.city)
  );
}

function uniqueKochStoresByCity(stores: KochStore[]) {
  const byCity = new Map<string, KochStore>();

  for (const store of stores) {
    const city = store.fullAddress?.city?.trim();

    if (city && !byCity.has(city)) {
      byCity.set(city, store);
    }
  }

  return Array.from(byCity.values());
}

function kochHitToOffer(hit: KochSearchHit, city: string, storeId: string): NormalizedOfferInput | null {
  const regularPrice = hit.pricing?.price ?? null;
  const promotionalPrice = hit.pricing?.promotionalPrice ?? null;
  const hasPromotion =
    hit.pricing?.promotion === true &&
    typeof promotionalPrice === 'number' &&
    promotionalPrice > 0 &&
    (typeof regularPrice !== 'number' || promotionalPrice < regularPrice);

  if (!hasPromotion || hit.quantity?.inStock === 0) {
    return null;
  }

  return {
    productName: hit.name,
    category: detectCategory(hit.name),
    price: promotionalPrice,
    imageUrl: hit.image ?? undefined,
    productUrl: hit.slug ? `${KOCH_SITE_URL}/produtos/${hit.id}/${hit.slug}` : KOCH_SITE_URL,
    supermarket: {
      name: 'Koch',
      city,
      state: 'SC'
    },
    expiresAt: offerExpiresAt(),
    source: `koch-osuper-${storeId}`
  };
}

async function fetchKochPromotionsForStore(store: KochStore, city: string): Promise<NormalizedOfferInput[]> {
  const allOffers: NormalizedOfferInput[] = [];

  for (const term of SEARCH_TERMS) {
    try {
      const params = new URLSearchParams({
        search: term,
        size: '20',
        from: '0',
        promotion: 'true',
        sortField: 'sales_count',
        sortOrder: 'desc'
      });
      const response = await fetch(`${KOCH_SEARCH_BASE_URL}/${store.id}/search?${params.toString()}`, {
        headers: browserHeaders
      });

      if (!response.ok) {
        throw new Error(`Koch search request failed: ${response.status}`);
      }

      const payload = (await response.json()) as {
        hits?: KochSearchHit[];
      };
      const offers = (payload.hits ?? [])
        .map((hit) => kochHitToOffer(hit, city, store.id))
        .filter(Boolean) as NormalizedOfferInput[];

      allOffers.push(...offers);
    } catch (error) {
      console.error(`Koch erro no termo ${term} para ${city}`, error);
    }
  }

  return allOffers;
}

async function scrapeKochApi(): Promise<NormalizedOfferInput[]> {
  console.log('Buscando ofertas Koch via API Osuper...');

  let stores: KochStore[] = [];

  try {
    stores = uniqueKochStoresByCity(await fetchKochStores());
  } catch (error) {
    console.warn('Koch: falha ao buscar lojas via GraphQL; usando loja padrão.', error);
  }

  if (stores.length === 0) {
    stores = KOCH_FALLBACK_STORES;
  }
  const defaultStore = stores.find((store) => store.fullAddress?.city === 'Camboriú') ?? stores[0];

  if (!defaultStore) {
    return [];
  }

  const allOffers: NormalizedOfferInput[] = [];
  allOffers.push(...(await fetchKochPromotionsForStore(defaultStore, 'Santa Catarina')));

  for (const store of stores) {
    const city = store.fullAddress?.city?.trim();

    if (!city) continue;

    allOffers.push(...(await fetchKochPromotionsForStore(store, city)));
  }

  console.log(`Koch: ${stores.length} municipios com loja mapeados`);

  return dedupeOffers(allOffers);
}

async function scrapeAngeloniApi(): Promise<NormalizedOfferInput[]> {
  return scrapeVtexMarket({
    name: 'Angeloni',
    city: 'Criciúma',
    state: 'SC',
    baseUrl: 'https://www.angeloni.com.br/super',
    source: 'angeloni-vtex-api'
  });
}

async function scrapeGiassiApi(): Promise<NormalizedOfferInput[]> {
  return scrapeVtexMarket({
    name: 'Giassi',
    city: 'Criciúma',
    state: 'SC',
    baseUrl: 'https://www.giassi.com.br',
    source: 'giassi-vtex-api'
  });
}

export async function scrapeSupermarketOffers(): Promise<NormalizedOfferInput[]> {
  const results: ScraperResult[] = [];
  const scrapers = [
    {
      name: 'Bistek',
      fn: scrapeBistekApi
    },
    {
      name: 'Angeloni',
      fn: scrapeAngeloniApi
    },
    {
      name: 'Giassi',
      fn: scrapeGiassiApi
    },
    {
      name: 'Koch',
      fn: scrapeKochApi
    }
  ];

  for (const scraper of scrapers) {
    try {
      console.log(`Iniciando scraper ${scraper.name}`);

      const offers = await scraper.fn();

      console.log(`${scraper.name}: ${offers.length} ofertas encontradas`);

      results.push({
        supermarket: scraper.name,
        offers
      });
    } catch (error) {
      console.error(`Falha no scraper ${scraper.name}`, error);

      results.push({
        supermarket: scraper.name,
        offers: [],
        error
      });
    }
  }

  const allOffers = dedupeOffers(results.flatMap((result) => result.offers));

  console.log(`TOTAL FINAL: ${allOffers.length} ofertas`);

  return allOffers;
}
