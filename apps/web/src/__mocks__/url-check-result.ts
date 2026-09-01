import type { UrlCheckResultDto } from '@/lib/__generated__/api';

export const mockUrlCheckResultDto = (args: Partial<UrlCheckResultDto> = {}): UrlCheckResultDto => ({
  id: 'url-1',
  url: 'https://example.com',
  status: 'succeeded',
  httpStatusCode: 200,
  responseTimeMs: 120,
  pageTitle: 'Example',
  errorMessage: null,
  ...args,
});
