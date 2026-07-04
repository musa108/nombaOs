import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(@Request() req, @Query('search') search: string) {
    return this.customersService.findAll(req.user.business.id, search);
  }

  @Post()
  create(
    @Request() req,
    @Body() dto: { name: string; email?: string; phone?: string },
  ) {
    return this.customersService.create(req.user.business.id, dto);
  }

  @Get('top')
  getTop(@Request() req, @Query('limit') limit: number) {
    return this.customersService.getTopCustomers(
      req.user.business.id,
      limit || 10,
    );
  }

  @Get('lifetime-value')
  getLifetimeValue(@Request() req) {
    return this.customersService.getCustomerLifetimeValue(req.user.business.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }
}
