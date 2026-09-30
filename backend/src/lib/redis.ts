import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  // don't crash the app if redis hiccups, caching is an optimization not a dependency
  console.error('redis error', err.message);
});
