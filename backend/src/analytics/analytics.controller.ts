import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('revenue')
  getRevenue(@Request() req) {
    return this.analyticsService.getRevenueAnalytics(req.user.business.id);
  }

  @Get('trend')
  getTrend(@Request() req, @Query('days') days: number) {
    return this.analyticsService.getDailyRevenueTrend(
      req.user.business.id,
      days || 30,
    );
  }
}
