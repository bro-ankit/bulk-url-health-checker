import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useBatchesControllerCreateFromUrls } from '@/lib/__generated__/api';
import { apiRequestWrapper } from '@/lib/api-request-wrapper';
import { MAX_URLS_PER_BATCH } from '@/lib/batch-constants';

import type { CreateBatchFormValues, UseCreateBatchForm } from './create-batch-form.types';

const parseUrls = (raw: string): string[] =>
  raw
    .split(/[\n\r\s]+/)
    .map((line) => line.trim())
    .filter(Boolean);

export const useCreateBatchForm: UseCreateBatchForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateBatchFormValues>({ defaultValues: { urls: '' } });

  const { mutateAsync: createFromUrls, isPending: isSubmitting } = useBatchesControllerCreateFromUrls();

  const urlCount = parseUrls(watch('urls')).length;

  const onSubmit = async (values: CreateBatchFormValues) => {
    setErrorMessage(null);
    const urls = parseUrls(values.urls);

    const result = await apiRequestWrapper(() => createFromUrls({ data: { urls } }), setErrorMessage);
    if (result) router.push(`/batches/${result.batchId}`);
  };

  return {
    register,
    handleSubmit,
    errors,
    onSubmit,
    isSubmitting,
    errorMessage,
    urlCount,
    maxUrls: MAX_URLS_PER_BATCH,
  };
};
