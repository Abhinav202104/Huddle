import axios from 'axios';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

const api = axios.create({ baseURL: `${SERVER_URL}/api`, withCredentials: true });

// When the 15-minute access token expires, refresh once and retry the request.
const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh'];
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && original && !original._retry && !NO_RETRY.includes(original.url)) {
      original._retry = true;
      refreshing = refreshing || api.post('/auth/refresh').finally(() => (refreshing = null));
      try {
        await refreshing;
        return api(original);
      } catch {
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
