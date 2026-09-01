import { act, waitFor } from '@testing-library/react';

import { mockBatchDto, mockUrlCheckResultDto } from '@/__mocks__';
import { getBatchesControllerGetOneQueryKey, getBatchesControllerGetUrlsQueryKey } from '@/lib/__generated__/api';
import { MOCK_QUERY_CLIENT, renderHook } from '@/utils/test-utils';

import { useBatchDetail } from './use-batch-detail';

const BATCH_ID = 'batch-1';
const PAGE = 1;
const PAGE_SIZE = 50;

const BATCH = mockBatchDto({ id: BATCH_ID, status: 'running' });
const QUEUED_URL = mockUrlCheckResultDto({
  id: 'url-1',
  status: 'queued',
  httpStatusCode: null,
  responseTimeMs: null,
  pageTitle: null,
});
const URLS_QUERY_KEY = getBatchesControllerGetUrlsQueryKey(BATCH_ID, { page: PAGE, pageSize: PAGE_SIZE });

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  private listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void): void {
    (this.listeners[type] ??= []).push(handler);
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((existing) => existing !== handler);
  }

  close(): void {}

  emit(type: string, data: unknown): void {
    this.listeners[type]?.forEach((handler) => handler({ data: JSON.stringify(data) } as MessageEvent));
  }
}

describe('Given useBatchDetail', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', FakeEventSource);
    FakeEventSource.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('When a live SSE update marks a url succeeded, and a slower reconnect resync then reports that same url as still queued', () => {
    test('Then the row stays succeeded, the resync is not allowed to regress an already-terminal row', async () => {
      const { result } = renderHook(() => useBatchDetail({ batchId: BATCH_ID }), {
        queryMocks: [
          { key: getBatchesControllerGetOneQueryKey(BATCH_ID), data: BATCH },
          { key: URLS_QUERY_KEY, data: { urls: [QUEUED_URL], total: 1, page: PAGE, pageSize: PAGE_SIZE } },
        ],
      });

      const source = FakeEventSource.instances[0];

      act(() => {
        source.emit('update', { url: { ...QUEUED_URL, status: 'succeeded', httpStatusCode: 200, responseTimeMs: 80 } });
      });

      await waitFor(() => {
        expect(result.current.urls[0].status).toBe('succeeded');
      });

      MOCK_QUERY_CLIENT.setQueryData(URLS_QUERY_KEY, { urls: [QUEUED_URL], total: 1, page: PAGE, pageSize: PAGE_SIZE });

      act(() => {
        source.onopen?.();
      });

      await waitFor(() => {
        expect(result.current.urls[0].status).toBe('succeeded');
      });
    });
  });
});
