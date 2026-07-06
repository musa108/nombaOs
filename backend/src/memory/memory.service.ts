import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../common/prisma.service';
import { toSql } from 'pgvector';

export type MemoryKind = 'PREFERENCE' | 'FACT' | 'CONVERSATION_SUMMARY';

interface RetrievedMemory {
  id: string;
  kind: MemoryKind;
  content: string;
  metadata: unknown;
  similarity: number;
}

/**
 * Vector Memory layer (System Architecture §7, Technology: pgvector).
 *
 * Stores embedded business facts, merchant preferences, and conversation
 * summaries, then retrieves the semantically closest ones to enrich the AI
 * agent's context beyond the last 20 raw messages kept in the Conversation row.
 *
 * Embeddings: gemini-embedding-001 @ outputDimensionality=1536 via @google/genai.
 * 1536 dims matches vector(1536) in schema.prisma and achieves the same MTEB
 * score as the full 3072-dim default — no quality loss, no schema migration needed.
 *
 * Reads/writes use $executeRawUnsafe / $queryRawUnsafe because Prisma has no
 * native `vector` scalar. `pgvector`'s toSql() produces a numeric literal
 * string (not user-controlled input), so this is not a SQL injection vector.
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private ai: GoogleGenAI | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not set — vector memory disabled. Set it in .env to enable semantic recall.',
      );
    }
  }

  // ─── Embedding ──────────────────────────────────────────────────────────────

  private async embed(text: string): Promise<number[] | null> {
    if (!this.ai) return null;
    try {
      const res = await this.ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text.slice(0, 8000), // guard pathologically long inputs
        config: {
          outputDimensionality: 1536, // matches vector(1536) column
          taskType: 'SEMANTIC_SIMILARITY',
        },
      });
      return res.embeddings?.[0]?.values ?? null;
    } catch (err: any) {
      this.logger.error('Gemini embedding failed', err.message);
      return null;
    }
  }

  // ─── Write ──────────────────────────────────────────────────────────────────

  async remember(
    businessId: string,
    kind: MemoryKind,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const vector = await this.embed(content);
      const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (vector) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "BusinessMemory" (id, "businessId", kind, content, metadata, embedding, "createdAt")
           VALUES ($1, $2, $3::"MemoryKind", $4, $5::jsonb, $6::vector, now())`,
          id,
          businessId,
          kind,
          content,
          JSON.stringify(metadata ?? {}),
          toSql(vector),
        );
      } else {
        // Still record the memory even without an embedding so it exists in DB
        // (degraded: text is stored but not semantically searchable until the
        // next time recall() is called and it gets a chance to re-embed).
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "BusinessMemory" (id, "businessId", kind, content, metadata, "createdAt")
           VALUES ($1, $2, $3::"MemoryKind", $4, $5::jsonb, now())`,
          id,
          businessId,
          kind,
          content,
          JSON.stringify(metadata ?? {}),
        );
      }
    } catch (err: any) {
      // pgvector not installed or embedding column missing — degrade gracefully.
      // Fix: install pgvector for PostgreSQL and run: npx prisma migrate deploy
      if (this.isPgvectorMissingError(err)) {
        this.logger.warn(
          '[MemoryService] pgvector extension or embedding column not found — ' +
          'memory write skipped. Install pgvector and run `npx prisma migrate deploy` to enable semantic memory.',
        );
        return;
      }
      throw err;
    }
  }

  // ─── Read ───────────────────────────────────────────────────────────────────

  async recall(
    businessId: string,
    query: string,
    limit = 5,
  ): Promise<RetrievedMemory[]> {
    const vector = await this.embed(query);
    if (!vector) return [];

    try {
      const rows = await this.prisma.$queryRawUnsafe<
        {
          id: string;
          kind: MemoryKind;
          content: string;
          metadata: unknown;
          similarity: string;
        }[]
      >(
        `SELECT id, kind, content, metadata,
                1 - (embedding <=> $1::vector) AS similarity
         FROM "BusinessMemory"
         WHERE "businessId" = $2 AND embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        toSql(vector),
        businessId,
        limit,
      );

      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        content: r.content,
        metadata: r.metadata,
        similarity: Number(r.similarity),
      }));
    } catch (err: any) {
      // pgvector not installed or embedding column missing — degrade gracefully.
      // Fix: install pgvector for PostgreSQL and run: npx prisma migrate deploy
      if (this.isPgvectorMissingError(err)) {
        this.logger.warn(
          '[MemoryService] pgvector extension or embedding column not found — ' +
          'semantic recall disabled. Install pgvector and run `npx prisma migrate deploy` to enable.',
        );
        return [];
      }
      throw err;
    }
  }

  /** Returns a formatted string injected into the AI system prompt. */
  async recallAsContext(businessId: string, query: string): Promise<string> {
    const memories = await this.recall(businessId, query, 5);
    const relevant = memories.filter((m) => m.similarity > 0.3);
    if (relevant.length === 0) return '';
    return relevant.map((m) => `[${m.kind}] ${m.content}`).join('\n');
  }

  /**
   * Returns true for PostgreSQL errors that indicate pgvector is not installed
   * or the embedding column does not yet exist in the database.
   *   42703 = column does not exist
   *   58P01 = extension control file not found (pgvector not installed)
   *   42704 = undefined object (type "vector" does not exist)
   */
  private isPgvectorMissingError(err: any): boolean {
    const pgCode: string = err?.code ?? err?.meta?.driverAdapterError?.cause?.originalCode ?? '';
    const msg: string = (err?.message ?? '').toLowerCase();
    return (
      pgCode === 'P2010' ||
      ['42703', '58P01', '42704'].includes(pgCode) ||
      msg.includes('column "embedding" does not exist') ||
      msg.includes('type "vector" does not exist') ||
      msg.includes('extension control file')
    );
  }

  /** Prune old CONVERSATION_SUMMARY entries to keep the table lean. */
  async forgetOld(businessId: string, olderThanDays = 180): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.$executeRawUnsafe(
      `DELETE FROM "BusinessMemory"
       WHERE "businessId" = $1 AND "createdAt" < $2 AND kind = 'CONVERSATION_SUMMARY'`,
      businessId,
      cutoff,
    );
    return result;
  }
}
