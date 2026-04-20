import cron from 'node-cron';

import { removeExpiredOffers, upsertOffers } from './offerService.js';
import { scrapeSupermarketOffers } from './scraperService.js';

export function startDailyOfferUpdater() {
  cron.schedule('0 3 * * *', async () => {
    const scraped = await scrapeSupermarketOffers();
    await upsertOffers(scraped);
    await removeExpiredOffers();
    console.log('[cron] Atualização diária concluída');
  });
}
