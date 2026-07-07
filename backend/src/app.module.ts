import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { TransactionsModule } from './transactions/transactions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AiModule } from './ai/ai.module';
import { NombaModule } from './nomba/nomba.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PrismaModule } from './common/prisma.module';
import { CacheModule } from './common/cache.module';

import { NotificationsModule } from './notifications/notifications.module';
import { PostHogModule } from './common/posthog.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CacheModule,
    PostHogModule,
    NotificationsModule,
    AuthModule,
    BusinessModule,
    CustomersModule,
    ProductsModule,
    TransactionsModule,
    InvoicesModule,
    AiModule,
    NombaModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
