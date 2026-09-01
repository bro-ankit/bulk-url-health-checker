import type { ICommandHandler } from '@nestjs/cqrs';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AppLoggerService } from '@bulk-url-health-checker/shared-contracts';
import { InjectLogger } from '@bulk-url-health-checker/shared-contracts';
import { STORAGE_CLIENT } from '../../../storage/storage.constants';
import type { IStorageClient } from '../../../storage/storage.interface';
import type { RequestUrlUploadResponseDto } from '../../dto/request-url-upload.dto';
import { REQUEST_CSV_UPLOAD_DEFAULTS } from './request-url-upload.constants';
import { RequestUrlUploadCommand } from './request-url-upload.command';

@CommandHandler(RequestUrlUploadCommand)
export class RequestUrlUploadCommandHandler implements ICommandHandler<
  RequestUrlUploadCommand,
  RequestUrlUploadResponseDto
> {
  @InjectLogger() private readonly logger!: AppLoggerService;

  constructor(@Inject(STORAGE_CLIENT) private readonly storageClient: IStorageClient) {}

  async execute(command: RequestUrlUploadCommand): Promise<RequestUrlUploadResponseDto> {
    this.logger.info({ filename: command.filename }, 'Executing RequestUrlUploadCommand');

    const objectKey = `batch-csv-uploads/${randomUUID()}-${command.filename}`;

    const { url: uploadUrl, fields: uploadFields } = await this.storageClient.getPresignedUploadUrl(
      objectKey,
      REQUEST_CSV_UPLOAD_DEFAULTS.MIME_TYPE,
      REQUEST_CSV_UPLOAD_DEFAULTS.MAX_SIZE_BYTES,
    );

    return { uploadUrl, uploadFields, objectKey };
  }
}
