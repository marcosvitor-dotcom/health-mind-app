import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import * as clinicService from '../../services/clinicService';
import { ClinicData, ClinicStats } from '../../services/clinicService';

export default function OverviewScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const [clinic, clinicStats] = await Promise.all([
        clinicService.getClinic(user.id),
        clinicService.getClinicStats(user.id),
      ]);
      setClinicData(clinic);
      setStats(clinicStats);
    } catch (err: any) {
      console.error('Erro ao carregar dados da clínica:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatAddress = (address?: clinicService.ClinicAddress) => {
    if (!address) return 'Endereço não cadastrado';
    const parts = [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      `${address.city} - ${address.state}`,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const StatCard = ({
    icon,
    title,
    value,
    color,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: string;
    color: string;
  }) => (
    <Card style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Bem-vindo(a),</Text>
          <Text style={styles.clinicName}>{clinicData?.name || user?.name}</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            icon="people"
            title="Psicólogos"
            value={String(stats?.totalPsychologists || 0)}
            color="#4A90E2"
          />
          <StatCard
            icon="calendar"
            title="Consultas Hoje"
            value={String(stats?.appointmentsToday || 0)}
            color="#50C878"
          />
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            icon="person"
            title="Pacientes Ativos"
            value={String(stats?.totalPatients || 0)}
            color="#FFB347"
          />
          <StatCard
            icon="trending-up"
            title="Taxa Ocupação"
            value={`${stats?.occupancyRate || 0}%`}
            color="#9B59B6"
          />
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="business" size={24} color="#4A90E2" />
            <Text style={styles.infoTitle}>Informações da Clínica</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#666" />
            <Text style={styles.infoText}>{formatAddress(clinicData?.address)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#666" />
            <Text style={styles.infoText}>{clinicData?.phone || 'Telefone não cadastrado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#666" />
            <Text style={styles.infoText}>{clinicData?.email || user?.email}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Próximas Ações</Text>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="document-text" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Relatório Mensal</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="settings" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Configurações</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  clinicName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    margin: 10,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});
