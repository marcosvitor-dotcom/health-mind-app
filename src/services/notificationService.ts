import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// Configurar como as notificações são exibidas quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registrar para push notifications e obter o Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications requerem um dispositivo físico');
    return null;
  }

  // Verificar permissões existentes
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Solicitar permissão se ainda não foi concedida
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de notificação não concedida');
    return null;
  }

  // Obter o Expo Push Token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.log('Project ID não encontrado no app config');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  // Configurar canal de notificação no Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90E2',
    });
  }

  return token;
}

/**
 * Enviar o token de push para o backend
 */
export async function sendTokenToBackend(token: string): Promise<void> {
  try {
    await api.post('/push/register-token', { token });
  } catch (error) {
    console.error('Erro ao registrar token de push no backend:', error);
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
