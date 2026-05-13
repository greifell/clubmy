import { chromium } from 'playwright';
import type { NormalizedOfferInput } from '../types/offers.js';

type ScraperResult = {
  supermarket: string;
  offers: NormalizedOfferInput[];
  error?: unknown;
};

function normalizePrice(value: string): number {
  return Number(
    value
      .replace(/[^\d,]/g, '')
      .replace('.', '')
      .replace(',', '.')
  );
}

function detectCategory(name: string): string {
  const text = name.toLowerCase();

  if (
    text.includes('arroz') ||
    text.includes('feijão') ||
    text.includes('macarrão') ||
    text.includes('óleo')
  ) {
    return 'ALIMENTOS';
  }

  if (
    text.includes('detergente') ||
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

async function extractOffers(
  page: any,
  supermarketName: string,
  city: string
): Promise<NormalizedOfferInput[]> {
  const offers = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll(
        'article, .product-card, .card, [class*="product"]'
      )
    );

    return cards
      .map((card: any) => {
        const text = card.innerText || '';

        const priceMatch = text.match(/R\$\s?(\d+[,.]\d{2})/);

        if (!priceMatch) return null;

        const lines = text
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean);

        const productName = lines.find(
          (line: string) =>
            !line.includes('R$') &&
            line.length > 3 &&
            line.length < 120
        );

        if (!productName) return null;

        const imageUrl =
          card.querySelector('img')?.src ||
          card.querySelector('img')?.getAttribute('data-src') ||
          null;

        return {
          productName,
          price: priceMatch[1],
          imageUrl
        };
      })
      .filter(Boolean);
  });

  return offers.map((offer: any) => ({
    productName: offer.productName,
    category: detectCategory(offer.productName),
    price: normalizePrice(offer.price),
    imageUrl: offer.imageUrl,
    supermarket: {
      name: supermarketName,
      city,
      state: 'SC'
    },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    source: `${supermarketName.toLowerCase()}-playwright`
  }));
}

async function scrapeBistekApi(): Promise<NormalizedOfferInput[]> {
  console.log('🔎 Buscando ofertas Bistek via API VTEX...');

  const searchTerms = [
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

  const allOffers: NormalizedOfferInput[] = [];

  for (const term of searchTerms) {
    try {
      console.log(`🔍 Termo: ${term}`);

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
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            source: 'bistek-vtex-api'
          };
        })
        .filter(Boolean);

      allOffers.push(...offers);

      console.log(`✅ ${offers.length} produtos encontrados para ${term}`);

    } catch (error) {
      console.error(`❌ Erro no termo ${term}`, error);
    }
  }

  const uniqueMap = new Map<string, NormalizedOfferInput>();

  for (const offer of allOffers) {
    const key = `${offer.productName}-${offer.price}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, offer);
    }
  }

  return Array.from(uniqueMap.values());
}

async function scrapeKoch(page: any) {
  console.log('🔎 Buscando ofertas Koch...');

  await page.goto('https://www.koch.com.br/ofertas', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(4000);

  return extractOffers(page, 'Koch', 'Criciúma');
}

async function scrapeVtexMarket(config: {
  name: string;
  city: string;
  state: string;
  baseUrl: string;
  source: string;
}): Promise<NormalizedOfferInput[]> {
  console.log(`🔎 Buscando ofertas ${config.name} via API VTEX...`);

  const searchTerms = [
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

  const allOffers: NormalizedOfferInput[] = [];

  for (const term of searchTerms) {
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
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            source: config.source
          };
        })
        .filter(Boolean);

      allOffers.push(...offers);
    } catch (error) {
      console.error(`❌ ${config.name} erro no termo ${term}`, error);
    }
  }

  const uniqueMap = new Map<string, NormalizedOfferInput>();

  for (const offer of allOffers) {
    const key = `${offer.supermarket.name}-${offer.productName}-${offer.price}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, offer);
    }
  }

  return Array.from(uniqueMap.values());
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
  const browser = await chromium.launch({
    headless: true
  });

  const results: ScraperResult[] = [];

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 900
      },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    });

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
       fn: scrapeKoch
      }
      ];

    for (const scraper of scrapers) {
      try {
        console.log(`🚀 Iniciando scraper ${scraper.name}`);

        const offers = await scraper.fn(page);

        console.log(
          `✅ ${scraper.name}: ${offers.length} ofertas encontradas`
        );
        offers.forEach((offer, index) => {
        console.log(
          `${index + 1}. ${offer.productName} | R$ ${offer.price} | ${offer.imageUrl}`
        );
        });

        results.push({
          supermarket: scraper.name,
          offers
        });
      } catch (error) {
        console.error(`❌ Falha no scraper ${scraper.name}`, error);

        results.push({
          supermarket: scraper.name,
          offers: [],
          error
        });
      }
    }

    const uniqueOffers = new Map<string, NormalizedOfferInput>();

    for (const offer of results.flatMap((result) => result.offers)) {
        if (offer.price <= 0) continue;

        const key = `${offer.supermarket.name}-${offer.productName}-${offer.price}`;

        if (!uniqueOffers.has(key)) {
            uniqueOffers.set(key, offer);
        }
    }

const allOffers = Array.from(uniqueOffers.values());

    console.log(`📦 TOTAL FINAL: ${allOffers.length} ofertas`);

    return allOffers;
  } finally {
    await browser.close();
  }
}