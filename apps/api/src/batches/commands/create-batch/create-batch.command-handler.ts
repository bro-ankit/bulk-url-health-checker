import type { ICommandHandler } from '@nestjs/cqrs';
import { CommandHandler } from '@nestjs/cqrs';
import type { AppLoggerService } from '@bulk-url-health-checker/shared-contracts';
import { InjectLogger } from '@bulk-url-health-checker/shared-contracts';

import { CreateBatchService } from '../../services/create-batch.service';
import { CreateBatchResponseDto } from '../../dto/create-batch-response.dto';
import { CreateBatchCommand } from './create-batch.command';
import { plainToInstance } from 'class-transformer';

@CommandHandler(CreateBatchCommand)
export class CreateBatchCommandHandler implements ICommandHandler<CreateBatchCommand, CreateBatchResponseDto> {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(private readonly createBatchService: CreateBatchService) {}

  async execute(command: CreateBatchCommand): Promise<CreateBatchResponseDto> {
    this.logger.info({ urlCount: command.urls.length }, 'Executing CreateBatchCommand');

    const batchId = await this.createBatchService.createFromUrls(command.urls);

    return plainToInstance(CreateBatchResponseDto, { batchId }, { excludeExtraneousValues: true });
  }
}
