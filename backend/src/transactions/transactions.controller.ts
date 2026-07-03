import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private txService: TransactionsService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('type') type: any,
    @Query('status') status: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const business = req.user.business;
    return this.txService.findAll(business.id, { type, status, startDate, endDate, page, limit });
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.txService.create(req.user.business.id, dto);
  }

  @Post('sync-nomba')
  syncFromNomba(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.txService.syncFromNomba(req.user.business.id, startDate, endDate);
  }

  @Get('report')
  getSalesReport(@Request() req, @Query('period') period: any) {
    return this.txService.getSalesReport(req.user.business.id, period || 'month');
  }

  @Post('transfer')
  transfer(@Request() req, @Body() dto: any) {
    return this.txService.transferFunds(req.user.business.id, dto);
  }
}
