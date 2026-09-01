import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useState } from 'react';

import {
  getBatchesControllerGetOneQueryKey,
  getBatchesControllerGetOneQueryOptions,
  getBatchesControllerGetUrlsQueryKey,
  getBatchesControllerGetUrlsQueryOptions,
  useBatchesControllerCancel,
  useBatchesControllerGetOne,
  useBatchesControllerGetUrls,
  useBatchesControllerRetryFailed,
} from '@/lib/__generated__/api';
import type { BatchDto, PaginatedUrlsResponseDto, UrlCheckResultDto } from '@/lib/__generated__/api';
import { API_PROXY_ENDPOINT } from '@/lib/api-constants';
import { DEFAULT_URL_PAGE_SIZE } from '@/lib/batch-constants';

import type { UseBatchDetail } from './batch-detail.types';

type BatchUpdateEnvelope = { batch?: BatchDto; url?: UrlCheckResultDto } & Partial<BatchDto>;

const TERMINAL_URL_STATUSES: UrlCheckResultDto['status'][] = ['succeeded', 'failed', 'cancelled'];

const mergeFetchedUrls = (current: UrlCheckResultDto[], fetched: UrlCheckResultDto[]): UrlCheckResultDto[] => {
  const fetchedById = new Map(fetched.map((url) => [url.id, url]));

  return current.map((existing) => {
    const incoming = fetchedById.get(existing.id);
    if (!incoming) return existing;
    if (TERMINAL_URL_STATUSES.includes(existing.status) && !TERMINAL_URL_STATUSES.includes(incoming.status)) {
      return existing;
    }
    return incoming;
  });
};

export const useBatchDetail: UseBatchDetail = ({ batchId }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_URL_PAGE_SIZE;

  const { data: batch } = useBatchesControllerGetOne(batchId);
  const { data: urls, isFetching: isFetchingUrls } = useBatchesControllerGetUrls(batchId, { page, pageSize });

  const { mutateAsync: cancelBatch, isPending: isCancelling } = useBatchesControllerCancel();
  const { mutateAsync: retryFailedBatch, isPending: isRetrying } = useBatchesControllerRetryFailed();

  const resyncFromServer = async () => {
    const [, freshUrls] = await Promise.all([
      queryClient.query(getBatchesControllerGetOneQueryOptions(batchId)),
      queryClient.query(getBatchesControllerGetUrlsQueryOptions(batchId, { page, pageSize })),
    ]);
    queryClient.setQueryData(
      getBatchesControllerGetUrlsQueryKey(batchId, { page, pageSize }),
      (current: PaginatedUrlsResponseDto | undefined) =>
        current ? { ...freshUrls, urls: mergeFetchedUrls(current.urls, freshUrls.urls) } : freshUrls,
    );
  };

  const onSourceOpen = useEffectEvent(() => {
    resyncFromServer();
  });

  const applyLiveUpdate = useEffectEvent((envelope: BatchUpdateEnvelope) => {
    const batchUpdate = envelope.batch ?? (envelope.status ? (envelope as BatchDto) : undefined);
    if (batchUpdate) {
      queryClient.setQueryData(getBatchesControllerGetOneQueryKey(batchId), (current: BatchDto | undefined) => ({
        ...current,
        ...batchUpdate,
      }));
    }

    if (envelope.url) {
      queryClient.setQueryData(
        getBatchesControllerGetUrlsQueryKey(batchId, { page, pageSize }),
        (current: PaginatedUrlsResponseDto | undefined) =>
          current
            ? { ...current, urls: current.urls.map((u) => (u.id === envelope.url!.id ? envelope.url! : u)) }
            : current,
      );
    }
  });

  useEffect(() => {
    const source = new EventSource(`${API_PROXY_ENDPOINT}/batches/${batchId}/events`, { withCredentials: false });

    const onUpdate = (event: MessageEvent<string>) => {
      applyLiveUpdate(JSON.parse(event.data) as BatchUpdateEnvelope);
    };

    source.addEventListener('update', onUpdate);
    source.onopen = () => {
      onSourceOpen();
    };

    return () => {
      source.removeEventListener('update', onUpdate);
      source.close();
    };
  }, [batchId]);

  const onCancel = async () => {
    await cancelBatch({ batchId });
    await resyncFromServer();
  };

  const onRetryFailed = async () => {
    await retryFailedBatch({ batchId });
    await resyncFromServer();
  };

  return {
    batch,
    urls: urls?.urls ?? [],
    page,
    pageSize,
    total: urls?.total ?? 0,
    isFetchingUrls,
    goToPage: setPage,
    onCancel,
    onRetryFailed,
    isCancelling,
    isRetrying,
  };
};
