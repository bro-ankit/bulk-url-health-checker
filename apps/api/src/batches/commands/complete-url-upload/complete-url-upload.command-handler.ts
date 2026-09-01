import type { ICommandHandler } from '@nestjs/cqrs';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import type { AppLoggerService } from '@bulk-url-health-checker/shared-contracts';
import { InjectLogger } from '@bulk-url-health-checker/shared-contracts';
import { CreateBatchService } from '../../services/create-batch.service';
import { CreateBatchResponseDto } from '../../dto/create-batch-response.dto';
import { STORAGE_CLIENT } from '../../../storage/storage.constants';
import type { IStorageClient } from '../../../storage/storage.interface';
import { CsvUrlParserUtil } from '../../utils/csv/csv-url-parser.util';
import { CompleteUrlUploadCommand } from './complete-url-upload.command';
import { plainToInstance } from 'class-transformer';

@CommandHandler(CompleteUrlUploadCommand)
export class CompleteUrlUploadCommandHandler implements ICommandHandler<
  CompleteUrlUploadCommand,
  CreateBatchResponseDto
> {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(
    @Inject(STORAGE_CLIENT) private readonly storageClient: IStorageClient,
    private readonly createBatchService: CreateBatchService,
  ) {}

  async execute(command: CompleteUrlUploadCommand): Promise<CreateBatchResponseDto> {
    this.logger.info({ objectKey: command.objectKey }, 'Executing CompleteUrlUploadCommand');

    const buffer = await this.storageClient.getObject(command.objectKey);
    const { urls, malformedRowCount } = await CsvUrlParserUtil.parse(buffer);

    const batchId = await this.createBatchService.createFromUrls(urls);

    return plainToInstance(CreateBatchResponseDto, {
      batchId,
      malformedRowCount,
    });
  }
}
