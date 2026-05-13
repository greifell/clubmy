import { validateOffersOutput } from '../src/services/offerValidationService.js';

const result = await validateOffersOutput();

if (!result.valid) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
