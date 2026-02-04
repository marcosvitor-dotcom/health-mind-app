import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import OverviewScreen from '../screens/admin/OverviewScreen';
import ClinicsScreen from '../screens/admin/ClinicsScreen';
import ClinicDetailScreen from '../screens/admin/ClinicDetailScreen';
import InviteClinicScreen from '../screens/admin/InviteClinicScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClinicsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClinicsList"
        component={ClinicsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClinicDetail"
        component={ClinicDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InviteClinic"
        component={InviteClinicScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function UsersStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="UsersList"
        component={UsersScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#E74C3C',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Clinics"
        component={ClinicsStack}
        options={{
          title: 'Clínicas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Users"
        component={UsersStack}
        options={{
          title: 'Usuários',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
