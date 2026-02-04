import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const adminUser = user as any;
  const isSuperAdmin = adminUser?.permissions?.promoteAdmin;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Configurações</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#E74C3C" />
            </View>
            {isSuperAdmin && (
              <View style={styles.superBadge}>
                <Ionicons name="star" size={14} color="#fff" />
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{user?.name || 'Administrador'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#E74C3C" />
            <Text style={styles.roleBadgeText}>
              {isSuperAdmin ? 'Super Administrador' : 'Administrador'}
            </Text>
          </View>
        </View>

        {/* Permissions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Permissões</Text>

          <PermissionItem
            icon="business"
            label="Gerenciar Clínicas"
            enabled={adminUser?.permissions?.manageClinics}
          />
          <PermissionItem
            icon="people"
            label="Gerenciar Usuários"
            enabled={adminUser?.permissions?.manageUsers}
          />
          <PermissionItem
            icon="stats-chart"
            label="Visualizar Métricas"
            enabled={adminUser?.permissions?.viewMetrics}
          />
          <PermissionItem
            icon="shield"
            label="Promover Admins"
            enabled={adminUser?.permissions?.promoteAdmin}
          />
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações</Text>

          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.infoLabel}>Versão do App</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="server" size={20} color="#666" />
            <Text style={styles.infoLabel}>Ambiente</Text>
            <Text style={styles.infoValue}>Produção</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#E74C3C" />
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

interface PermissionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  enabled?: boolean;
}

function PermissionItem({ icon, label, enabled }: PermissionItemProps) {
  return (
    <View style={styles.permissionItem}>
      <Ionicons name={icon} size={20} color={enabled ? '#27AE60' : '#999'} />
      <Text style={[styles.permissionLabel, !enabled && styles.permissionDisabled]}>{label}</Text>
      <Ionicons
        name={enabled ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color={enabled ? '#27AE60' : '#999'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FADBD8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  superBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E67E22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FADBD8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E74C3C',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  permissionLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  permissionDisabled: {
    color: '#999',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  infoValue: {
    fontSize: 15,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
    gap: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
  },
});
