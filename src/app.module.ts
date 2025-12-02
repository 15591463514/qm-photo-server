import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { TestModule } from './modules/test/test.module';

@Module({
  imports: [SharedModule, TestModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
