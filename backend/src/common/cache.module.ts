import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';
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
          // eslint-disable-next-line no-console
          console.warn(
            '[CacheModule] REDIS_URL not set — falling back to in-memory cache. ' +
              'This will NOT persist across restarts or share state across instances. ' +
              'Set REDIS_URL (see docker-compose.yml) for the real Cache Layer described in the architecture.',
          );
          return { ttl: 60_000 };
        }
        const store = await redisStore({ url: redisUrl, ttl: 60_000 });
        return { store };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
