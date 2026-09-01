export enum BatchStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum UrlCheckStatus {
  QUEUED = 'queued',
  CHECKING = 'checking',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export const BATCH_CONSTANTS = {
  MAX_URLS_PER_BATCH: 500,
  MAX_CSV_ROWS_SCANNED: 20_000,
  CHECK_TIMEOUT_MS: 10_000,
  MAX_TITLE_SCAN_BYTES: 65_536,
  MAX_REDIRECTS: 5,
  CHECK_QUEUE_NAME: 'check-url',
  CHECK_JOB_NAME: 'check-url',
  RATE_LIMIT_MAX: 10,
  RATE_LIMIT_DURATION_MS: 1_000,
  MAX_CONCURRENT_CHECKS: 5,
  JOB_ATTEMPTS: 3,
  JOB_BACKOFF_DELAY_MS: 2_000,
  BATCH_LIST_CACHE_KEY: 'batches:list',
  BATCH_LIST_CACHE_TTL_SECONDS: 30,
  BATCH_EVENTS_CHANNEL_PREFIX: 'batch:',
  URL_CHECK_SEMAPHORE_KEY: 'url-check-inflight',
  BATCHES_LIST_INVALIDATION_CHANNEL: 'cache:batches-list:invalidate',
  DEFAULT_URL_PAGE_SIZE: 50,
  MAX_URL_PAGE_SIZE: 200,
  DEFAULT_BATCH_PAGE_SIZE: 20,
  MAX_BATCH_PAGE_SIZE: 100,
} as const;
