import { Redis } from 'ioredis';
import config from './config';

export class RedisClient {
  private static instance: Redis;

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      RedisClient.instance.on('connect', () => {
        console.log('Connected to Redis');
      });

      RedisClient.instance.on('error', (error) => {
        console.error('Redis connection error:', error);
      });
    }

    return RedisClient.instance;
  }

  public static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
    }
  }
}

export const redis = RedisClient.getInstance();
