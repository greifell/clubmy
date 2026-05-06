import { Router } from 'express';

import {
  getCategories,
  getCompare,
  getOffers,
  getRegions,
  getSupermarkets
} from '../controllers/offersController.js';

export const apiRouter = Router();

apiRouter.get('/regions', getRegions);
apiRouter.get('/supermarkets', getSupermarkets);
apiRouter.get('/categories', getCategories);
apiRouter.get('/offers', getOffers);
apiRouter.get('/compare', getCompare);