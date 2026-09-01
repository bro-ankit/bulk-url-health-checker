import type { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ENV_VARIABLES } from '../../constants/env.constants';
import { InjectLogger } from '@bulk-url-health-checker/shared-contracts';
import type { AppLoggerService } from '@bulk-url-health-checker/shared-contracts';
import type { IStorageClient, PresignedUpload } from '../storage.interface';
import { S3_CLIENT, S3_STORAGE_DEFAULTS } from './s3.constants';

@Injectable()
export class S3StorageClient implements IStorageClient {
  @InjectLogger() private readonly logger!: AppLoggerService;

  private readonly bucketName: string;
  private readonly publicEndpoint: string;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    config: ConfigService,
  ) {
    this.bucketName = config.getOrThrow<string>(ENV_VARIABLES.S3.BUCKET_NAME);
    this.publicEndpoint =
      config.get<string>(ENV_VARIABLES.S3.PUBLIC_ENDPOINT) ?? config.getOrThrow<string>(ENV_VARIABLES.S3.ENDPOINT);
  }

  async getPresignedUploadUrl(key: string, mimeType: string, maxSizeBytes: number): Promise<PresignedUpload> {
    this.logger.debug({ key, mimeType, maxSizeBytes }, 'Generating presigned upload post');
    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucketName,
      Key: key,
      Conditions: [['content-length-range', 0, maxSizeBytes], { 'Content-Type': mimeType }],
      Fields: { 'Content-Type': mimeType },
      Expires: S3_STORAGE_DEFAULTS.PRESIGNED_UPLOAD_URL_EXPIRY_SECONDS,
    });
    return { url: this.toPublicUrl(url), fields };
  }

  private toPublicUrl(url: string): string {
    const publicOrigin = new URL(this.publicEndpoint);
    const rewritten = new URL(url);
    rewritten.protocol = publicOrigin.protocol;
    rewritten.host = publicOrigin.host;
    return rewritten.toString();
  }

  async getObject(key: string): Promise<Buffer> {
    this.logger.debug({ key }, 'Fetching object from S3');
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }
}
