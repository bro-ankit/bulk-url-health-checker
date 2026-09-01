import 'reflect-metadata';
import { randomUUID, UUID } from 'node:crypto';

import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';

import { validateAndTransformInstance } from '../../src/validation/validate-and-transform-instance';

class NestedTestDto {
  @Expose()
  @IsUUID()
  id!: UUID;
}

class TestDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Expose()
  @Type(() => NestedTestDto)
  @ValidateNested()
  nested!: NestedTestDto;
}

const buildExpectedInstance = (name: string, nestedId: UUID): TestDto => {
  const nested = Object.assign(new NestedTestDto(), { id: nestedId });
  return Object.assign(new TestDto(), { name, nested });
};

describe('Given validateAndTransformInstance', () => {
  describe('When called with a single valid object', () => {
    test('Then it returns a transformed, validated instance of the class', async () => {
      const nestedId = randomUUID();
      const input = { name: 'batch-name', nested: { id: nestedId } };

      const result = await validateAndTransformInstance(TestDto, input);

      expect(result).toStrictEqual(buildExpectedInstance('batch-name', nestedId));
    });
  });

  describe('When called with an array of valid objects', () => {
    test('Then it returns a transformed, validated instance for each item, in order', async () => {
      const firstId = randomUUID();
      const secondId = randomUUID();
      const input = [
        { name: 'first', nested: { id: firstId } },
        { name: 'second', nested: { id: secondId } },
      ];

      const result = await validateAndTransformInstance(TestDto, input);

      expect(result).toStrictEqual([
        buildExpectedInstance('first', firstId),
        buildExpectedInstance('second', secondId),
      ]);
    });
  });

  describe('When called with a single object failing validation', () => {
    test('Then it throws an error naming the failing property and constraint, without an index', async () => {
      const input = { name: 'batch-name', nested: { id: 'not-a-uuid' } };

      await expect(validateAndTransformInstance(TestDto, input)).rejects.toThrow(
        'Validation failed for property nested -> id: id must be a UUID',
      );
    });
  });

  describe('When called with an array where one item fails validation', () => {
    test('Then it throws an error naming the failing index, property, and constraint', async () => {
      const input = [
        { name: 'first', nested: { id: randomUUID() } },
        { name: 'second', nested: { id: 'not-a-uuid' } },
      ];

      await expect(validateAndTransformInstance(TestDto, input)).rejects.toThrow(
        'Validation failed at index 1 for property nested -> id: id must be a UUID',
      );
    });
  });

  describe('When called with an object missing a required field entirely', () => {
    test('Then it throws an error for the missing top-level property', async () => {
      const input = { nested: { id: randomUUID() } };

      await expect(validateAndTransformInstance(TestDto, input)).rejects.toThrow(
        'Validation failed for property name: name should not be empty',
      );
    });
  });
});
