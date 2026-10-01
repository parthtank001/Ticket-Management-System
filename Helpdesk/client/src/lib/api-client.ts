import axios from 'axios';

// When running in the browser, default to relative '' so Vite's dev proxy routes /api seamlessly.
// Allow explicit VITE_API_BASE_URL override for standalone SSR or external backend deployments.
const isBrowser = typeof window !== 'undefined';
const envBaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL || (isBrowser ? '' : import.meta.env.VITE_API_URL))
    : '';

const apiBaseUrl = envBaseUrl || '';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

