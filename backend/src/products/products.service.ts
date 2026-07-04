import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    businessId: string,
    filters: { category?: string; lowStock?: boolean } = {},
  ) {
    const where: any = { businessId };
    if (filters.category) where.category = filters.category;
    if (filters.lowStock) where.quantity = { lt: 10 };

    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async create(
    businessId: string,
    data: { name: string; category?: string; quantity: number; price: number },
  ) {
    return this.prisma.product.create({ data: { businessId, ...data } });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      quantity: number;
      price: number;
    }>,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data });
  }

  async getLowStockAlerts(businessId: string, threshold = 10) {
    return this.prisma.product.findMany({
      where: { businessId, quantity: { lt: threshold } },
      orderBy: { quantity: 'asc' },
    });
  }

  async getInventorySummary(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId },
    });
    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.price) * p.quantity,
      0,
    );
    const lowStockCount = products.filter((p) => p.quantity < 10).length;
    const outOfStockCount = products.filter((p) => p.quantity === 0).length;

    const categories = products.reduce(
      (acc, p) => {
        const cat = p.category || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalProducts: products.length,
      totalInventoryValue: totalValue,
      lowStockCount,
      outOfStockCount,
      categories,
    };
  }
}
