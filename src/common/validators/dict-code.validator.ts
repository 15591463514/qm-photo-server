import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * 验证字典编码格式
 * 规则：只能包含小写字母和下划线，开头和结尾不能是下划线
 */
@ValidatorConstraint({ name: 'isDictCode', async: false })
export class IsDictCodeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // 如果值为空（null、undefined、空字符串），且字段是可选的，则跳过验证
    // 这个逻辑由 @IsOptional() 装饰器处理，这里只验证非空值
    if (value === null || value === undefined || value === '') {
      return true; // 空值由 @IsOptional() 或 @IsNotEmpty() 处理
    }

    if (typeof value !== 'string') {
      return false;
    }

    // 只能包含小写字母和下划线
    if (!/^[a-z_]+$/.test(value)) {
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
    return `${fieldName}只能包含小写字母和下划线，且不能以下划线开头或结尾`;
  }
}

/**
 * 验证字典值格式
 * 规则：只能包含小写字母、数字和下划线，开头和结尾不能是下划线
 */
@ValidatorConstraint({ name: 'isDictValue', async: false })
export class IsDictValueConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // 如果值为空（null、undefined、空字符串），且字段是可选的，则跳过验证
    // 这个逻辑由 @IsOptional() 装饰器处理，这里只验证非空值
    if (value === null || value === undefined || value === '') {
      return true; // 空值由 @IsOptional() 或 @IsNotEmpty() 处理
    }

    if (typeof value !== 'string') {
      return false;
    }

    // 只能包含小写字母、数字和下划线
    if (!/^[a-z0-9_]+$/.test(value)) {
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
    return `${fieldName}只能包含小写字母、数字和下划线，且不能以下划线开头或结尾`;
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
  return function (object: Object, propertyName: string) {
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
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDictValueConstraint,
    });
  };
}
