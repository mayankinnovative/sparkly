import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { getTimezone } from '@/lib/timezone';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const { accessToken, user, selectedAccountId } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // Send detected timezone so backend can use it for date operations
  config.headers['x-timezone'] = getTimezone();
  // Send account context header for super_admin
  if (user?.role === 'super_admin' && selectedAccountId) {
    config.headers['x-account-id'] = selectedAccountId;
  }
  return config;
});

// Refresh queue to prevent race conditions with concurrent 401s
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      // If a refresh is already in progress, wait for it
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const refreshToken = useAuthStore.getState().refreshToken;
          const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
          const { data } = await axios.post(`${baseUrl}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = data.data;
          useAuthStore.getState().setTokens(accessToken, newRefresh);
          return accessToken;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
