import type { BatchDto } from '@/lib/__generated__/api';

export type UseBatchesGrid = () => {
  batches: BatchDto[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  isCreateModalOpen: boolean;
  onAddNewBatchClick: () => void;
  onCloseCreateModal: () => void;
};

export type BatchesGridViewProps = ReturnType<UseBatchesGrid>;
