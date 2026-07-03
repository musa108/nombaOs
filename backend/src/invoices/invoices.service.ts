import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NombaService } from '../nomba/nomba.service';
import { PostHogService } from '../common/posthog.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private nomba: NombaService,
    private posthog: PostHogService,
  ) {}

  private generateInvoiceNo(): string {
    const date = new Date();
    const y = date.getFullYear().toString().slice(2);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `INV-${y}${m}-${rand}`;
  }

  async create(
    businessId: string,
    data: {
      customerName: string;
      customerEmail?: string;
      customerId?: string;
      amount: number;
      items: Array<{ description: string; quantity: number; unitPrice: number }>;
      dueDate?: string;
      generatePaymentLink?: boolean;
    },
  ) {
    const invoiceNo = this.generateInvoiceNo();

    // Look up or create customer
    let customerId = data.customerId;
    if (!customerId && data.customerName) {
      const customer = await this.prisma.customer.upsert({
        where: { id: data.customerId || 'non-existent' },
        create: {
          businessId,
          name: data.customerName,
          email: data.customerEmail,
        },
        update: {},
      }).catch(async () => {
        // If upsert by id fails, find or create by name+business
        let found = await this.prisma.customer.findFirst({
          where: { businessId, name: data.customerName },
        });
        if (!found) {
          found = await this.prisma.customer.create({
            data: { businessId, name: data.customerName, email: data.customerEmail },
          });
        }
        return found;
      });
      customerId = customer.id;
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        customerId,
        invoiceNo,
        amount: data.amount,
        items: data.items as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: 'PENDING',
      },
      include: { customer: true },
    });

    // Generate Nomba payment link
    if (data.generatePaymentLink !== false) {
      try {
        const paymentLinkResult = await this.nomba.createPaymentLink({
          amount: data.amount,
          description: `Payment for Invoice ${invoiceNo}`,
          reference: invoiceNo,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
        });

        if (paymentLinkResult?.checkoutLink) {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { nombaPaymentLink: paymentLinkResult.checkoutLink },
          });
          invoice.nombaPaymentLink = paymentLinkResult.checkoutLink;
        }
      } catch (e) {
        // Payment link generation is non-critical
        console.error('Payment link generation failed:', e.message);
      }
    }

    // PostHog: track invoice creation (fire-and-forget)
    this.posthog.trackInvoiceCreated(
      businessId,
      businessId,
      data.amount,
      !!invoice.nombaPaymentLink,
    );

    return invoice;
  }

  async findAll(businessId: string, filters: { status?: string; page?: number; limit?: number } = {}) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = { businessId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices, total, page, limit };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async markAsPaid(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'PAID' },
      include: { customer: true },
    });
  }

  async cancel(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async sendReminder(id: string) {
    const invoice = await this.findOne(id);
    // In production: integrate email/SMS provider here
    // For now, return the invoice with payment link for frontend to handle
    return {
      invoice,
      reminderSent: true,
      paymentLink: invoice.nombaPaymentLink,
      message: `Reminder for invoice ${invoice.invoiceNo} worth ₦${invoice.amount} sent to ${invoice.customer?.name}`,
    };
  }

  async checkOverdueInvoices(businessId: string) {
    const now = new Date();
    const overdueCount = await this.prisma.invoice.updateMany({
      where: {
        businessId,
        status: 'PENDING',
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });
    return { updated: overdueCount.count };
  }
}
