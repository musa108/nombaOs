import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        businessId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        _count: { select: { transactions: true, invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(businessId: string, data: { name: string; email?: string; phone?: string }) {
    return this.prisma.customer.create({ data: { businessId, ...data } });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async getTopCustomers(businessId: string, limit = 10) {
    // Customers with highest total spending
    const customers = await this.prisma.$queryRaw<any[]>`
      SELECT c.id, c.name, c.email, c.phone,
             COUNT(t.id) as transaction_count,
             SUM(t.amount) as total_spent,
             MAX(t.created_at) as last_purchase
      FROM customers c
      LEFT JOIN transactions t ON t.customer_id = c.id AND t.type = 'CREDIT' AND t.status = 'SUCCESSFUL'
      WHERE c.business_id = ${businessId}
      GROUP BY c.id, c.name, c.email, c.phone
      ORDER BY total_spent DESC NULLS LAST
      LIMIT ${limit}
    `;
    return customers;
  }

  async getCustomerLifetimeValue(businessId: string) {
    return this.prisma.$queryRaw`
      SELECT c.id, c.name,
             COUNT(DISTINCT t.id) as visits,
             SUM(t.amount) as lifetime_value,
             AVG(t.amount) as avg_transaction,
             MIN(t.created_at) as first_purchase,
             MAX(t.created_at) as last_purchase
      FROM customers c
      LEFT JOIN transactions t ON t.customer_id = c.id AND t.status = 'SUCCESSFUL'
      WHERE c.business_id = ${businessId}
      GROUP BY c.id, c.name
      ORDER BY lifetime_value DESC NULLS LAST
    `;
  }
}
