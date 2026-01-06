import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 验证验证码 DTO
 */
export class VerifyCaptchaDto {
  @ApiProperty({
    description: '验证码ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: '验证码ID不能为空' })
  captchaId: string;

  @ApiProperty({
    description: '验证码文本',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  captchaText: string;
}

