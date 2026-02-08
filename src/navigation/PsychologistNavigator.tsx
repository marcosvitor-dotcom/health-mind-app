import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import OverviewScreen from '../screens/psychologist/OverviewScreen';
import ClientsScreen from '../screens/psychologist/ClientsScreen';
import PsychScheduleScreen from '../screens/psychologist/PsychScheduleScreen';
import DocumentsScreen from '../screens/psychologist/DocumentsScreen';
import ReportsScreen from '../screens/psychologist/ReportsScreen';
import AddClientScreen from '../screens/psychologist/AddClientScreen';
import AnamneseFormScreen from '../screens/psychologist/AnamneseFormScreen';
import ProfileScreen from '../screens/psychologist/ProfileScreen';
import EditProfileScreen from '../screens/psychologist/EditProfileScreen';
import InvitePatientScreen from '../screens/psychologist/InvitePatientScreen';
import InvitationsScreen from '../screens/psychologist/InvitationsScreen';
import AppointmentBookingScreen from '../screens/psychologist/AppointmentBookingScreen';
import TherapeuticReportListScreen from '../screens/psychologist/TherapeuticReportListScreen';
import TherapeuticReportDetailScreen from '../screens/psychologist/TherapeuticReportDetailScreen';
import LegalDocumentScreen from '../screens/shared/LegalDocumentScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import DirectChatScreen from '../screens/shared/DirectChatScreen';

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
      <Stack.Screen
        name="Invitations"
        component={InvitationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AppointmentBooking"
        component={AppointmentBookingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TherapeuticReportList"
        component={TherapeuticReportListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TherapeuticReportDetail"
        component={TherapeuticReportDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DirectChat"
        component={DirectChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function ScheduleStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScheduleMain" component={PsychScheduleScreen} />
      <Stack.Screen name="AppointmentBooking" component={AppointmentBookingScreen} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsMain" component={ReportsScreen} />
      <Stack.Screen name="TherapeuticReportList" component={TherapeuticReportListScreen} />
      <Stack.Screen name="TherapeuticReportDetail" component={TherapeuticReportDetailScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
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
        name="Overview"
        component={OverviewScreen}
        options={{
          title: 'Visão Geral',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
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
        component={ScheduleStack}
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsStack}
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
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
