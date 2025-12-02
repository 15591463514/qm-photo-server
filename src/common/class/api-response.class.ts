import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResOp<T = any> {
  @ApiProperty({
    description: '响应状态码',
    example: 200,
  })
  code: number;

  @ApiProperty({
    description: '响应消息',
    example: 'success',
  })
  message: string;

  @ApiPropertyOptional({
    description: '响应数据',
  })
  data?: T;

  constructor(code: number, data: T, message = 'success') {
    this.code = code;
    this.data = data;
    this.message = message;
  }

  static success<T = any>(data: T) {
    return new ResOp(200, data, 'success');
  }

  static error(code: number, message: string) {
    return new ResOp(code, null, message);
  }
}
