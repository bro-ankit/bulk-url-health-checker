import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook as rtlRenderHook } from '@testing-library/react';
import { createElement } from 'react';

import { MOCK_QUERY_CLIENT } from './mock-query-client';

type QueryMock = {
  key: readonly unknown[];
  data: unknown;
};

const createWrapper = (queryMocks: QueryMock[]) => {
  MOCK_QUERY_CLIENT.clear();

  queryMocks.forEach(({ key, data }) => {
    MOCK_QUERY_CLIENT.setQueryData(key, data);
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: MOCK_QUERY_CLIENT }, children);
  Wrapper.displayName = 'RenderHookQueryClientWrapper';

  return Wrapper;
};

export const renderHook = <T>(hook: () => T, options: { queryMocks?: QueryMock[] } = {}) => {
  const { queryMocks = [] } = options;
  const wrapper = createWrapper(queryMocks);
  return rtlRenderHook(hook, { wrapper });
};
