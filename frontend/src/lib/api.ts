import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { getTimezone } from '@/lib/timezone';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Decode JWT expiry without verification (client-side only)
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Treat as expired if less than 30 seconds remaining
    return payload.exp * 1000 < Date.now() + 30000;
  } catch {
    return true;
  }
}

// Shared refresh promise to prevent concurrent refresh requests
let refreshPromise: Promise<string> | null = null;

function doRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) throw new Error('No refresh token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const { data } = await axios.post(`${baseUrl}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = data.data;
      useAuthStore.getState().setTokens(accessToken, newRefresh);
      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Request interceptor: proactively refresh expired tokens BEFORE sending
api.interceptors.request.use(async (config) => {
  let { accessToken, user, selectedAccountId } = useAuthStore.getState();

  // If token exists but is expired, refresh it before sending the request
  if (accessToken && isTokenExpired(accessToken)) {
    try {
      accessToken = await doRefresh();
    } catch {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired'));
    }
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['x-timezone'] = getTimezone();
  if (user?.role === 'super_admin' && selectedAccountId) {
    config.headers['x-account-id'] = selectedAccountId;
  }
  return config;
});

// Response interceptor: handle unexpected 401s (e.g., server-side token revocation)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const newToken = await doRefresh();
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
