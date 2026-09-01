import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

import { BatchesGrid } from '@/components/pages/batches-page/batches-grid/batches-grid';
import { getBatchesControllerListInfiniteQueryOptions } from '@/lib/__generated__/api';

export const dynamic = 'force-dynamic';

export default async function BatchesPage() {
  const queryClient = new QueryClient();

  await queryClient.infiniteQuery({
    ...getBatchesControllerListInfiniteQueryOptions(undefined),
    initialPageParam: undefined,
  });

  return (
    <main className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-semibold">Bulk URL Health Checker</h1>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BatchesGrid />
      </HydrationBoundary>
    </main>
  );
}
