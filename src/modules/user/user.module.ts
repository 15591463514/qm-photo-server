import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '@/modules/auth/auth.module';
import { MenuModule } from '@/modules/menu/menu.module';

/**
 * 用户模块
 */
@Module({
  imports: [forwardRef(() => AuthModule), MenuModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
