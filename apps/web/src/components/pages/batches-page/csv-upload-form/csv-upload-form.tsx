'use client';

import { AlertCircle, Upload } from 'lucide-react';

import { useCsvUploadForm } from './use-csv-upload-form';

export const CsvUploadForm = () => {
  const { file, setFile, onSubmit, isSubmitting, errorMessage } = useCsvUploadForm();

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
      <label htmlFor="csv-input" className="font-medium text-sm text-gray-700">
        Or upload a CSV
      </label>
      <input
        id="csv-input"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-gray-50 file:cursor-pointer"
      />
      <button type="button" onClick={onSubmit} disabled={isSubmitting} className="btn self-start">
        <Upload size={16} />
        Upload CSV
      </button>
      {file && <p className="text-sm text-gray-500">{file.name}</p>}
      {errorMessage && (
        <p className="text-red-600 text-sm inline-flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMessage}
        </p>
      )}
    </div>
  );
};
