import type { StoryFn } from '@storybook/react';

import { mockBatchDto, mockUrlCheckResultDto } from '@/__mocks__';

import type { BatchDetailViewProps } from './batch-detail.types';
import { BatchDetailView } from './batch-detail-view';

export default {
  title: 'Pages/Batches/Detail',
  component: BatchDetailView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/batches/batch-1' },
    },
  },
};

const Template: StoryFn<BatchDetailViewProps> = (args) => <BatchDetailView {...args} />;

export const Running = Template.bind({});
Running.args = {
  batch: mockBatchDto({ status: 'running', succeededCount: 6, failedCount: 1, totalCount: 10 }),
  urls: [
    mockUrlCheckResultDto({ id: 'url-1', url: 'https://example.com', status: 'succeeded' }),
    mockUrlCheckResultDto({
      id: 'url-2',
      url: 'https://broken.example.com',
      status: 'failed',
      httpStatusCode: null,
      responseTimeMs: null,
      pageTitle: null,
      errorMessage: 'connection timed out',
    }),
    mockUrlCheckResultDto({
      id: 'url-3',
      url: 'https://queued.example.com',
      status: 'queued',
      httpStatusCode: null,
      responseTimeMs: null,
      pageTitle: null,
    }),
  ],
  page: 1,
  pageSize: 50,
  total: 10,
  isFetchingUrls: false,
  goToPage: () => undefined,
  onCancel: async () => undefined,
  onRetryFailed: async () => undefined,
  isCancelling: false,
  isRetrying: false,
};

export const NotFound = Template.bind({});
NotFound.args = {
  ...Running.args,
  batch: undefined,
};

export const Completed = Template.bind({});
Completed.args = {
  ...Running.args,
  batch: mockBatchDto({ status: 'completed', succeededCount: 9, failedCount: 1, totalCount: 10 }),
};
