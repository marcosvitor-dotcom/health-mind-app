import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';
import * as storage from '../utils/storage';
import { setupPushNotifications } from '../services/notificationService';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  setAuthUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Carregar usuário do storage ao iniciar
  useEffect(() => {
    loadStoredUser();
  }, []);

  /**
   * Carregar usuário salvo no AsyncStorage
   */
  const loadStoredUser = async () => {
    try {
      setLoading(true);
      const storedUser = await storage.getUser();
      const token = await storage.getToken();

      if (storedUser && token) {
        // Verificar se o token ainda é válido tentando buscar dados atualizados
        try {
          const updatedUser = await authService.getMe();
          setUser(updatedUser);
          await storage.setUser(updatedUser);

          // Registrar push notifications ao restaurar sessão
          setupPushNotifications().catch((err) =>
            console.log('Push notification setup (não crítico):', err)
          );
        } catch (error) {
          // Token inválido ou expirado - limpar storage
          console.log('Token expirado, fazendo logout...');
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Limpar dados de autenticação
   */
  const clearAuthData = async () => {
    setUser(null);
    await storage.clearTokens();
  };

  /**
   * Login de usuário
   */
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Chamar API de login
      const response = await authService.login(email, password);

      const { user: userData, token, refreshToken } = response;

      // Salvar tokens
      await storage.setToken(token);
      await storage.setRefreshToken(refreshToken);

      // Normalizar user data (garantir que tenha 'id' além de '_id')
      const normalizedUser: User = {
        ...userData,
        id: userData._id || userData.id,
      };

      // Salvar usuário
      await storage.setUser(normalizedUser);
      setUser(normalizedUser);

      // Registrar push notifications após login
      setupPushNotifications().catch((err) =>
        console.log('Push notification setup (não crítico):', err)
      );
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout de usuário
   */
  const logout = async () => {
    try {
      setLoading(true);

      // Chamar API de logout (não crítico se falhar)
      try {
        await authService.logout();
      } catch (error) {
        console.log('Erro ao fazer logout na API (não crítico):', error);
      }

      // Limpar dados locais
      await clearAuthData();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Definir usuário autenticado (usado após completar cadastro)
   */
  const setAuthUser = (userData: User) => {
    const normalizedUser: User = {
      ...userData,
      id: userData._id || userData.id,
    };
    setUser(normalizedUser);
  };

  /**
   * Atualizar dados do usuário
   */
  const refreshUserData = async () => {
    try {
      const updatedUser = await authService.getMe();

      // Normalizar user data
      const normalizedUser: User = {
        ...updatedUser,
        id: updatedUser._id || updatedUser.id,
      };

      setUser(normalizedUser);
      await storage.setUser(normalizedUser);
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshUserData,
        setAuthUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
