import { act } from '@testing-library/react';

import { mockBatchDto } from '@/__mocks__';
import { getBatchesControllerListInfiniteQueryKey } from '@/lib/__generated__/api';
import { renderHook } from '@/utils/test-utils';

import { useBatchesGrid } from './use-batches-grid';

const FIRST_PAGE_BATCHES = [mockBatchDto({ id: 'batch-1' }), mockBatchDto({ id: 'batch-2' })];

const QUERY_MOCKS = [
  {
    key: getBatchesControllerListInfiniteQueryKey(undefined),
    data: {
      pages: [{ batches: FIRST_PAGE_BATCHES, nextCursor: 'cursor-2' }],
      pageParams: [undefined],
    },
  },
];

describe('Given useBatchesGrid', () => {
  describe('When rendered', () => {
    test('Then it flattens the cached pages into a single batches array and reports another page is available', () => {
      const { result } = renderHook(() => useBatchesGrid(), { queryMocks: QUERY_MOCKS });

      expect(result.current.batches).toStrictEqual(FIRST_PAGE_BATCHES);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('When there is no next page', () => {
    test('Then hasMore is false', () => {
      const { result } = renderHook(() => useBatchesGrid(), {
        queryMocks: [
          {
            key: getBatchesControllerListInfiniteQueryKey(undefined),
            data: { pages: [{ batches: FIRST_PAGE_BATCHES, nextCursor: null }], pageParams: [undefined] },
          },
        ],
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('When onAddNewBatchClick is called', () => {
    test('Then it opens the create-batch modal', () => {
      const { result } = renderHook(() => useBatchesGrid(), { queryMocks: QUERY_MOCKS });

      expect(result.current.isCreateModalOpen).toBe(false);

      act(() => {
        result.current.onAddNewBatchClick();
      });

      expect(result.current.isCreateModalOpen).toBe(true);
    });
  });

  describe('When onCloseCreateModal is called', () => {
    test('Then it closes the create-batch modal', () => {
      const { result } = renderHook(() => useBatchesGrid(), { queryMocks: QUERY_MOCKS });

      act(() => {
        result.current.onAddNewBatchClick();
      });
      act(() => {
        result.current.onCloseCreateModal();
      });

      expect(result.current.isCreateModalOpen).toBe(false);
    });
  });
});
