import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('category') category: string,
    @Query('lowStock') lowStock: string,
  ) {
    return this.productsService.findAll(req.user.business.id, {
      category,
      lowStock: lowStock === 'true',
    });
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.productsService.create(req.user.business.id, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(id, dto);
  }

  @Get('low-stock')
  getLowStock(@Request() req, @Query('threshold') threshold: number) {
    return this.productsService.getLowStockAlerts(
      req.user.business.id,
      threshold || 10,
    );
  }

  @Get('inventory-summary')
  getInventorySummary(@Request() req) {
    return this.productsService.getInventorySummary(req.user.business.id);
  }
}
