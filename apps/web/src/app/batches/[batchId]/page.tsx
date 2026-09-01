import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { BatchDetail } from '@/components/pages/batches-page/batch-detail/batch-detail';
import {
  getBatchesControllerGetOneQueryOptions,
  getBatchesControllerGetUrlsQueryOptions,
} from '@/lib/__generated__/api';
import { DEFAULT_URL_PAGE_SIZE } from '@/lib/batch-constants';

export const dynamic = 'force-dynamic';

export default async function BatchDetailPage({ params }: PageProps<'/batches/[batchId]'>) {
  const { batchId } = await params;
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.query(getBatchesControllerGetOneQueryOptions(batchId)),
    queryClient.query(getBatchesControllerGetUrlsQueryOptions(batchId, { page: 1, pageSize: DEFAULT_URL_PAGE_SIZE })),
  ]);

  return (
    <main className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      <Link href="/batches" className="text-sm text-blue-600 inline-flex items-center gap-1">
        <ArrowLeft size={14} />
        All batches
      </Link>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BatchDetail batchId={batchId} />
      </HydrationBoundary>
    </main>
  );
}
