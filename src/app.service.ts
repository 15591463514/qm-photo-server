import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    return `Hello World! 当前环境: ${nodeEnv}, 测试字符串: test prod`;
  }
}
