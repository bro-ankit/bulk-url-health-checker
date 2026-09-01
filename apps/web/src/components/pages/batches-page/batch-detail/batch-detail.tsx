'use client';

import { BatchDetailView } from './batch-detail-view';
import { BatchDetailProps } from './batch-detail.types';
import { useBatchDetail } from './use-batch-detail';

export const BatchDetail: React.FC<BatchDetailProps> = ({ batchId }) => {
  const logic = useBatchDetail({ batchId });

  return <BatchDetailView {...logic} />;
};
