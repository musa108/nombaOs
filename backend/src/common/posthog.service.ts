import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

/**
 * PostHog analytics service (Deployment §14 — Analytics: PostHog).
 *
 * Captures product events so you can answer:
 *   "How many AI chat messages per merchant per day?"
 *   "Which tools does the AI use most often?"
 *   "What % of invoices result in a payment link click?"
 *   "How many smart notifications fire per week?"
 *
 * The Sentry↔PostHog link is handled on the frontend (posthog-js's
 * sentry integration is the browser one; posthog-node's class-based
 * integration is deprecated). On the backend, Sentry captures exceptions
 * independently; PostHog captures product behaviour events.
 *
 * No-ops when POSTHOG_API_KEY is unset so local dev works without config.
 */
@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly logger = new Logger(PostHogService.name);
  private client: PostHog | null = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('POSTHOG_API_KEY');
    if (!apiKey) {
      this.logger.warn('POSTHOG_API_KEY not set — analytics disabled. Set it in .env to enable.');
      return;
    }

    this.client = new PostHog(apiKey, {
      host: this.config.get<string>('POSTHOG_HOST') ?? 'https://app.posthog.com',
      flushAt: this.config.get<string>('NODE_ENV') === 'production' ? 20 : 1,
      flushInterval: 10_000,
    });

    this.logger.log('PostHog analytics initialised');
  }

  // ─── Core capture ────────────────────────────────────────────────────────────

  capture(event: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }): void {
    if (!this.client) return;
    this.client.capture({
      distinctId: event.distinctId,
      event: event.event,
      properties: { source: 'backend', ...event.properties },
    });
  }

  identify(userId: string, properties: Record<string, unknown>): void {
    this.client?.identify({ distinctId: userId, properties });
  }

  // ─── Named event helpers ─────────────────────────────────────────────────────

  trackAiChat(userId: string, businessId: string, toolsUsed: string[], conversationId: string): void {
    this.capture({
      distinctId: userId,
      event: 'ai_chat_message_sent',
      properties: { businessId, toolsUsed, toolCount: toolsUsed.length, conversationId },
    });
  }

  trackInvoiceCreated(userId: string, businessId: string, amount: number, hasPaymentLink: boolean): void {
    this.capture({
      distinctId: userId,
      event: 'invoice_created',
      properties: { businessId, amount, hasPaymentLink },
    });
  }

  trackTransferConfirmed(userId: string, businessId: string, amount: number, reference: string): void {
    this.capture({
      distinctId: userId,
      event: 'transfer_confirmed',
      properties: { businessId, amount, reference },
    });
  }

  trackNombaSync(userId: string, businessId: string, synced: number): void {
    this.capture({
      distinctId: userId,
      event: 'nomba_sync_completed',
      properties: { businessId, transactionsSynced: synced },
    });
  }

  trackNotificationSent(businessId: string, type: string): void {
    this.capture({
      distinctId: businessId,
      event: 'smart_notification_fired',
      properties: { businessId, notificationType: type },
    });
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
      this.logger.log('PostHog client flushed and shut down');
    }
  }
}
