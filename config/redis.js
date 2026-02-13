import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Connection Error', err));
redisClient.on('connect', () => console.log('Successfully connected to Redis'));

await redisClient.connect();

export default redisClient;