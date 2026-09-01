import type { AppLoggerService } from '@bulk-url-health-checker/shared-contracts';

export const mockLoggerService = (): AppLoggerService => {
  const logger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setContext: vi.fn(),
  };
  logger.setContext.mockReturnValue(logger);

  return logger as unknown as AppLoggerService;
};
