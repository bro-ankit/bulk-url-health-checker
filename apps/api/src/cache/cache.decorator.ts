import { SetMetadata } from '@nestjs/common';

import type { Milliseconds } from './cache.constants';

export const CACHE_DECORATOR_KEY = Symbol('CACHE_DECORATOR');

export type CacheOptions<TArgs extends unknown[] = unknown[]> = {
  key: string | ((...args: TArgs) => string);
  ttl?: Milliseconds;
};

export function Cache<TMethod extends (...args: never) => unknown>(
  options: CacheOptions<Parameters<TMethod>>,
): (
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<TMethod>,
) => TypedPropertyDescriptor<TMethod> {
  return (target, propertyKey, descriptor) => {
    SetMetadata(CACHE_DECORATOR_KEY, options)(target, propertyKey, descriptor as PropertyDescriptor);
    return descriptor;
  };
}
