import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../contexts/ThemeContext';
import * as storage from '../../utils/storage';

interface Props {
  navigation: any;
}

export default function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    loadNotificationPreference();
  }, []);

  const loadNotificationPreference = async () => {
    try {
      const stored = await storage.getNotificationsEnabled();
      if (stored !== null) {
        setNotificationsEnabled(stored);
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
      }
    } catch (error) {
      console.error('Erro ao carregar preferencia de notificacoes:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await storage.setNotificationsEnabled(value);

    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permissao necessaria',
            'Para receber notificacoes, habilite as permissoes nas configuracoes do dispositivo.',
          );
          setNotificationsEnabled(false);
          await storage.setNotificationsEnabled(false);
        }
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Configuracoes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Aparencia */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>
            Aparencia
          </Text>

          <View style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="moon-outline" size={24} color={colors.textSecondary} />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Modo Escuro</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                {isDark ? 'Ativado' : 'Desativado'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#ccc', true: '#4A90E2' }}
              thumbColor={isDark ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Notificacoes */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>
            Notificacoes
          </Text>

          <View style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Notificacoes Push</Text>
              <Text style={[styles.menuSubtext, { color: colors.textSecondary }]}>
                {notificationsEnabled ? 'Ativado' : 'Desativado'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#ccc', true: '#4A90E2' }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              disabled={loadingNotifications}
            />
          </View>
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>
          Health Mind App - Versao 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuText: {
    fontSize: 16,
  },
  menuSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 20,
  },
});
