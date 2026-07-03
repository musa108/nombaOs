import {
  Controller, Post, Get, Delete, Body, Param, Query,
  UseGuards, Request, Res, Sse, MessageEvent,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  async chat(
    @Request() req,
    @Body() dto: { message: string; conversationId?: string },
  ) {
    const user = req.user;
    if (!user.business) {
      return { message: 'Please set up your business profile first to use NombaOS.' };
    }
    return this.aiService.chat(
      user.id,
      user.business.id,
      dto.message,
      dto.conversationId,
    );
  }

  @Post('confirm-transfer')
  async confirmTransfer(
    @Request() req,
    @Body() dto: {
      amount: number;
      beneficiaryAccountNumber: string;
      beneficiaryBankCode: string;
      narration: string;
    },
  ) {
    return this.aiService.executeConfirmedTransfer(req.user.business.id, dto);
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    return this.aiService.getConversationHistory(id);
  }

  @Delete('conversations/:id')
  clearConversation(@Param('id') id: string) {
    return this.aiService.clearConversation(id);
  }
}
