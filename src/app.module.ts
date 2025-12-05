import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { TestModule } from './modules/test/test.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [SharedModule, TestModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
