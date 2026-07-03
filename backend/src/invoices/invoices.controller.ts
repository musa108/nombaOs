import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('status') status: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.invoicesService.findAll(req.user.business.id, { status, page, limit });
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.invoicesService.create(req.user.business.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Put(':id/paid')
  markAsPaid(@Param('id') id: string) {
    return this.invoicesService.markAsPaid(id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.invoicesService.cancel(id);
  }

  @Post(':id/reminder')
  sendReminder(@Param('id') id: string) {
    return this.invoicesService.sendReminder(id);
  }

  @Post('check-overdue')
  checkOverdue(@Request() req) {
    return this.invoicesService.checkOverdueInvoices(req.user.business.id);
  }
}
