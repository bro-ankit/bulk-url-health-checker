'use client';

import { AlertCircle, ListPlus } from 'lucide-react';

import { CsvUploadForm } from '../csv-upload-form/csv-upload-form';
import { useCreateBatchForm } from './use-create-batch-form';

export const CreateBatchForm = () => {
  const { register, handleSubmit, errors, onSubmit, isSubmitting, errorMessage, urlCount, maxUrls } =
    useCreateBatchForm();
  const isOverLimit = urlCount > maxUrls;

  return (
    <section className="flex flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="urls-textarea" className="font-medium text-sm text-gray-700">
            Paste URLs (space or newline separated)
          </label>
          <span className={`text-xs ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {urlCount} / {maxUrls}
          </span>
        </div>
        <textarea
          id="urls-textarea"
          rows={6}
          className="border border-gray-200 rounded-lg p-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          placeholder={'https://example.com\nhttps://another-example.com'}
          {...register('urls', { required: 'Paste at least one URL' })}
        />
        {errors.urls && <p className="text-red-600 text-sm">{errors.urls.message}</p>}
        <button type="submit" disabled={isSubmitting || isOverLimit} className="btn btn-primary self-start">
          <ListPlus size={16} />
          Submit pasted URLs
        </button>
        {errorMessage && (
          <p className="text-red-600 text-sm inline-flex items-center gap-2">
            <AlertCircle size={16} />
            {errorMessage}
          </p>
        )}
      </form>

      <CsvUploadForm />
    </section>
  );
};
