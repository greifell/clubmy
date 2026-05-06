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

async function scrapeBistek(page: any) {
  console.log('🔎 Buscando ofertas Bistek...');

  await page.goto('https://www.bistek.com.br/ofertas', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(4000);

  return extractOffers(page, 'Bistek', 'Criciúma');
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
        fn: scrapeBistek
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

    const allOffers = results
      .flatMap((result) => result.offers)
      .filter((offer) => offer.price > 0);

    console.log(`📦 TOTAL FINAL: ${allOffers.length} ofertas`);

    return allOffers;
  } finally {
    await browser.close();
  }
}