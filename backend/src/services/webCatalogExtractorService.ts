import axios from 'axios';
import * as cheerio from 'cheerio';

import type { CatalogSource, ExtractedCatalogText } from '../types/catalogOffers.js';
import { logOfferCollector } from './offerLoggerService.js';

const REQUEST_HEADERS = {
  'user-agent': 'ClubMyOffersBot/1.0 (+https://www.clubmy.com.br; webpage extraction)',
  accept: 'text/html,*/*;q=0.8'
};

export async function extractWebCatalogText(source: CatalogSource): Promise<ExtractedCatalogText> {
  try {
    const response = await axios.get<string>(source.sourceUrl, {
      headers: REQUEST_HEADERS,
      timeout: 30000,
      responseType: 'text',
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const $ = cheerio.load(response.data);
    $('script, style, noscript, svg').remove();

    const text = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    const images = $('img')
      .map((_, element) => $(element).attr('src') ?? $(element).attr('data-src'))
      .get()
      .filter(Boolean)
      .slice(0, 30);

    return {
      source,
      text,
      pageImages: images,
      confidenceScore: text.length > 80 ? 0.6 : 0.2
    };
  } catch (error) {
    await logOfferCollector('webpage extraction failed', {
      sourceUrl: source.sourceUrl,
      error: error instanceof Error ? error.message : error
    });

    return {
      source,
      text: '',
      confidenceScore: 0
    };
  }
}
