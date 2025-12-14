import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuStoreService } from './menu.store';

@Module({
  controllers: [MenuController],
  providers: [MenuService, MenuStoreService],
  exports: [MenuService, MenuStoreService],
})
export class MenuModule {}
