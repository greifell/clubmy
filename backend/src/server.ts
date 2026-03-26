import { app } from './app.js';
import { env } from './config/env.js';
import { connectRedis } from './lib/redis.js';
import { startDailyOfferUpdater } from './services/schedulerService.js';

async function bootstrap() {
  try {
    await connectRedis();
  } catch (error) {
    console.warn('Redis indisponível, seguindo sem cache.', error);
  }

  startDailyOfferUpdater();

  app.listen(env.port, () => {
    console.log(`API ClubMy disponível em http://localhost:${env.port}`);
  });
}

bootstrap();
