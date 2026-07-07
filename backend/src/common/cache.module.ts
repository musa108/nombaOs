import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
import Redis from 'ioredis';

let redisClient: Redis | null = null;
export function getRedisClient(): Redis | null {
  return redisClient;
}
import { CacheService } from './cache.service';

/**
 * Cache Layer (System Architecture §7): "Session storage, Conversation
 * state, Frequently used queries" backed by Redis.
 *
 * Falls back to NestJS's built-in in-memory store if REDIS_URL is unset, so
 * local dev without `docker-compose up` doesn't hard-fail — but logs a
 * warning, since in-memory cache doesn't survive a restart or work across
 * multiple backend instances the way the architecture diagram implies.
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) {
          console.warn(
            '[CacheModule] REDIS_URL not set — falling back to in-memory cache. ' +
              'This will NOT persist across restarts or share state across instances. ' +
              'Set REDIS_URL (see docker-compose.yml) for the real Cache Layer described in the architecture.',
          );
          return { ttl: 60_000 };
        }

        // Create a dedicated ioredis client so we can attach error handlers
        // and control reconnect behavior. If anything goes wrong, fall back
        // to the in-memory cache to keep the service healthy.
        try {
          const client = new Redis(redisUrl, {
            // Limit internal retries for individual commands
            maxRetriesPerRequest: 5,
            // Exponential backoff for reconnect attempts (ms)
            retryStrategy: (times) => Math.min(1000 * Math.pow(2, times), 30000),
            // Reconnect on common network errors
            reconnectOnError: (err) => {
              if (!err) return false;
              const msg = String((err && err.message) || err);
              return msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET');
            },
            enableReadyCheck: true,
          });

          client.on('error', (err) => {
            console.warn('[CacheModule] Redis client error:', err && err.message ? err.message : err);
          });

          client.on('connect', () => {
            console.info('[CacheModule] Redis client connecting...');
          });

          client.on('ready', () => {
            console.info('[CacheModule] Redis client ready');
          });

          client.on('end', () => {
            console.warn('[CacheModule] Redis connection closed');
            redisClient = null;
          });

          // expose client for other modules (health checks, metrics)
          redisClient = client;

          // Pass the preconfigured client to the redis store (so cache-manager
          // reuses it instead of creating its own instance).
          const store = await redisStore({ client, ttl: 60_000 });
          return { store };
        } catch (err) {
          console.warn('[CacheModule] Failed to initialize Redis cache, falling back to in-memory cache.', err);
          return { ttl: 60_000 };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
