// src/lib/cache.ts
// Robust in-memory cache with optional Redis support

import { Redis } from 'ioredis';
import logger from './logger.js';

type CacheStore = 'redis' | 'memory';

class Cache {
  private redis: Redis | null = null;
  private memory: Map<string, { value: string; expiresAt: number }> = new Map();
  private store: CacheStore = 'memory';

  async connect(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url || url.includes('localhost')) {
      // Use in-memory cache for local development unless explicit remote Redis is provided
      this.store = 'memory';
      logger.info('[cache] Running with in-memory caching');
      return;
    }

    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Do not retry continuously if unavailable
        connectTimeout: 2000,
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        logger.warn('[cache] Redis connection error, falling back to memory store', { err: err.message });
        this.store = 'memory';
        if (this.redis) {
          try { this.redis.disconnect(); } catch {}
          this.redis = null;
        }
      });

      await this.redis.connect();
      this.store = 'redis';
      logger.info('[cache] Connected to Redis');
    } catch (err: any) {
      logger.warn('[cache] Redis initialization failed, using in-memory cache', { err: err?.message });
      this.store = 'memory';
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.store === 'redis' && this.redis) {
        const val = await this.redis.get(key);
        return val ? (JSON.parse(val) as T) : null;
      }
      const entry = this.memory.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        this.memory.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (this.store === 'redis' && this.redis) {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        this.memory.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
        if (this.memory.size > 2000) this.prune();
      }
    } catch (err) {
      logger.warn('[cache] Failed to set cache key', { key, err });
    }
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.memory) {
      if (now > entry.expiresAt) this.memory.delete(key);
    }
  }

  cacheKey(...parts: string[]): string {
    return parts.join(':').toLowerCase().replace(/\s+/g, '_');
  }
}

const cache = new Cache();
export default cache;
