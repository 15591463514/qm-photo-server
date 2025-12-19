import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * 验证字典编码格式
 * 规则：只能包含小写字母、数字、短横线和下划线，开头和结尾不能是下划线
 */
@ValidatorConstraint({ name: 'isDictCode', async: false })
export class IsDictCodeConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    // 如果值为空（null、undefined、空字符串），且字段是可选的，则跳过验证
    // 这个逻辑由 @IsOptional() 装饰器处理，这里只验证非空值
    if (value === null || value === undefined || value === '') {
      return true; // 空值由 @IsOptional() 或 @IsNotEmpty() 处理
    }

    if (typeof value !== 'string') {
      return false;
    }

    // 只能包含小写字母、数字、短横线和下划线
    if (!/^[a-z0-9_-]+$/.test(value)) {
      return false;
    }

    // 开头不能是下划线
    if (value.startsWith('_')) {
      return false;
    }

    // 结尾不能是下划线
    if (value.endsWith('_')) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const fieldName = args.property;
    return `${fieldName}只能包含字母、短横线、下划线和数字，且不能以下划线开头或结尾`;
  }
}

/**
 * 验证字典值格式
 * 规则：只能包含小写字母、数字、短横线和下划线，开头和结尾不能是下划线
 */
@ValidatorConstraint({ name: 'isDictValue', async: false })
export class IsDictValueConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    // 如果值为空（null、undefined、空字符串），且字段是可选的，则跳过验证
    // 这个逻辑由 @IsOptional() 装饰器处理，这里只验证非空值
    if (value === null || value === undefined || value === '') {
      return true; // 空值由 @IsOptional() 或 @IsNotEmpty() 处理
    }

    if (typeof value !== 'string') {
      return false;
    }

    // 只能包含小写字母、数字、短横线和下划线
    if (!/^[a-z0-9_-]+$/.test(value)) {
      return false;
    }

    // 开头不能是下划线
    if (value.startsWith('_')) {
      return false;
    }

    // 结尾不能是下划线
    if (value.endsWith('_')) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const fieldName = args.property;
    return `${fieldName}只能包含字母、短横线、下划线和数字，且不能以下划线开头或结尾`;
  }
}

/**
 * 验证字典类型名称/字典标签格式
 * 规则：不可输入特殊字符和emoji，最大16字符
 */
@ValidatorConstraint({ name: 'isDictName', async: false })
export class IsDictNameConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (value === null || value === undefined || value === '') {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    // 检查长度
    if (value.length > 16) {
      return false;
    }

    // 不允许特殊字符和emoji（允许中文、字母、数字、空格、常用标点）
    // 使用 Unicode 范围来检测 emoji 和特殊字符
    const noSpecialCharsOrEmojiRegex =
      /^[\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：""''（）【】《》.,!?;:()\[\]<>-]+$/;
    if (!noSpecialCharsOrEmojiRegex.test(value)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const fieldName = args.property;
    return `${fieldName}不能包含特殊字符和emoji，且不能超过16个字符`;
  }
}

/**
 * 字典编码格式验证装饰器
 * 用于验证字段是否符合字典编码格式：只能包含小写字母和下划线，开头和结尾不能是下划线
 *
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * class CreateDictDto {
 *   @IsDictCode({ message: '字典类型编码格式不正确' })
 *   typeCode: string;
 * }
 * ```
 */
export function IsDictCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDictCodeConstraint,
    });
  };
}

/**
 * 字典值格式验证装饰器
 * 用于验证字段是否符合字典值格式：只能包含小写字母、数字和下划线，开头和结尾不能是下划线
 *
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * class CreateDictDto {
 *   @IsDictValue({ message: '字典值格式不正确' })
 *   dataValue: string;
 * }
 * ```
 */
export function IsDictValue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDictValueConstraint,
    });
  };
}

/**
 * 字典类型名称/字典标签格式验证装饰器
 * 用于验证字段是否符合字典名称格式：不可输入特殊字符和emoji，最大16字符
 *
 * @param validationOptions 验证选项
 * @returns 装饰器函数
 */
export function IsDictName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDictNameConstraint,
    });
  };
}
