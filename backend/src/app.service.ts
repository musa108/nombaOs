import { Injectable } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { CacheService } from './common/cache.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getHealth() {
    const timestamp = new Date().toISOString();

    // DB check
    let db = { ok: false } as any;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = { ok: true };
    } catch (err) {
      db = { ok: false, error: String(err) };
    }

    // Redis / Cache check
    const redisStatus = this.cacheService.getRedisStatus();

    return {
      status: 'ok',
      service: 'NombaOS API',
      timestamp,
      db,
      redis: redisStatus,
    };
  }
}
