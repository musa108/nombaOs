import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CacheService } from '../common/cache.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // Public entry point: cached for 2 minutes. Revenue analytics is read on
  // every dashboard load AND every AI chat turn (via getBusinessContext
  // below), so this is the single highest-traffic query in the app —
  // exactly the "frequently used queries" case the Cache Layer (§7) exists
  // for. 2 min balances freshness (a new sale should show up reasonably
  // fast) against cutting DB load on the hot path.
  async getRevenueAnalytics(businessId: string) {
    return this.cache.getOrSet(`revenue-analytics:${businessId}`, 120_000, () =>
      this.computeRevenueAnalytics(businessId),
    );
  }

  private async computeRevenueAnalytics(businessId: string) {
    const now = new Date();
    const periods = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      yesterday: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      thisWeek: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      lastWeek: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      thisMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      lastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    };

    const getRevenue = (gte: Date, lt?: Date) =>
      this.prisma.transaction.aggregate({
        where: {
          businessId,
          type: 'CREDIT',
          status: 'SUCCESSFUL',
          createdAt: { gte, ...(lt ? { lt } : {}) },
        },
        _sum: { amount: true },
        _count: true,
      });

    const [today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth] =
      await Promise.all([
        getRevenue(periods.today),
        getRevenue(periods.yesterday, periods.today),
        getRevenue(periods.thisWeek),
        getRevenue(periods.lastWeek, periods.thisWeek),
        getRevenue(periods.thisMonth),
        getRevenue(periods.lastMonth, periods.thisMonth),
      ]);

    const todayRev = Number(today._sum.amount || 0);
    const yesterdayRev = Number(yesterday._sum.amount || 0);
    const weekRev = Number(thisWeek._sum.amount || 0);
    const lastWeekRev = Number(lastWeek._sum.amount || 0);
    const monthRev = Number(thisMonth._sum.amount || 0);
    const lastMonthRev = Number(lastMonth._sum.amount || 0);

    return {
      today: { revenue: todayRev, count: today._count },
      yesterday: { revenue: yesterdayRev, count: yesterday._count },
      week: { revenue: weekRev, count: thisWeek._count },
      lastWeek: { revenue: lastWeekRev, count: lastWeek._count },
      month: { revenue: monthRev, count: thisMonth._count },
      lastMonth: { revenue: lastMonthRev, count: lastMonth._count },
      growth: {
        daily:
          yesterdayRev > 0
            ? ((todayRev - yesterdayRev) / yesterdayRev) * 100
            : 0,
        weekly:
          lastWeekRev > 0 ? ((weekRev - lastWeekRev) / lastWeekRev) * 100 : 0,
        monthly:
          lastMonthRev > 0
            ? ((monthRev - lastMonthRev) / lastMonthRev) * 100
            : 0,
      },
    };
  }

  // Hit on EVERY AI chat turn (ai.service.ts builds this into the system
  // prompt each time) — the single hottest path in the whole app. Short TTL
  // (30s) because this directly feeds what the AI tells the merchant; the
  // revenue numbers inside it are already cached at 2min via
  // getRevenueAnalytics, so this mostly saves the 4 extra parallel queries
  // (customer count, invoice groupBy, low-stock products, recent tx list).
  async getBusinessContext(businessId: string): Promise<string> {
    return this.cache.getOrSet(`business-context:${businessId}`, 30_000, () =>
      this.computeBusinessContext(businessId),
    );
  }

  private async computeBusinessContext(businessId: string): Promise<string> {
    const [business, analytics, customers, invoices, products, recentTx] =
      await Promise.all([
        this.prisma.business.findUnique({ where: { id: businessId } }),
        this.getRevenueAnalytics(businessId),
        this.prisma.customer.count({ where: { businessId } }),
        this.prisma.invoice.groupBy({
          by: ['status'],
          where: { businessId },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.product.findMany({
          where: { businessId, quantity: { lt: 10 } },
          take: 5,
        }),
        this.prisma.transaction.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { customer: true },
        }),
      ]);

    const invoiceSummary = invoices.reduce(
      (acc, i) => {
        acc[i.status] = { count: i._count, amount: Number(i._sum.amount || 0) };
        return acc;
      },
      {} as Record<string, any>,
    );

    return JSON.stringify({
      business: {
        name: business?.businessName,
        industry: business?.industry,
        id: businessId,
      },
      revenue: analytics,
      customerCount: customers,
      invoices: invoiceSummary,
      lowStockProducts: products.map((p) => ({
        name: p.name,
        quantity: p.quantity,
      })),
      recentTransactions: recentTx.map((t) => ({
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        description: t.description,
        customer: t.customer?.name,
        date: t.createdAt,
      })),
    });
  }

  async getDailyRevenueTrend(businessId: string, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        DATE("createdAt") as date,
        SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as expenses,
        COUNT(*) as transactions
      FROM "Transaction"
      WHERE "businessId" = ${businessId}
        AND "createdAt" >= ${startDate}
        AND status = 'SUCCESSFUL'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;
  }
}
