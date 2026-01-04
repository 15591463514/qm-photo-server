import { PartialType } from '@nestjs/swagger';
import { CreateRuleDto } from './create-rule.dto';

/**
 * 更新通知规则 DTO
 */
export class UpdateRuleDto extends PartialType(CreateRuleDto) {}

