import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl ? createClient({ url: redisUrl }) : null;

export async function connectRedis() {
  if (!redis) return;
  if (!redis.isOpen) {
    await redis.connect();
  }
}
