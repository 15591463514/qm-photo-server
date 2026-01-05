import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  IsBoolean,
  MaxLength,
} from 'class-validator';

/**
 * 创建通知规则 DTO
 */
export class CreateRuleDto {
  @ApiProperty({
    description: '规则名称',
    example: '图片上传成功通知',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: '规则名称不能为空' })
  @MaxLength(100, { message: '规则名称不能超过100个字符' })
  ruleName: string;

  @ApiProperty({
    description: '消息来源',
    example: 'image_upload',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '消息来源不能为空' })
  @MaxLength(50, { message: '消息来源不能超过50个字符' })
  msgSource: string;

  @ApiProperty({
    description: '消息类型',
    example: 'success',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '消息类型不能为空' })
  @MaxLength(50, { message: '消息类型不能超过50个字符' })
  msgType: string;

  @ApiProperty({
    description: '通知方式',
    example: 3,
    enum: [3],
    default: 3,
  })
  @IsInt()
  @IsIn([3], { message: '通知方式只能是 3（邮箱）' })
  noticeMode: number;

  @ApiPropertyOptional({
    description: '通知地址（邮箱地址，多个用英文分号分隔，可选，创建模板时可留空）',
    example: 'dev@example.com;test@example.com',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '通知地址不能超过500个字符' })
  noticeAddress?: string;

  @ApiPropertyOptional({
    description: '通知地址名称（主要用于企微群，邮箱通知可为空）',
    example: '',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '通知地址名称不能超过100个字符' })
  noticeAddressName?: string;

  @ApiPropertyOptional({
    description: '处理脚本（JavaScript代码）',
    example:
      'function formatContent(jsonObject) { return { subject: "通知", content: "<p>内容</p>" }; }',
  })
  @IsString()
  @IsOptional()
  handlerScript?: string;

  @ApiPropertyOptional({
    description: '入参示例（JSON格式，用于测试时自动填充）',
    example: '{\n  "code": "123456",\n  "expireMinutes": 5\n}',
  })
  @IsString()
  @IsOptional()
  eventDataExample?: string;

  @ApiPropertyOptional({
    description: '是否开启记录（true: 记录通知信息，false: 仅发送邮件不记录）',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enableRecord?: boolean;

  @ApiPropertyOptional({
    description: '规则状态',
    example: 1,
    enum: [0, 1],
    default: 1,
  })
  @IsInt()
  @IsIn([0, 1], { message: '规则状态只能是 0（禁用）或 1（启用）' })
  @IsOptional()
  noticeStatus?: number;
}
