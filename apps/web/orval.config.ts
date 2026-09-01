import { defineConfig } from 'orval';

export default defineConfig({
  bulkUrlHealthCheckerApi: {
    input: {
      target: 'http://localhost:3000/api/docs-json',
    },
    output: {
      mode: 'single',
      target: './src/lib/__generated__/api.ts',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        useTypeOverInterfaces: true,
        mutator: {
          path: './src/lib/axios-instance.ts',
          name: 'customInstance',
        },
        operations: {
          BatchesController_list: {
            query: {
              useInfinite: true,
              useInfiniteQueryParam: 'cursor',
            },
          },
        },
      },
    },
  },
});
