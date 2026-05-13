import { collectSupermarketOffers } from '../src/jobs/collectSupermarketOffers.js';

const result = await collectSupermarketOffers();

console.log(
  JSON.stringify(
    {
      ok: true,
      ...result
    },
    null,
    2
  )
);
