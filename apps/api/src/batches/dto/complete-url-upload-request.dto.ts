import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CompleteUrlUploadRequestDto {
  @ApiProperty()
  @IsString()
  objectKey!: string;
}
