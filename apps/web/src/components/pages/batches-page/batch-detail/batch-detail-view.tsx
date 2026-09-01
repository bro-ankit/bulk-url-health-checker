import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

import type { BatchDto, UrlCheckResultDto } from '@/lib/__generated__/api';

import type { BatchDetailViewProps } from './batch-detail.types';

const BATCH_STATUS_ICON: Record<BatchDto['status'], React.ReactNode> = {
  pending: <Clock size={18} className="text-gray-500" />,
  running: <Loader2 size={18} className="text-blue-500 animate-spin" />,
  completed: <CheckCircle2 size={18} className="text-green-600" />,
  cancelled: <XCircle size={18} className="text-red-600" />,
};

const URL_STATUS_ICON: Record<UrlCheckResultDto['status'], React.ReactNode> = {
  queued: <Clock size={14} className="text-gray-500" />,
  checking: <Loader2 size={14} className="text-blue-500 animate-spin" />,
  succeeded: <CheckCircle2 size={14} className="text-green-600" />,
  failed: <XCircle size={14} className="text-red-600" />,
  cancelled: <XCircle size={14} className="text-gray-400" />,
};

export const BatchDetailView: React.FC<BatchDetailViewProps> = ({
  batch,
  urls,
  page,
  pageSize,
  total,
  isFetchingUrls,
  goToPage,
  onCancel,
  onRetryFailed,
  isCancelling,
  isRetrying,
}) => {
  if (!batch) {
    return (
      <div className="card flex items-center gap-2 px-4 py-3 text-sm text-gray-600">
        <AlertCircle size={16} />
        Batch not found or still loading.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canCancel = batch.status === 'pending' || batch.status === 'running';
  const canRetryFailed = batch.failedCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold inline-flex items-center gap-2">
            {BATCH_STATUS_ICON[batch.status]}
            {batch.name}
          </h1>
          <div className="flex gap-2">
            <button type="button" onClick={() => void onCancel()} disabled={!canCancel || isCancelling} className="btn">
              Cancel batch
            </button>
            <button
              type="button"
              onClick={() => void onRetryFailed()}
              disabled={!canRetryFailed || isRetrying}
              className="btn"
            >
              Retry failed
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {batch.succeededCount} succeeded, {batch.failedCount} failed, {batch.totalCount} total
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <ul className="flex flex-col gap-2">
          {urls.map((url) => (
            <li key={url.id} className="card px-3 py-2 flex flex-col gap-1">
              <span className="inline-flex items-center gap-2 text-sm text-gray-900">
                {URL_STATUS_ICON[url.status]}
                <span className="truncate">{url.url}</span>
              </span>
              {url.status === 'succeeded' && (
                <span className="text-xs text-gray-500">
                  {url.httpStatusCode} · {url.responseTimeMs}ms{url.pageTitle ? ` · ${url.pageTitle}` : ''}
                </span>
              )}
              {url.status === 'failed' && url.errorMessage && (
                <span className="text-xs text-red-600">{url.errorMessage}</span>
              )}
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isFetchingUrls}
              className="btn"
            >
              Previous
            </button>
            <span className="text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isFetchingUrls}
              className="btn"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
