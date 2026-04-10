import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import { getNotificationsEnabled } from '../utils/storage';

// Configurar como as notificações são exibidas quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const enabled = await getNotificationsEnabled();
    const shouldShow = enabled !== false;
    return {
      shouldShowAlert: shouldShow,
      shouldShowBanner: shouldShow,
      shouldShowList: shouldShow,
      shouldPlaySound: shouldShow,
      shouldSetBadge: shouldShow,
    };
  },
});

/**
 * Registrar para push notifications e obter o Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('[PUSH] Iniciando registro de push notification...');
  console.log('[PUSH] Platform:', Platform.OS);
  console.log('[PUSH] isDevice:', Device.isDevice);

  if (!Device.isDevice) {
    console.log('[PUSH] BLOQUEADO: não é dispositivo físico');
    return null;
  }

  // Verificar permissões existentes
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('[PUSH] Status de permissão atual:', existingStatus);
  let finalStatus = existingStatus;

  // Solicitar permissão se ainda não foi concedida
  if (existingStatus !== 'granted') {
    console.log('[PUSH] Solicitando permissão...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[PUSH] Status após solicitação:', finalStatus);
  }

  if (finalStatus !== 'granted') {
    console.log('[PUSH] BLOQUEADO: permissão negada, status:', finalStatus);
    return null;
  }

  // Obter o Expo Push Token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  console.log('[PUSH] ProjectId encontrado:', projectId);
  if (!projectId) {
    console.log('[PUSH] BLOQUEADO: projectId não encontrado');
    return null;
  }

  // Configurar canal de notificação no Android ANTES de obter o token
  // O Android exige que o canal exista antes de receber notificações
  if (Platform.OS === 'android') {
    console.log('[PUSH] Criando canal Android...');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90E2',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    console.log('[PUSH] Canal Android criado com sucesso');
  }

  try {
    console.log('[PUSH] Obtendo Expo Push Token...');
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[PUSH] Token obtido com sucesso:', token);
    return token;
  } catch (tokenError: any) {
    console.error('[PUSH] ERRO ao obter token:', tokenError?.message || tokenError);
    return null;
  }
}

/**
 * Enviar o token de push para o backend
 */
export async function sendTokenToBackend(token: string): Promise<void> {
  try {
    console.log('[PUSH] Enviando token ao backend:', token);
    const response = await api.post('/push/register-token', { token });
    console.log('[PUSH] Resposta do backend:', JSON.stringify(response.data));
  } catch (error: any) {
    console.error('[PUSH] ERRO ao registrar token no backend:', error?.response?.status, error?.response?.data || error?.message);
  }
}

/**
 * Registrar push e enviar token ao backend (fluxo completo)
 */
export async function setupPushNotifications(): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      await sendTokenToBackend(token);
    }
  } catch (error) {
    console.error('Erro ao configurar push notifications:', error);
  }
}
