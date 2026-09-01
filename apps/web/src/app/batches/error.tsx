'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

export default function BatchesError({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-col items-center justify-center gap-4 p-6 max-w-2xl mx-auto w-full text-center">
      <AlertTriangle size={32} className="text-red-600" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-gray-600">
        Couldn&apos;t reach the server. It may be temporarily unavailable, try again in a moment.
      </p>
      <button type="button" onClick={() => reset()} className="btn btn-primary">
        <RotateCw size={14} />
        Try again
      </button>
    </main>
  );
}
