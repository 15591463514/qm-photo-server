import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SchemaPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return plainToInstance(metadata.metatype, value);
  }
}
