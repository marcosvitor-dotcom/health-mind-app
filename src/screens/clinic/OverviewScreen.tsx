import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicData, ClinicStats } from '../../services/clinicService';

export default function OverviewScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [stats, setStats] = useState<ClinicStats | null>(null);
  const [newPatientsThisMonth, setNewPatientsThisMonth] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const [clinic, clinicStats, newPatients] = await Promise.all([
        clinicService.getClinic(user.id),
        clinicService.getClinicStats(user.id),
        clinicService.getNewPatientsThisMonth(user.id),
      ]);
      setClinicData(clinic);
      setStats(clinicStats);
      setNewPatientsThisMonth(newPatients);
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
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value: string;
    color: string;
    onPress?: () => void;
  }) => {
    const content = (
      <Card style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={styles.cardArrow} />
        )}
      </Card>
    );

    if (onPress) {
      return (
        <TouchableOpacity style={styles.statCardTouchable} activeOpacity={0.7} onPress={onPress}>
          {content}
        </TouchableOpacity>
      );
    }

    return <View style={styles.statCardTouchable}>{content}</View>;
  };

  // Funções de navegação
  const navigateToPsychologists = () => {
    navigation.navigate('Psychologists');
  };

  const navigateToScheduleToday = () => {
    navigation.navigate('Schedule');
  };

  const navigateToPatients = () => {
    navigation.navigate('Patients');
  };

  // Obter nome do mês atual
  const getCurrentMonthName = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[new Date().getMonth()];
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />
        }
      >
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Bem-vindo(a),</Text>
          <Text style={[styles.clinicName, { color: colors.textPrimary }]}>{clinicData?.name || user?.name}</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            icon="people"
            title="Psicólogos"
            value={String(stats?.totalPsychologists || 0)}
            color="#4A90E2"
            onPress={navigateToPsychologists}
          />
          <StatCard
            icon="calendar"
            title="Consultas Hoje"
            value={String(stats?.appointmentsToday || 0)}
            color="#50C878"
            onPress={navigateToScheduleToday}
          />
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            icon="person"
            title="Pacientes Ativos"
            value={String(stats?.totalPatients || 0)}
            color="#FFB347"
            onPress={navigateToPatients}
          />
          <StatCard
            icon="trending-up"
            title="Taxa Ocupação"
            value={`${stats?.occupancyRate || 0}%`}
            color="#9B59B6"
          />
        </View>

        {/* Card de Novos Pacientes do Mês */}
        <TouchableOpacity activeOpacity={0.7} onPress={navigateToPatients}>
          <Card style={styles.newPatientsCard}>
            <View style={styles.newPatientsContent}>
              <View style={[styles.newPatientsIconContainer, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}>
                <Ionicons name="person-add" size={28} color="#4A90E2" />
              </View>
              <View style={styles.newPatientsInfo}>
                <Text style={styles.newPatientsValue}>{newPatientsThisMonth}</Text>
                <Text style={[styles.newPatientsTitle, { color: colors.textSecondary }]}>Novos Pacientes em {getCurrentMonthName()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </Card>
        </TouchableOpacity>

        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="business" size={24} color="#4A90E2" />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Informações da Clínica</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{formatAddress(clinicData?.address)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{clinicData?.phone || 'Telefone não cadastrado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{clinicData?.email || user?.email}</Text>
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
    borderBottomWidth: 1,
  },
  welcomeText: {
    fontSize: 16,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: 'bold',
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
    position: 'relative',
  },
  statCardTouchable: {
    flex: 1,
  },
  cardArrow: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
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
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  // Card de Novos Pacientes
  newPatientsCard: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  newPatientsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newPatientsIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPatientsInfo: {
    flex: 1,
    marginLeft: 16,
  },
  newPatientsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  newPatientsTitle: {
    fontSize: 14,
    marginTop: 2,
  },
});
