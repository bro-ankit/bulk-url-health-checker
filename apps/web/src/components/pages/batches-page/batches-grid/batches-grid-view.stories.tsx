import type { StoryFn } from '@storybook/react';

import { mockBatchDto } from '@/__mocks__';

import type { BatchesGridViewProps } from './batches-grid.types';
import { BatchesGridView } from './batches-grid-view';

export default {
  title: 'Pages/Batches/Grid',
  component: BatchesGridView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/batches' },
    },
  },
};

const Template: StoryFn<BatchesGridViewProps> = (args) => <BatchesGridView {...args} />;

export const BatchesGrid = Template.bind({});
BatchesGrid.args = {
  batches: [
    mockBatchDto({ id: 'batch-1', name: 'brave-tiger-a1b2c3', status: 'running' }),
    mockBatchDto({ id: 'batch-2', name: 'quiet-otter-9f8e7d', status: 'completed', succeededCount: 9, failedCount: 1 }),
    mockBatchDto({ id: 'batch-3', name: 'lucky-panda-3c2b1a', status: 'cancelled', succeededCount: 4, failedCount: 0 }),
  ],
  hasMore: true,
  isLoadingMore: false,
  loadMore: () => undefined,
  isCreateModalOpen: false,
  onAddNewBatchClick: () => undefined,
  onCloseCreateModal: () => undefined,
};

export const Empty = Template.bind({});
Empty.args = {
  ...BatchesGrid.args,
  batches: [],
  hasMore: false,
};

export const CreateModalOpen = Template.bind({});
CreateModalOpen.args = {
  ...BatchesGrid.args,
  isCreateModalOpen: true,
};
