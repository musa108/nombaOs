import { Controller, Get, Post, Put, Body, UseGuards, Request } from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Post('setup')
  setup(
    @Request() req,
    @Body() dto: { businessName: string; industry: string; nombaAccountId?: string },
  ) {
    return this.businessService.createOrUpdate(req.user.id, dto);
  }

  @Put('update')
  update(
    @Request() req,
    @Body() dto: { businessName?: string; industry?: string; nombaAccountId?: string },
  ) {
    return this.businessService.createOrUpdate(req.user.id, dto as any);
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.businessService.findByUser(req.user.id);
  }

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.businessService.getDashboardSummary(req.user.id);
  }
}
