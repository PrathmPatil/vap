import axios, { AxiosRequestConfig, Method } from 'axios';

export interface ApiOptions {
  url: string;
  method: Method;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

const getApiBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  return baseUrl.replace(/\/+$/, '');
};

export async function callApi<T>({
  url,
  method,
  data,
  params,
  headers = {},
}: ApiOptions): Promise<T> {
  const config: AxiosRequestConfig = {
    url: `${getApiBaseUrl()}/${url.replace(/^\/+/, '')}`,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    data,
    params,
    withCredentials: true, // if you need cookies
  };

  try {
    const response = await axios.request<T>(config);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error;
    }

    throw new Error(
      error.message === 'Network Error'
        ? 'Unable to connect to the backend server. Please check that the API is running.'
        : error.message
    );
  }
}


// http://localhost:8000/vap/logs
export const getLogs = async (page: number, limit: number, search?: string, filters?: Record<string, unknown>): Promise<any> => {
  return callApi<any>({
    url: 'logs',
    method: 'GET',
    params: { page, limit, search, ...filters},
  });
}