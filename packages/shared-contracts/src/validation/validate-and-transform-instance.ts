import type { ClassConstructor } from 'class-transformer';
import { plainToInstance } from 'class-transformer';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';

function getDeepValidationError(
  error: ValidationError,
  path: string[] = [],
): { propertyPath: string; constraint: string } {
  if (error.children && error.children.length > 0) {
    return getDeepValidationError(error.children[0], [...path, error.property]);
  }

  const propertyPath = [...path, error.property].filter(Boolean).join(' -> ');
  const constraintMessages = error.constraints ? Object.values(error.constraints) : ['Unknown validation error'];

  return {
    propertyPath,
    constraint: constraintMessages[0],
  };
}

export async function validateAndTransformInstance<T extends object>(
  clazz: ClassConstructor<T>,
  value: object,
): Promise<T>;
export async function validateAndTransformInstance<T extends object>(
  clazz: ClassConstructor<T>,
  value: object[],
): Promise<T[]>;

export async function validateAndTransformInstance<T extends object>(
  clazz: ClassConstructor<T>,
  value: object | object[],
): Promise<T | T[]> {
  const instances = plainToInstance(clazz, value, { excludeExtraneousValues: true });
  const items = Array.isArray(instances) ? instances : [instances];

  const validationResults = await Promise.all(items.map((item) => validate(item)));

  for (let i = 0; i < validationResults.length; i++) {
    const errors = validationResults[i];
    if (errors.length > 0) {
      const deepError = getDeepValidationError(errors[0]);

      throw new Error(
        `Validation failed${Array.isArray(value) ? ` at index ${i}` : ''} for property ${deepError.propertyPath}: ${deepError.constraint}`,
      );
    }
  }

  return instances;
}
