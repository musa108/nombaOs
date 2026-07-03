import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NombaService } from './nomba.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Nomba')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nomba')
export class NombaController {
  constructor(private readonly nombaService: NombaService) {}

  @Get('balance')
  getBalance() {
    return this.nombaService.getAccountBalance();
  }

  @Get('transactions')
  getTransactions(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.nombaService.getTransactions({ startDate, endDate, page, limit });
  }

  @Get('banks')
  listBanks() {
    return this.nombaService.listBanks();
  }

  @Get('verify-account')
  verifyAccount(
    @Query('accountNumber') accountNumber: string,
    @Query('bankCode') bankCode: string,
  ) {
    return this.nombaService.verifyBankAccount(accountNumber, bankCode);
  }

  @Post('transfer')
  initiateTransfer(@Body() dto: {
    amount: number;
    beneficiaryAccountNumber: string;
    beneficiaryBankCode: string;
    narration: string;
    reference: string;
  }) {
    return this.nombaService.initiateTransfer(dto);
  }

  @Post('payment-link')
  createPaymentLink(@Body() dto: {
    amount: number;
    description: string;
    reference: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    return this.nombaService.createPaymentLink(dto);
  }

  @Get('settlements')
  getSettlements(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.nombaService.getSettlements({ startDate, endDate });
  }
}
