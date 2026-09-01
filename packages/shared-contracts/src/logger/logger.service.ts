import type { LoggerService } from '@nestjs/common';
import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Logger } from 'pino';
import pino from 'pino';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  private static sharedRoot: Logger | null = null;
  private logger: Logger;

  constructor(private readonly configService: ConfigService) {
    if (!AppLoggerService.sharedRoot) {
      const logLevel = this.configService.get<string>('LOG_LEVEL', 'info').toLowerCase();
      const isProd = this.configService.get('NODE_ENV', 'development') === 'production';

      const transport = isProd ? undefined : pino.transport({ target: 'pino-pretty' });

      AppLoggerService.sharedRoot = pino(
        {
          level: logLevel,
          timestamp: pino.stdTimeFunctions.isoTime,
          serializers: { err: pino.stdSerializers.err },
        },
        transport,
      );
    }

    this.logger = AppLoggerService.sharedRoot;
  }

  setContext(context: string): this {
    this.logger = AppLoggerService.sharedRoot?.child({ context }) as Logger;
    return this;
  }

  info(meta: Record<string, unknown>, message: string): void {
    this.logger.info(meta, message);
  }

  log(meta: Record<string, unknown>, message: string): void {
    this.logger.info(meta, message);
  }

  debug(meta: Record<string, unknown>, message: string): void {
    this.logger.debug(meta, message);
  }

  warn(meta: Record<string, unknown>, message: string): void {
    this.logger.warn(meta, message);
  }

  error(error: unknown, message: string, meta: Record<string, unknown> = {}): void {
    this.logger.error({ err: error, ...meta }, message);
  }
}
