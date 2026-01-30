import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import FirstAccessScreen from '../screens/auth/FirstAccessScreen';
import CompleteRegistrationScreen from '../screens/auth/CompleteRegistrationScreen';
import ClinicNavigator from './ClinicNavigator';
import PsychologistNavigator from './PsychologistNavigator';
import ClientNavigator from './ClientNavigator';

type RootStackParamList = {
  Login: undefined;
  FirstAccess: undefined;
  CompleteRegistration: { token: string };
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<any> = {
  prefixes: [
    Linking.createURL('/'),
    'healthmind://',
    'https://health-mind-app.vercel.app',
  ],
  config: {
    screens: {
      CompleteRegistration: 'auth/complete-registration/:token',
      Login: 'login',
    },
  },
};

export default function AppNavigator() {
  const { isAuthenticated, user, loading } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const getMainNavigator = () => {
    if (!user) return null;

    // Suportar tanto 'client' quanto 'patient'
    const role = user.role === 'patient' ? 'client' : user.role;

    switch (role) {
      case 'clinic':
        return <Stack.Screen name="Main" component={ClinicNavigator} options={{ headerShown: false }} />;
      case 'psychologist':
        return <Stack.Screen name="Main" component={PsychologistNavigator} options={{ headerShown: false }} />;
      case 'client':
        return <Stack.Screen name="Main" component={ClientNavigator} options={{ headerShown: false }} />;
      default:
        return null;
    }
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FirstAccess"
              component={FirstAccessScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CompleteRegistration"
              component={CompleteRegistrationScreen}
              options={{
                title: 'Complete seu Cadastro',
                headerStyle: {
                  backgroundColor: '#4A90E2',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />
          </>
        ) : (
          getMainNavigator()
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
