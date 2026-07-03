import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { PostHogService } from '../common/posthog.service';

/**
 * Smart Notifications (Core Features §6, Development Phases Phase 7).
 * Automatically informs merchants — without them having to ask — when:
 *   • inventory runs low
 *   • invoices become overdue
 *   • daily revenue drops significantly vs yesterday
 *   • unusual spending (large debit) occurs
 *
 * Notifications are written to the Notification table so the frontend can
 * poll GET /notifications (unread first) and display them in the dashboard
 * header bell icon. Each check runs on a dedicated cron to avoid a single
 * slow check blocking the others.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private posthog: PostHogService,
  ) {}

  // ─── Low stock — every hour ─────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStock() {
    this.logger.debug('Running low-stock notification check');
    const businesses = await this.prisma.business.findMany({ select: { id: true } });

    for (const { id: businessId } of businesses) {
      const lowStock = await this.prisma.product.findMany({
        where: { businessId, quantity: { lte: 5, gt: 0 } },
      });
      const outOfStock = await this.prisma.product.findMany({
        where: { businessId, quantity: 0 },
      });

      for (const product of outOfStock) {
        await this.upsertNotification(businessId, 'LOW_STOCK', product.id, {
          title: `${product.name} is out of stock`,
          message: `You have 0 units of ${product.name} remaining. Restock immediately to avoid losing sales.`,
          metadata: { productId: product.id, quantity: 0 },
        });
      }

      for (const product of lowStock) {
        await this.upsertNotification(businessId, 'LOW_STOCK', `low_${product.id}`, {
          title: `Low stock: ${product.name}`,
          message: `Only ${product.quantity} unit${product.quantity === 1 ? '' : 's'} of ${product.name} left. Consider restocking soon.`,
          metadata: { productId: product.id, quantity: product.quantity },
        });
      }
    }
  }

  // ─── Overdue invoices — every day at 9am ───────────────────────────────────

  @Cron('0 9 * * *')
  async checkOverdueInvoices() {
    this.logger.debug('Running overdue-invoice notification check');
    const now = new Date();

    // Mark newly overdue and notify
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
      include: { customer: true },
    });

    for (const invoice of overdueInvoices) {
      // Update status
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      });

      const customerName = invoice.customer?.name ?? 'a customer';
      await this.upsertNotification(invoice.businessId, 'OVERDUE_INVOICE', invoice.id, {
        title: `Overdue invoice: ${invoice.invoiceNo}`,
        message: `Invoice ${invoice.invoiceNo} for ₦${Number(invoice.amount).toLocaleString()} from ${customerName} is overdue. Send a reminder to collect payment.`,
        metadata: { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, amount: Number(invoice.amount) },
      });
    }
  }

  // ─── Revenue drop — every day at 8am ───────────────────────────────────────

  @Cron('0 8 * * *')
  async checkRevenueDrop() {
    this.logger.debug('Running revenue-drop notification check');
    const businesses = await this.prisma.business.findMany({ select: { id: true } });

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    for (const { id: businessId } of businesses) {
      const [todayRev, yesterdayRev] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { businessId, type: 'CREDIT', status: 'SUCCESSFUL', createdAt: { gte: startOfToday } },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            businessId, type: 'CREDIT', status: 'SUCCESSFUL',
            createdAt: { gte: startOfYesterday, lt: startOfToday },
          },
          _sum: { amount: true },
        }),
      ]);

      const t = Number(todayRev._sum.amount ?? 0);
      const y = Number(yesterdayRev._sum.amount ?? 0);

      // Only fire if yesterday had meaningful revenue and today is more than 30% lower
      if (y > 1000 && t < y * 0.7) {
        const drop = (((y - t) / y) * 100).toFixed(0);
        await this.upsertNotification(businessId, 'SALES_DROP', `drop_${startOfToday.toISOString().slice(0, 10)}`, {
          title: `Sales down ${drop}% today`,
          message: `Today's revenue (₦${t.toLocaleString()}) is ${drop}% lower than yesterday (₦${y.toLocaleString()}). Ask the AI assistant "Why are sales dropping?" for analysis.`,
          metadata: { todayRevenue: t, yesterdayRevenue: y, dropPercent: Number(drop) },
        });
      }
    }
  }

  // ─── Unusual spending — check after every debit sync ───────────────────────

  @Cron(CronExpression.EVERY_2_HOURS)
  async checkUnusualSpending() {
    this.logger.debug('Running unusual-spending check');
    const businesses = await this.prisma.business.findMany({ select: { id: true } });

    for (const { id: businessId } of businesses) {
      // Find the average debit over last 30 days
      const stats = await this.prisma.transaction.aggregate({
        where: {
          businessId, type: 'DEBIT', status: 'SUCCESSFUL',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _avg: { amount: true },
        _count: true,
      });

      if (stats._count < 5) continue; // not enough history
      const avg = Number(stats._avg.amount ?? 0);

      // Any single debit in the last 2 hours that is >3× the 30-day average
      const threshold = avg * 3;
      const recentLarge = await this.prisma.transaction.findMany({
        where: {
          businessId, type: 'DEBIT', status: 'SUCCESSFUL',
          amount: { gt: threshold },
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
      });

      for (const tx of recentLarge) {
        await this.upsertNotification(businessId, 'UNUSUAL_SPENDING', tx.id, {
          title: 'Unusual spending detected',
          message: `A debit of ₦${Number(tx.amount).toLocaleString()} was recorded — ${(Number(tx.amount) / avg).toFixed(1)}× your average. Reference: ${tx.reference ?? 'N/A'}.`,
          metadata: { transactionId: tx.id, amount: Number(tx.amount), average: avg },
        });
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Idempotent upsert — uses a deterministic dedupeKey so the same event
   * doesn't create duplicate notifications across cron runs.
   */
  private async upsertNotification(
    businessId: string,
    type: 'LOW_STOCK' | 'OVERDUE_INVOICE' | 'SALES_DROP' | 'UNUSUAL_SPENDING',
    dedupeKey: string,
    payload: { title: string; message: string; metadata: Record<string, unknown> },
  ) {
    const id = `notif_${businessId.slice(0, 8)}_${dedupeKey}`.replace(/[^a-zA-Z0-9_]/g, '_');

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Notification" (id, "businessId", type, title, message, read, metadata, "createdAt")
       VALUES ($1, $2, $3::"NotificationType", $4, $5, false, $6::jsonb, now())
       ON CONFLICT (id) DO NOTHING`,
      id,
      businessId,
      type,
      payload.title,
      payload.message,
      JSON.stringify(payload.metadata),
    );

    // PostHog: track smart notification events (fire-and-forget, no await)
    this.posthog.trackNotificationSent(businessId, type);
  }

  // ─── API methods ─────────────────────────────────────────────────────────────

  async getNotifications(businessId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { businessId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(businessId: string) {
    return this.prisma.notification.updateMany({
      where: { businessId, read: false },
      data: { read: true },
    });
  }

  async getUnreadCount(businessId: string) {
    return this.prisma.notification.count({ where: { businessId, read: false } });
  }
}
