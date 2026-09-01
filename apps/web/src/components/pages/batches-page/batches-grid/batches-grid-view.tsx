import { AlertTriangle, CheckCircle2, Clock, Loader2, Plus, XCircle } from 'lucide-react';
import Link from 'next/link';

import { Modal } from '@/components/organisms/modal/modal';
import type { BatchDto } from '@/lib/__generated__/api';

import { CreateBatchForm } from '../create-batch-form/create-batch-form';
import type { BatchesGridViewProps } from './batches-grid.types';

const getBatchStatusIcon = (batch: BatchDto): React.ReactNode => {
  switch (batch.status) {
    case 'pending':
      return <Clock size={16} className="text-gray-500" />;
    case 'running':
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    case 'completed':
      return batch.failedCount > 0 ? (
        <AlertTriangle size={16} className="text-amber-500" />
      ) : (
        <CheckCircle2 size={16} className="text-green-600" />
      );
    case 'cancelled':
      return <XCircle size={16} className="text-red-600" />;
  }
};

export const BatchesGridView: React.FC<BatchesGridViewProps> = ({
  batches,
  hasMore,
  isLoadingMore,
  loadMore,
  isCreateModalOpen,
  onAddNewBatchClick,
  onCloseCreateModal,
}) => (
  <>
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900">Batches</h2>
        <button type="button" onClick={onAddNewBatchClick} className="btn btn-primary">
          <Plus size={16} />
          Add new batch
        </button>
      </div>

      {batches.length === 0 && <p className="text-sm text-gray-500">No batches yet.</p>}

      <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {batches.map((batch) => (
          <li key={batch.id} className="card px-3 py-2.5 hover:border-gray-300 transition-colors">
            <Link href={`/batches/${batch.id}`} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm text-gray-900">
                {getBatchStatusIcon(batch)}
                {batch.name}
              </span>
              <span className="text-sm text-gray-500">
                {batch.succeededCount + batch.failedCount}/{batch.totalCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button type="button" onClick={loadMore} disabled={isLoadingMore} className="btn self-center">
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </section>

    <Modal open={isCreateModalOpen} onClose={onCloseCreateModal} title="Add new batch">
      <CreateBatchForm />
    </Modal>
  </>
);
