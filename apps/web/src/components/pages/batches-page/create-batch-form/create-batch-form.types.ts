import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from 'react-hook-form';

export type CreateBatchFormValues = {
  urls: string;
};

export type UseCreateBatchForm = () => {
  register: UseFormRegister<CreateBatchFormValues>;
  handleSubmit: UseFormHandleSubmit<CreateBatchFormValues>;
  errors: FieldErrors<CreateBatchFormValues>;
  onSubmit: (values: CreateBatchFormValues) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
  urlCount: number;
  maxUrls: number;
};
