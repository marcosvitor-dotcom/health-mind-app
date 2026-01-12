import axios, { AxiosError } from 'axios';
import { getToken, getRefreshToken, setToken, setRefreshToken, clearTokens } from '../utils/storage';

// Base URL da API
const BASE_URL = 'https://health-mind-api.vercel.app/api';

// Criar instância do axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adiciona token automaticamente
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - trata erros e refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Token expirado - tentar renovar
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
          // Não tem refresh token, fazer logout
          await clearTokens();
          throw error;
        }

        // Tentar renovar o token
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        if (data.success) {
          // Salvar novos tokens
          await setToken(data.data.token);
          await setRefreshToken(data.data.refreshToken);

          // Refazer a requisição original com novo token
          originalRequest.headers.Authorization = `Bearer ${data.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token também expirou - fazer logout
        await clearTokens();
        throw refreshError;
      }
    }

    return Promise.reject(error);
  }
);

// Tipos de resposta da API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

export interface ApiError {
  success: false;
  message: string;
}

// Helper para extrair mensagem de erro
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || error.message || 'Erro ao conectar com o servidor';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro desconhecido';
};

export default api;
