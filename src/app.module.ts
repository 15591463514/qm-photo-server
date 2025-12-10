import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { TestModule } from './modules/test/test.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { DictModule } from './modules/dict/dict.module';

@Module({
  imports: [
    SharedModule,
    TestModule,
    AuthModule,
    UserModule,
    RoleModule,
    DictModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
