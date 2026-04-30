import { chromium } from 'playwright';
import type { NormalizedOfferInput } from '../types/offers.js';

type ScraperResult = {
  supermarket: string;
  offers: NormalizedOfferInput[];
  error?: unknown;
};

async function scrapeBistek(page: any): Promise<NormalizedOfferInput[]> {
  console.log('🔎 Buscando ofertas Bistek...');

  await page.goto('https://www.bistek.com.br/ofertas', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  const offers = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('article, .product-card, .card, [class*="product"]'));

    return cards.map((card: any) => {
      const text = card.innerText || '';

      const priceMatch = text.match(/R\$\s?(\d+[,.]\d{2})/);
      if (!priceMatch) return null;

      const img = card.querySelector('img')?.src || null;

      const lines = text
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

      const productName = lines.find((l: string) => !l.includes('R$') && l.length > 3);

      if (!productName) return null;

      return {
        productName,
        price: Number(priceMatch[1].replace('.', '').replace(',', '.')),
        imageUrl: img
      };
    }).filter(Boolean);
  });

  return offers.map((offer: any) => ({
    productName: offer.productName,
    category: 'SUPERMERCADO',
    price: offer.price,
    imageUrl: offer.imageUrl,
    supermarket: {
      name: 'Bistek',
      city: 'Criciúma',
      state: 'SC'
    },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    source: 'bistek-playwright'
  }));
}

async function scrapeKoch(page: any): Promise<NormalizedOfferInput[]> {
  console.log('🔎 Buscando ofertas Koch...');

  await page.goto('https://www.koch.com.br/ofertas', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  const offers = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('article, .product-card, .card, [class*="product"]'));

    return cards.map((card: any) => {
      const text = card.innerText || '';

      const priceMatch = text.match(/R\$\s?(\d+[,.]\d{2})/);
      if (!priceMatch) return null;

      const img = card.querySelector('img')?.src || null;

      const lines = text
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

      const productName = lines.find((l: string) => !l.includes('R$') && l.length > 3);

      if (!productName) return null;

      return {
        productName,
        price: Number(priceMatch[1].replace('.', '').replace(',', '.')),
        imageUrl: img
      };
    }).filter(Boolean);
  });

  return offers.map((offer: any) => ({
    productName: offer.productName,
    category: 'SUPERMERCADO',
    price: offer.price,
    imageUrl: offer.imageUrl,
    supermarket: {
      name: 'Koch',
      city: 'Criciúma',
      state: 'SC'
    },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    source: 'koch-playwright'
  }));
}

export async function scrapeSupermarketOffers(): Promise<NormalizedOfferInput[]> {
  const browser = await chromium.launch({
    headless: true
  });

  const results: ScraperResult[] = [];

  try {
    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    });

    const scrapers = [
      { name: 'Bistek', fn: scrapeBistek },
      { name: 'Koch', fn: scrapeKoch }
    ];

    for (const scraper of scrapers) {
      try {
        const offers = await scraper.fn(page);

        console.log(`✅ ${scraper.name}: ${offers.length} ofertas encontradas.`);

        results.push({
          supermarket: scraper.name,
          offers
        });
      } catch (error) {
        console.error(`❌ Erro no scraper ${scraper.name}:`, error);

        results.push({
          supermarket: scraper.name,
          offers: [],
          error
        });
      }
    }

    const allOffers = results.flatMap((result) => result.offers);

    console.log(`📦 Total geral: ${allOffers.length} ofertas encontradas.`);

    return allOffers;
  } finally {
    await browser.close();
  }
}
