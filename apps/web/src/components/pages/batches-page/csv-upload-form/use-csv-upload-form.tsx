import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useBatchesControllerCompleteUrlUpload, useBatchesControllerRequestUrlUpload } from '@/lib/__generated__/api';
import { apiRequestWrapper } from '@/lib/api-request-wrapper';

import type { UseCsvUploadForm } from './csv-upload-form.types';

export const useCsvUploadForm: UseCsvUploadForm = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutateAsync: requestUpload } = useBatchesControllerRequestUrlUpload();
  const { mutateAsync: completeUpload, isPending: isSubmitting } = useBatchesControllerCompleteUrlUpload();

  const onSubmit = async () => {
    setErrorMessage(null);
    if (!file) {
      setErrorMessage('Choose a CSV file first');
      return;
    }

    await apiRequestWrapper(async () => {
      const { uploadUrl, uploadFields, objectKey } = await requestUpload({ data: { filename: file.name } });

      const formData = new FormData();
      Object.entries(uploadFields).forEach(([key, value]) => formData.append(key, String(value)));
      formData.append('file', file);

      const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!uploadResponse.ok) {
        throw new Error('Upload to storage failed');
      }

      const result = await completeUpload({ data: { objectKey } });
      router.push(`/batches/${result.batchId}`);
    }, setErrorMessage);
  };

  return { file, setFile, onSubmit, isSubmitting, errorMessage };
};
