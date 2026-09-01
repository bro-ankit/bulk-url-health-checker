/// <reference types="vite/client"/>

import { composeStories } from '@storybook/react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import path, { join } from 'path';
import { createElement } from 'react';

import { MOCK_QUERY_CLIENT } from './utils/test-utils/mock-query-client';

type CSFModule = Parameters<typeof composeStories>[0];

const storyModules = import.meta.glob('./**/*.stories.tsx', { eager: true }) as Record<string, CSFModule>;

const testDir = join(process.cwd(), 'src');

const kebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

describe('Storyshots', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  Object.entries(storyModules).forEach(([filePath, module]) => {
    const stories = composeStories(module);

    describe(filePath, () => {
      Object.entries(stories).forEach(([storyName, Story]) => {
        test(storyName, async () => {
          let container: HTMLElement;

          act(() => {
            const wrapper = render(
              createElement(
                QueryClientProvider,
                { client: MOCK_QUERY_CLIENT },
                createElement(Story as React.ComponentType),
              ),
            );
            container = wrapper.container;
          });

          const snapshotPath = path.join(
            testDir,
            path.dirname(filePath),
            '__snapshots__',
            `${path.basename(filePath, '.tsx')}.${kebabCase(storyName)}.snap`,
          );

          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
          });

          await waitFor(async () => {
            expect(container).toBeTruthy();
            await expect(container).toMatchFileSnapshot(snapshotPath);
          });
        });
      });
    });
  });
});
