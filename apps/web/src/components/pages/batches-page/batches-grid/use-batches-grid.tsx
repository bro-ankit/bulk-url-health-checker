import { useState } from 'react';

import { useBatchesControllerListInfinite } from '@/lib/__generated__/api';

import type { UseBatchesGrid } from './batches-grid.types';

export const useBatchesGrid: UseBatchesGrid = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useBatchesControllerListInfinite(undefined, {
    query: {
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  });

  const loadMore = () => {
    fetchNextPage();
  };

  return {
    batches: data?.pages.flatMap((page) => page.batches) ?? [],
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMore,
    isCreateModalOpen,
    onAddNewBatchClick: () => setIsCreateModalOpen(true),
    onCloseCreateModal: () => setIsCreateModalOpen(false),
  };
};
