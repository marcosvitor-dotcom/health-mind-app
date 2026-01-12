import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import OverviewScreen from '../screens/clinic/OverviewScreen';
import PsychologistsScreen from '../screens/clinic/PsychologistsScreen';
import ScheduleScreen from '../screens/clinic/ScheduleScreen';
import ProfileScreen from '../screens/clinic/ProfileScreen';
import AddPsychologistScreen from '../screens/clinic/AddPsychologistScreen';
import InvitePsychologistScreen from '../screens/clinic/InvitePsychologistScreen';

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
        name="AddPsychologist"
        component={AddPsychologistScreen}
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
