import Redis from 'ioredis';

const getRedisUrl = (): string => {
  return process.env.REDIS_URL || 'redis://localhost:6379';
};

// Singleton Redis client for caching
let redisClient: Redis | null = null;

export const getRedis = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
  }
  return redisClient;
};

// Create a new connection for BullMQ (it needs its own connection)
export const createBullConnection = (): Redis => {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    const redis = getRedis();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  async del(key: string): Promise<void> {
    const redis = getRedis();
    await redis.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

// Rate limiter using token bucket
export class RateLimiter {
  private redis: Redis;
  private key: string;
  private maxTokens: number;
  private refillRate: number; // tokens per second

  constructor(key: string, maxTokens: number, refillRate: number) {
    this.redis = getRedis();
    this.key = `ratelimit:${key}`;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  async tryAcquire(tokens: number = 1): Promise<boolean> {
    const now = Date.now();
    const bucketKey = this.key;
    const lastUpdateKey = `${this.key}:lastUpdate`;

    // Lua script for atomic token bucket
    const script = `
      local tokens = tonumber(redis.call('GET', KEYS[1]) or ARGV[1])
      local lastUpdate = tonumber(redis.call('GET', KEYS[2]) or ARGV[4])
      local now = tonumber(ARGV[4])
      local refillRate = tonumber(ARGV[2])
      local maxTokens = tonumber(ARGV[1])
      local requested = tonumber(ARGV[3])
      
      local elapsed = (now - lastUpdate) / 1000
      tokens = math.min(maxTokens, tokens + (elapsed * refillRate))
      
      if tokens >= requested then
        tokens = tokens - requested
        redis.call('SET', KEYS[1], tokens)
        redis.call('SET', KEYS[2], now)
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      script,
      2,
      bucketKey,
      lastUpdateKey,
      this.maxTokens,
      this.refillRate,
      tokens,
      now
    );

    return result === 1;
  }

  async waitForToken(tokens: number = 1, maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.tryAcquire(tokens)) {
        return true;
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  }
}

// Create rate limiters for Google Ads API
export const googleAdsRateLimiter = new RateLimiter('google-ads', 60, 1); // 60 requests per minute

export default { getRedis, cache, RateLimiter };

