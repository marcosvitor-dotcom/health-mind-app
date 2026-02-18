import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ChatScreen from '../screens/client/ChatScreen';
import AppointmentsScreen from '../screens/client/AppointmentsScreen';
import BookAppointmentScreen from '../screens/client/BookAppointmentScreen';
import EmergencyScreen from '../screens/client/EmergencyScreen';
import ProfileScreen from '../screens/client/ProfileScreen';
import EditProfileScreen from '../screens/client/EditProfileScreen';
import PsychologistProfileScreen from '../screens/client/PsychologistProfileScreen';
import DirectChatScreen from '../screens/shared/DirectChatScreen';
import ClinicInfoScreen from '../screens/client/ClinicInfoScreen';
import LegalDocumentScreen from '../screens/shared/LegalDocumentScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import HelpSupportScreen from '../screens/shared/HelpSupportScreen';
import NotificationCenterScreen from '../screens/shared/NotificationCenterScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatMain" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
    </Stack.Navigator>
  );
}

function AppointmentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppointmentsMain" component={AppointmentsScreen} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
    </Stack.Navigator>
  );
}

function EmergencyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmergencyMain" component={EmergencyScreen} />
      <Stack.Screen name="DirectChat" component={DirectChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="PsychologistProfile" component={PsychologistProfileScreen} />
      <Stack.Screen name="ClinicInfo" component={ClinicInfoScreen} />
      <Stack.Screen name="DirectChat" component={DirectChatScreen} />
      <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    </Stack.Navigator>
  );
}

export default function ClientNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          title: 'Diário',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStack}
        options={{
          title: 'Consultas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Emergency"
        component={EmergencyStack}
        options={{
          title: 'Emergência',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
