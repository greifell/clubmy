import { removeExpiredOffers, upsertOffers } from '../src/services/offerService.js';
import { scrapeSupermarketOffers } from '../src/services/scraperService.js';

async function run() {
  const offers = await scrapeSupermarketOffers();
  await upsertOffers(offers);
  await removeExpiredOffers();
  console.log('Atualização diária executada manualmente.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
