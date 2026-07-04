import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdate(
    userId: string,
    data: { businessName: string; industry: string; nombaAccountId?: string },
  ) {
    return this.prisma.business.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async findByUser(userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            customers: true,
            products: true,
            transactions: true,
            invoices: true,
          },
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async findById(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async getDashboardSummary(userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { userId },
    });
    if (!business) throw new NotFoundException('Business not set up');

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalCustomers,
      pendingInvoices,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          businessId: business.id,
          type: 'CREDIT',
          status: 'SUCCESSFUL',
          createdAt: { gte: startOfDay },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: {
          businessId: business.id,
          type: 'CREDIT',
          status: 'SUCCESSFUL',
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          businessId: business.id,
          type: 'CREDIT',
          status: 'SUCCESSFUL',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.customer.count({ where: { businessId: business.id } }),
      this.prisma.invoice.count({
        where: { businessId: business.id, status: 'PENDING' },
      }),
      this.prisma.transaction.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: true },
      }),
    ]);

    return {
      business,
      summary: {
        todayRevenue: Number(todayRevenue._sum.amount || 0),
        todayTransactions: todayRevenue._count,
        weekRevenue: Number(weekRevenue._sum.amount || 0),
        monthRevenue: Number(monthRevenue._sum.amount || 0),
        totalCustomers,
        pendingInvoices,
      },
      recentTransactions,
    };
  }
}
