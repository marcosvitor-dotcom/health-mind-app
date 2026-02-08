import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

async function checkForUpdates() {
  if (__DEV__) {
    console.log('Skipping update check in development mode');
    return;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    console.log('Update check result:', update);

    if (update.isAvailable) {
      Alert.alert(
        'Atualização disponível',
        'Uma nova versão está disponível. Deseja atualizar agora?',
        [
          { text: 'Depois', style: 'cancel' },
          {
            text: 'Atualizar',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (e) {
                console.error('Error fetching update:', e);
              }
            },
          },
        ]
      );
    }
  } catch (e) {
    console.error('Error checking for updates:', e);
  }
}

export default function App() {
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
