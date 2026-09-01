import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

import { API_PROXY_ENDPOINT } from './api-constants';
import { getEnv } from './env';

const isServer = typeof window === 'undefined';

const AXIOS_INSTANCE = axios.create({
  baseURL: isServer ? getEnv('API_ENDPOINT', 'http://localhost:3000') : API_PROXY_ENDPOINT,
});

export const customInstance = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const { data } = await AXIOS_INSTANCE(config);
  return data as T;
};
