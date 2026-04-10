import axios, { AxiosError } from 'axios';
import { getToken, getRefreshToken, setToken, setRefreshToken, clearTokens } from '../utils/storage';
import { EventEmitter } from '../utils/eventEmitter';

// Base URL da API
const BASE_URL = 'https://health-mind-app.vercel.app/api';

// Códigos de erro de assinatura retornados pela API em respostas 403
export type SubscriptionErrorCode =
  | 'SUBSCRIPTION_BLOCKED'
  | 'NO_SUBSCRIPTION'
  | 'TRIAL_EXPIRED'
  | 'PATIENT_LIMIT_REACHED'
  | 'PLAN_NO_INVITES'
  | 'PSYCHOLOGIST_LIMIT_REACHED';

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
          await clearTokens();
          throw error;
        }

        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        if (data.success) {
          await setToken(data.data.token);
          await setRefreshToken(data.data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${data.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await clearTokens();
        throw refreshError;
      }
    }

    // Assinatura bloqueada / expirada — emite evento global para a navegação tratar
    if (error.response?.status === 403) {
      const responseData = error.response.data as any;
      const code: SubscriptionErrorCode | undefined = responseData?.code;

      const subscriptionCodes: SubscriptionErrorCode[] = [
        'SUBSCRIPTION_BLOCKED',
        'NO_SUBSCRIPTION',
        'TRIAL_EXPIRED',
      ];

      if (code && subscriptionCodes.includes(code)) {
        EventEmitter.emit('subscription:blocked', {
          code,
          message: responseData?.message,
        });
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
  code?: SubscriptionErrorCode;
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
