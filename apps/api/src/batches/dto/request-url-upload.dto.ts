import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RequestUrlUploadRequestDto {
  @ApiProperty()
  @IsString()
  filename!: string;
}

export class RequestUrlUploadResponseDto {
  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty({ type: Object })
  uploadFields!: Record<string, string>;

  @ApiProperty()
  objectKey!: string;
}
