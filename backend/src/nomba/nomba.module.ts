import { Module } from '@nestjs/common';
import { NombaService } from './nomba.service';
import { NombaController } from './nomba.controller';

@Module({
  providers: [NombaService],
  controllers: [NombaController],
  exports: [NombaService],
})
export class NombaModule {}
