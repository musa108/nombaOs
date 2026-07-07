import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NombaService } from '../nomba/nomba.service';
import { CacheService } from '../common/cache.service';
import { PostHogService } from '../common/posthog.service';
import { TransactionType, TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private nomba: NombaService,
    private cache: CacheService,
    private posthog: PostHogService,
  ) {}

  async findAll(
    businessId: string,
    filters: {
      type?: TransactionType;
      status?: TransactionStatus;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { type, status, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async create(
    businessId: string,
    data: {
      amount: number;
      type: TransactionType;
      description?: string;
      customerId?: string;
      reference?: string;
    },
  ) {
    const tx = await this.prisma.transaction.create({
      data: {
        businessId,
        amount: data.amount,
        type: data.type,
        description: data.description,
        customerId: data.customerId,
        reference: data.reference || `TXN-${Date.now()}`,
        status: 'SUCCESSFUL',
      },
      include: { customer: true },
    });
    await this.cache.invalidateBusiness(businessId);
    return tx;
  }

  // Sync Nomba transactions into local DB
  async syncFromNomba(
    businessId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const nombaData = await this.nomba.getTransactions({
      startDate,
      endDate,
      limit: 100,
    });
    const nombaTransactions = nombaData?.data || [];

    let synced = 0;
    for (const tx of nombaTransactions) {
      const existing = await this.prisma.transaction.findFirst({
        where: { nombaRef: tx.transactionRef || tx.id },
      });

      if (!existing) {
        await this.prisma.transaction.create({
          data: {
            businessId,
            amount: tx.amount || tx.transactionAmount,
            type: tx.transactionType === 'DEBIT' ? 'DEBIT' : 'CREDIT',
            status:
              tx.status === 'SUCCESSFUL'
                ? 'SUCCESSFUL'
                : tx.status === 'FAILED'
                  ? 'FAILED'
                  : 'PENDING',
            nombaRef: tx.transactionRef || tx.id,
            description: tx.narration || tx.description,
            reference: tx.merchantTxRef || tx.transactionRef,
          },
        });
        synced++;
      }
    }

    if (synced > 0) {
      await this.cache.invalidateBusiness(businessId);
      // PostHog: track Nomba sync completions (fire-and-forget)
      this.posthog.trackNombaSync(businessId, businessId, synced);
    }
    return { synced, total: nombaTransactions.length };
  }

  async getSalesReport(
    businessId: string,
    period: 'today' | 'week' | 'month' | 'year',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const [revenue, expenses, byDay] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          businessId,
          type: 'CREDIT',
          status: 'SUCCESSFUL',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          businessId,
          type: 'DEBIT',
          status: 'SUCCESSFUL',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.$queryRaw`
        SELECT DATE("createdAt") as date,
               SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as revenue,
               SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as expenses,
               COUNT(*) as count
        FROM "Transaction"
        WHERE "businessId" = ${businessId}
          AND "createdAt" >= ${startDate}
          AND status = 'SUCCESSFUL'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `,
    ]);

    const totalRevenue = Number(revenue._sum.amount || 0);
    const totalExpenses = Number(expenses._sum.amount || 0);

    return {
      period,
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
      transactionCount: revenue._count,
      averageTransactionValue: Number(revenue._avg.amount || 0),
      dailyBreakdown: byDay,
    };
  }

  async transferFunds(
    businessId: string,
    payload: {
      amount: number;
      beneficiaryAccountNumber: string;
      beneficiaryBankCode: string;
      narration: string;
    },
  ) {
    const reference = `TRF-${businessId.slice(0, 6)}-${Date.now()}`;

    // Execute through Nomba
    const nombaResult = await this.nomba.initiateTransfer({
      ...payload,
      reference,
    });

    // Record in local DB
    const transaction = await this.prisma.transaction.create({
      data: {
        businessId,
        amount: payload.amount,
        type: 'TRANSFER',
        status: nombaResult?.status === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'PENDING',
        description: payload.narration,
        reference,
        nombaRef: nombaResult?.transactionRef,
      },
    });

    await this.cache.invalidateBusiness(businessId);

    // PostHog: track confirmed transfers (fire-and-forget)
    this.posthog.trackTransferConfirmed(
      businessId,
      businessId,
      payload.amount,
      reference,
    );

    return { transaction, nombaResult };
  }
}
