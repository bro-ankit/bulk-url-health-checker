import { Inject } from '@nestjs/common';

import { AppLoggerService } from './logger.service';

export function InjectLogger(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Inject(AppLoggerService)(target, propertyKey);

    const initialized = new WeakSet<object>();

    Object.defineProperty(target, propertyKey, {
      configurable: true,
      enumerable: true,
      get(this: object) {
        return undefined;
      },
      set(this: object, value: AppLoggerService) {
        if (!initialized.has(this)) {
          value.setContext(this.constructor.name);
          initialized.add(this);
        }

        Object.defineProperty(this, propertyKey, {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      },
    });
  };
}
