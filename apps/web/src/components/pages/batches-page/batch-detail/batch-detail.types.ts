import type { BatchDto, UrlCheckResultDto } from '@/lib/__generated__/api';

export type BatchDetailProps = {
  batchId: string;
};

export type UseBatchDetail = (props: BatchDetailProps) => {
  batch: BatchDto | undefined;
  urls: UrlCheckResultDto[];
  page: number;
  pageSize: number;
  total: number;
  isFetchingUrls: boolean;
  goToPage: (page: number) => void;
  onCancel: () => Promise<void>;
  onRetryFailed: () => Promise<void>;
  isCancelling: boolean;
  isRetrying: boolean;
};

export type BatchDetailViewProps = ReturnType<UseBatchDetail>;
