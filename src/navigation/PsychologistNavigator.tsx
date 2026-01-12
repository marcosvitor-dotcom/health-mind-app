import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ClientsScreen from '../screens/psychologist/ClientsScreen';
import PsychScheduleScreen from '../screens/psychologist/PsychScheduleScreen';
import DocumentsScreen from '../screens/psychologist/DocumentsScreen';
import ReportsScreen from '../screens/psychologist/ReportsScreen';
import AddClientScreen from '../screens/psychologist/AddClientScreen';
import AnamneseFormScreen from '../screens/psychologist/AnamneseFormScreen';
import ProfileScreen from '../screens/psychologist/ProfileScreen';
import InvitePatientScreen from '../screens/psychologist/InvitePatientScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClientsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClientsList"
        component={ClientsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddClient"
        component={AddClientScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AnamneseForm"
        component={AnamneseFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InvitePatient"
        component={InvitePatientScreen}
        options={{
          title: 'Convidar Paciente',
          headerStyle: {
            backgroundColor: '#50C878',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
}

export default function PsychologistNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Clients"
        component={ClientsStack}
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={PsychScheduleScreen}
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          title: 'Documentos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
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
