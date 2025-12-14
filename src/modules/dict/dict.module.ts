import { Module } from '@nestjs/common';
import { DictController } from './dict.controller';
import { DictService } from './dict.service';
import { DictStoreService } from './dict.store';

@Module({
  controllers: [DictController],
  providers: [DictService, DictStoreService],
  exports: [DictService, DictStoreService],
})
export class DictModule {}
