import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResOp } from '../class/api-response.class';

export interface Response<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 递归转换 BigInt 为 number
 */
function transformBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(transformBigInt);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = transformBigInt(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

/**
 * 响应转换拦截器
 */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // 转换 BigInt 为 number
        const transformedData = transformBigInt(data);

        // 如果响应已经是统一格式，直接返回
        if (
          transformedData &&
          typeof transformedData === 'object' &&
          'code' in transformedData
        ) {
          return transformedData;
        }

        const response = context.switchToHttp().getResponse();
        response.header('Content-Type', 'application/json; charset=utf-8');
        return ResOp.success(transformedData);
      }),
    );
  }
}
