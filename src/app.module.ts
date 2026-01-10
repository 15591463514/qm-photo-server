import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { TestModule } from './modules/test/test.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { DictModule } from './modules/dict/dict.module';
import { MenuModule } from './modules/menu/menu.module';
import { NoticeModule } from './modules/notice/notice.module';
import { TagModule } from './modules/tag/tag.module';
import { AddressModule } from './modules/address/address.module';

@Module({
  imports: [
    SharedModule,
    TestModule,
    AuthModule,
    UserModule,
    RoleModule,
    DictModule,
    MenuModule,
    NoticeModule,
    TagModule,
    AddressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
