import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUrl } from 'class-validator';

import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';

export class CreateBatchFromUrlsRequestDto {
  @ApiProperty({
    type: [String],
    description: 'URLs to check, one batch = one BullMQ job per URL',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BATCH_CONSTANTS.MAX_URLS_PER_BATCH)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  urls!: string[];
}
