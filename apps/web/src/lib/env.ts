type EnvKey = 'API_ENDPOINT';

export const getEnv = (key: EnvKey, fallback: string): string => process.env[key] ?? fallback;
