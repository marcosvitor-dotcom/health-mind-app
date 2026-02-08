import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import OverviewScreen from '../screens/clinic/OverviewScreen';
import PsychologistsScreen from '../screens/clinic/PsychologistsScreen';
import PatientsScreen from '../screens/clinic/PatientsScreen';
import ScheduleScreen from '../screens/clinic/ScheduleScreen';
import ProfileScreen from '../screens/clinic/ProfileScreen';
import EditProfileScreen from '../screens/clinic/EditProfileScreen';
import InvitePsychologistScreen from '../screens/clinic/InvitePsychologistScreen';
import InvitationsScreen from '../screens/clinic/InvitationsScreen';
import InvitePatientScreen from '../screens/clinic/InvitePatientScreen';
import RoomsScreen from '../screens/clinic/RoomsScreen';
import RoomDetailScreen from '../screens/clinic/RoomDetailScreen';
import RoomScheduleScreen from '../screens/clinic/RoomScheduleScreen';
import LegalDocumentScreen from '../screens/shared/LegalDocumentScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function PsychologistsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PsychologistsList"
        component={PsychologistsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InvitePsychologist"
        component={InvitePsychologistScreen}
        options={{
          title: 'Convidar Psicólogo',
          headerStyle: {
            backgroundColor: '#4A90E2',
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

function RoomsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoomsList" component={RoomsScreen} />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
      <Stack.Screen name="RoomSchedule" component={RoomScheduleScreen} />
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

export default function ClinicNavigator() {
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
        name="Psychologists"
        component={PsychologistsStack}
        options={{
          title: 'Psicólogos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Rooms"
        component={RoomsStack}
        options={{
          title: 'Salas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
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
