import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleStoreService } from './role.store';

/**
 * 角色模块
 */
@Module({
  controllers: [RoleController],
  providers: [RoleService, RoleStoreService],
  exports: [RoleService, RoleStoreService],
})
export class RoleModule {}
