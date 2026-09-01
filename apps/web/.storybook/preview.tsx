import type { Preview } from '@storybook/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { MOCK_QUERY_CLIENT } from '../src/utils/test-utils/mock-query-client';

import '../src/app/globals.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story, { parameters }) => {
      MOCK_QUERY_CLIENT.clear();

      if (parameters.queryData && Array.isArray(parameters.queryData)) {
        parameters.queryData.forEach(({ key, data }: { key: readonly unknown[]; data: unknown }) => {
          MOCK_QUERY_CLIENT.setQueryData(key as unknown[], data);
        });
      }

      return (
        <QueryClientProvider client={MOCK_QUERY_CLIENT}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;
