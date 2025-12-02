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
 * 响应转换拦截器
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果响应已经是统一格式，直接返回
        if (data && typeof data === 'object' && 'code' in data) {
          return data;
        }

        const response = context.switchToHttp().getResponse();
        response.header('Content-Type', 'application/json; charset=utf-8');
        return ResOp.success(data);
      }),
    );
  }
}
