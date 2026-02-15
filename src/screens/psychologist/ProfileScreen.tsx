import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const [imageError, setImageError] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.avatarContainer}>
            {user?.avatar && !imageError ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#fff" />
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.badge, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
            <Ionicons name="medical" size={16} color="#4A90E2" />
            <Text style={styles.badgeText}>Psicólogo(a)</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>Conta</Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="person-outline" size={24} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Notificações</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Privacidade</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>Suporte</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}>
            <Ionicons name="document-text-outline" size={24} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Termos de Uso</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Politica de Privacidade</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="help-circle-outline" size={24} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Central de Ajuda</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>Sobre</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textTertiary }]}>Versão 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    borderRadius: 12,
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 4,
    fontWeight: '600',
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
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 20,
  },
});
