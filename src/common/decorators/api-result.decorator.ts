import { Type, applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
  ApiResponseOptions,
} from '@nestjs/swagger';
import { ResOp } from '../class/api-response.class';

const baseTypeNames = ['String', 'Number', 'Boolean'];

/**
 * ApiResult 装饰器选项
 * 兼容 ApiResponse 的所有属性，并添加自定义选项
 */
export interface ApiResultOptions<TModel extends Type<any> = any>
  extends Partial<Omit<ApiResponseOptions, 'type' | 'schema'>> {
  /** 响应数据类型，可以是单个类型或数组类型 */
  type?: TModel | TModel[];
  /** 是否为分页响应 */
  isPage?: boolean;
  /** HTTP 状态码 */
  status?: HttpStatus;
  /** 响应示例（单个） */
  example?: any;
  /** 响应示例（多个） */
  examples?: {
    [key: string]: {
      summary: string;
      value: any;
    };
  };
}

/**
 * @description: 生成返回结果装饰器
 * 自动将响应数据包装为 ResOp 格式 { code, message, data }
 * 兼容 ApiResponse 的所有属性（description, example, examples 等）
 */
export const ApiResult = <TModel extends Type<any>>(
  options: ApiResultOptions<TModel>,
) => {
  const {
    type,
    isPage,
    status,
    description,
    example,
    examples,
    ...restOptions
  } = options;

  let dataProp = null;

  // 处理数组类型
  if (Array.isArray(type)) {
    if (isPage) {
      // 分页响应：{ items: [], meta: {} }
      dataProp = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(type[0]) },
          },
          meta: {
            type: 'object',
            properties: {
              itemCount: { type: 'number', default: 0 },
              totalItems: { type: 'number', default: 0 },
              itemsPerPage: { type: 'number', default: 0 },
              totalPages: { type: 'number', default: 0 },
              currentPage: { type: 'number', default: 0 },
            },
          },
        },
      };
    } else {
      // 普通数组响应
      dataProp = {
        type: 'array',
        items: { $ref: getSchemaPath(type[0]) },
      };
    }
  } else if (type) {
    // 处理单个类型
    if (baseTypeNames.includes(type.name)) {
      // 基础类型（String, Number, Boolean）
      dataProp = { type: type.name.toLowerCase() };
    } else {
      // 自定义类型（DTO）
      dataProp = { $ref: getSchemaPath(type) };
    }
  } else {
    // 无类型（null）
    dataProp = { type: 'null', default: null };
  }

  // 获取需要注册的模型（用于 ApiExtraModels）
  const model = Array.isArray(type) ? type[0] : type;

  // 构建完整的响应示例（如果提供了 example）
  let responseExample: any = undefined;
  if (example) {
    responseExample = {
      code: status || 200,
      message: 'success',
      data: example,
    };
  }

  // 构建完整的响应示例集合（如果提供了 examples）
  let responseExamples: { [key: string]: any } | undefined = undefined;
  if (examples) {
    responseExamples = {};
    Object.keys(examples).forEach((key) => {
      const exampleItem = examples[key];
      responseExamples![key] = {
        summary: exampleItem.summary,
        value: {
          code: status || 200,
          message: 'success',
          data: exampleItem.value,
        },
      };
    });
  }

  // 构建 schema
  const schema = {
    allOf: [
      { $ref: getSchemaPath(ResOp) },
      {
        properties: {
          data: dataProp,
        },
      },
    ],
  };

  // 应用装饰器
  const decorators = [];

  // 注册模型（如果有）
  if (model) {
    decorators.push(ApiExtraModels(ResOp, model));
  } else {
    decorators.push(ApiExtraModels(ResOp));
  }

  // 应用 ApiResponse 装饰器，传递所有兼容的属性
  decorators.push(
    ApiResponse({
      status,
      description,
      schema,
      example: responseExample,
      examples: responseExamples,
      ...restOptions, // 传递其他 ApiResponse 支持的属性
    } as ApiResponseOptions),
  );

  return applyDecorators(...decorators);
};
