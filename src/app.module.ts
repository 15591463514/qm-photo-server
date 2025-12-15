import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { TestModule } from './modules/test/test.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { DictModule } from './modules/dict/dict.module';
import { MenuModule } from './modules/menu/menu.module';
import { winstonConfig } from './common/logger/winston.config';

@Module({
  imports: [
    // Winston 日志模块
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
        const logLevel = configService.get<string>('app.logLevel', 'info');
        return winstonConfig(nodeEnv, logLevel);
      },
    }),
    SharedModule,
    TestModule,
    AuthModule,
    UserModule,
    RoleModule,
    DictModule,
    MenuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
