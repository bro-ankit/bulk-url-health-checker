export type UseCsvUploadForm = () => {
  file: File | null;
  setFile: (file: File | null) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
};
