import { collectSupermarketOffers } from '../src/jobs/collectSupermarketOffers.js';

const result = await collectSupermarketOffers({
  includeRemote: false
});

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'manual-folders',
      folders: ['input_catalogs', 'oferta'],
      ...result
    },
    null,
    2
  )
);
