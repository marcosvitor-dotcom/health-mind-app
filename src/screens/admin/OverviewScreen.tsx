import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import { AdminStats } from '../../types';

export default function OverviewScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E74C3C" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E74C3C']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
            <Text style={styles.welcomeText}>Bem-vindo,</Text>
            <Text style={styles.userName}>{user?.name || 'Administrador'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name="stats-chart" size={32} color="#E74C3C" />
          </View>
        </View>

        {/* Totais */}
        <Text style={styles.sectionTitle}>Totais do Sistema</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="business"
            label="Clínicas"
            value={stats?.totals.clinics || 0}
            color="#3498DB"
          />
          <StatCard
            icon="medkit"
            label="Psicólogos"
            value={stats?.totals.psychologists || 0}
            color="#9B59B6"
          />
          <StatCard
            icon="people"
            label="Pacientes"
            value={stats?.totals.patients || 0}
            color="#27AE60"
          />
          <StatCard
            icon="shield"
            label="Admins"
            value={stats?.totals.admins || 0}
            color="#E74C3C"
          />
        </View>

        {/* Usuários Ativos */}
        <Text style={styles.sectionTitle}>Usuários Ativos (30 dias)</Text>
        <View style={styles.activeUsersCard}>
          <View style={styles.activeUsersRow}>
            <View style={styles.activeUserItem}>
              <Text style={styles.activeUserValue}>{stats?.activeUsers.clinics || 0}</Text>
              <Text style={styles.activeUserLabel}>Clínicas</Text>
            </View>
            <View style={styles.activeUserItem}>
              <Text style={styles.activeUserValue}>{stats?.activeUsers.psychologists || 0}</Text>
              <Text style={styles.activeUserLabel}>Psicólogos</Text>
            </View>
            <View style={styles.activeUserItem}>
              <Text style={styles.activeUserValue}>{stats?.activeUsers.patients || 0}</Text>
              <Text style={styles.activeUserLabel}>Pacientes</Text>
            </View>
          </View>
          <View style={styles.totalActiveRow}>
            <Text style={styles.totalActiveLabel}>Total de usuários ativos:</Text>
            <Text style={styles.totalActiveValue}>{stats?.activeUsers.total || 0}</Text>
          </View>
        </View>

        {/* Novos este mês */}
        <Text style={styles.sectionTitle}>Novos este Mês</Text>
        <View style={styles.newUsersCard}>
          <View style={styles.newUsersContent}>
            <Ionicons name="trending-up" size={32} color="#27AE60" />
            <View style={styles.newUsersInfo}>
              <Text style={styles.newUsersTotal}>{stats?.newThisMonth.total || 0}</Text>
              <Text style={styles.newUsersLabel}>novos usuários</Text>
            </View>
          </View>
          <View style={styles.newUsersBreakdown}>
            <Text style={styles.newUsersBreakdownText}>
              {stats?.newThisMonth.clinics || 0} clínicas • {stats?.newThisMonth.psychologists || 0}{' '}
              psicólogos • {stats?.newThisMonth.patients || 0} pacientes
            </Text>
          </View>
        </View>

        {/* Consultas */}
        <View style={styles.appointmentsCard}>
          <View style={styles.appointmentsIcon}>
            <Ionicons name="calendar" size={24} color="#fff" />
          </View>
          <View style={styles.appointmentsInfo}>
            <Text style={styles.appointmentsValue}>{stats?.appointmentsThisMonth || 0}</Text>
            <Text style={styles.appointmentsLabel}>consultas este mês</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Clinics', { screen: 'InviteClinic' })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#3498DB' }]}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Convidar Clínica</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Clinics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#9B59B6' }]}>
              <Ionicons name="list" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Ver Clínicas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Users')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#27AE60' }]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Ver Usuários</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  activeUsersCard: {
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
  activeUsersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  activeUserItem: {
    alignItems: 'center',
  },
  activeUserValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  activeUserLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  totalActiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  totalActiveLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalActiveValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  newUsersCard: {
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
  newUsersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  newUsersInfo: {
    marginLeft: 16,
  },
  newUsersTotal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  newUsersLabel: {
    fontSize: 14,
    color: '#666',
  },
  newUsersBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  newUsersBreakdownText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  appointmentsCard: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appointmentsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentsInfo: {
    marginLeft: 16,
  },
  appointmentsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  appointmentsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});
