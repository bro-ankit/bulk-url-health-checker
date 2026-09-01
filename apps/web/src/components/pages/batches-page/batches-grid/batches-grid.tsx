'use client';

import { BatchesGridView } from './batches-grid-view';
import { useBatchesGrid } from './use-batches-grid';

export const BatchesGrid = () => {
  const props = useBatchesGrid();

  return <BatchesGridView {...props} />;
};
