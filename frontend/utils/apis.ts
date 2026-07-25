import axios, { AxiosRequestConfig, Method } from 'axios';

export interface ApiOptions {
  url: string;
  method: Method;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

const getApiBaseUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NEXT_PUBLIC_BACKEND_API?.trim()
      ? `${process.env.NEXT_PUBLIC_BACKEND_API.trim().replace(/\/+$/, '')}/vap`
      : '');

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  return baseUrl.replace(/\/+$/, '');
};

const getAuthToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const storedToken = window.localStorage.getItem('token')?.trim();
  if (storedToken) {
    return storedToken;
  }

  const cookieToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('token='))
    ?.split('=')?.[1]
    ?.trim();

  return cookieToken || '';
};

/** Clear the expired/invalid session and send the user to the login page. */
const handleSessionExpired = (requestUrl: string) => {
  if (typeof window === 'undefined') return;

  // Never redirect for auth endpoints (wrong password also returns 401)
  if (/(^|\/)auth\//.test(requestUrl) || /login|register/i.test(requestUrl)) {
    return;
  }

  window.localStorage.removeItem('token');
  window.localStorage.removeItem('stockUser');
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  if (!window.location.pathname.startsWith('/login')) {
    const from = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.href = `/login?expired=1&from=${from}`;
  }
};

export async function callApi<T>({
  url,
  method,
  data,
  params,
  headers = {},
}: ApiOptions): Promise<T> {
  const token = getAuthToken();

  const config: AxiosRequestConfig = {
    url: `${getApiBaseUrl()}/${url.replace(/^\/+/, '')}`,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      // Redirect to login only when a token was actually sent and rejected
      // (guests without a token keep the friendly in-page 401 handling).
      if (error.response.status === 401 && token) {
        handleSessionExpired(url);
      }
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