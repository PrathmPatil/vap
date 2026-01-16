import axios, { AxiosRequestConfig, Method } from 'axios';

export interface ApiOptions {
  url: string;
  method: Method;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export async function callApi<T>({
  url,
  method,
  data,
  params,
  headers = {},
}: ApiOptions): Promise<T> {
  const config: AxiosRequestConfig = {
    url:process.env.NEXT_PUBLIC_API_URL + url,
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
    // You can customize error handling/logging here
    if (error.response) {
      throw new Error(
        `API Error: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`
      );
    }
    throw new Error(`Network Error: ${error.message}`);
  }
}