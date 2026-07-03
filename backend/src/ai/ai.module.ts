import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { NombaModule } from '../nomba/nomba.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    NombaModule,
    AnalyticsModule,
    InvoicesModule,
    TransactionsModule,
    CustomersModule,
    ProductsModule,
    MemoryModule,
  ],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
