import EncryptedStorage from 'react-native-encrypted-storage';
import { User } from '../types';

// Chaves de armazenamento
const STORAGE_KEYS = {
  TOKEN: '@HealthMind:token',
  REFRESH_TOKEN: '@HealthMind:refreshToken',
  USER: '@HealthMind:user',
};

// Token
export const getToken = async (): Promise<string | null> => {
  try {
    return await EncryptedStorage.getItem(STORAGE_KEYS.TOKEN) ?? null;
  } catch (error) {
    console.error('Erro ao buscar token:', error);
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  try {
    await EncryptedStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch (error) {
    console.error('Erro ao salvar token:', error);
  }
};

// Refresh Token
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await EncryptedStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ?? null;
  } catch (error) {
    console.error('Erro ao buscar refresh token:', error);
    return null;
  }
};

export const setRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await EncryptedStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  } catch (error) {
    console.error('Erro ao salvar refresh token:', error);
  }
};

// User
export const getUser = async (): Promise<User | null> => {
  try {
    const userJson = await EncryptedStorage.getItem(STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
};

export const setUser = async (user: User): Promise<void> => {
  try {
    await EncryptedStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
  }
};

// Limpar tudo
export const clearTokens = async (): Promise<void> => {
  try {
    await EncryptedStorage.removeItem(STORAGE_KEYS.TOKEN);
    await EncryptedStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await EncryptedStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
  }
};
