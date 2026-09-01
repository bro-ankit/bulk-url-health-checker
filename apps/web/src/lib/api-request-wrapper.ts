import { AxiosError } from 'axios';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? 'Something went wrong.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
};

export const apiRequestWrapper = async <T>(
  requestAction: () => Promise<T>,
  onError?: (errorMessage: string) => void,
): Promise<T | null> => {
  try {
    return await requestAction();
  } catch (error) {
    onError?.(getErrorMessage(error));
    return null;
  }
};
