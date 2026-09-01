import 'reflect-metadata';
import { PROPERTY_DEPS_METADATA } from '@nestjs/common/constants';

import { InjectLogger } from '../../src/logger/inject-logger.decorator';
import { AppLoggerService } from '../../src/logger/logger.service';

class ServiceWithInjectedLogger {
  @InjectLogger() logger!: AppLoggerService;
}

const buildLoggerDouble = (): AppLoggerService => ({ setContext: vi.fn() }) as unknown as AppLoggerService;

describe('Given InjectLogger', () => {
  describe('When applied to a class property', () => {
    test('Then it registers that property as a Nest DI dependency on AppLoggerService', () => {
      const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, ServiceWithInjectedLogger) as {
        key: string;
        type: unknown;
      }[];

      expect(properties).toStrictEqual([{ key: 'logger', type: AppLoggerService }]);
    });
  });

  describe('When the property is read before Nest has injected anything', () => {
    test('Then it returns undefined rather than throwing', () => {
      const instance = new ServiceWithInjectedLogger();

      expect(instance.logger).toBeUndefined();
    });
  });

  describe('When the injected logger is assigned', () => {
    test('Then it sets the context to the owning class name exactly once, and the property then reads back that logger', () => {
      const instance = new ServiceWithInjectedLogger();
      const logger = buildLoggerDouble();

      instance.logger = logger;

      expect(logger.setContext).toHaveBeenCalledTimes(1);
      expect(logger.setContext).toHaveBeenCalledWith('ServiceWithInjectedLogger');
      expect(instance.logger).toBe(logger);
    });
  });

  describe('When two different instances of the same class each receive their own logger', () => {
    test('Then each instance calls setContext independently, with its own class name and its own logger', () => {
      const firstInstance = new ServiceWithInjectedLogger();
      const secondInstance = new ServiceWithInjectedLogger();
      const firstLogger = buildLoggerDouble();
      const secondLogger = buildLoggerDouble();

      firstInstance.logger = firstLogger;
      secondInstance.logger = secondLogger;

      expect(firstLogger.setContext).toHaveBeenCalledTimes(1);
      expect(secondLogger.setContext).toHaveBeenCalledTimes(1);
      expect(firstInstance.logger).toBe(firstLogger);
      expect(secondInstance.logger).toBe(secondLogger);
    });
  });
});
