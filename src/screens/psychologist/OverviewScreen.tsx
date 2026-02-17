import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as psychologistService from '../../services/psychologistService';
import NotificationBell from '../../components/NotificationBell';

export default function OverviewScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<psychologistService.OverviewStats | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const psychologistId = user?._id || user?.id;
      if (psychologistId) {
        const data = await psychologistService.getOverviewStats(psychologistId);
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return { time: '--:--', date: '--/--' };
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    };
  };

  const getDateTime = (apt: psychologistService.Appointment) => {
    return apt.dateTime || apt.date;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>Olá, {user?.name?.split(' ')[0]}!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Aqui está um resumo do seu dia</Text>
          </View>
          {user?.clinicId && (
            <View style={[styles.clinicBadge, { backgroundColor: isDark ? '#1F3D1F' : '#E8FFF0' }]}>
              <Ionicons name="business" size={16} color="#50C878" />
              <Text style={styles.clinicBadgeText}>Vinculado</Text>
            </View>
          )}
          <NotificationBell onPress={() => navigation.navigate('Clients', { screen: 'Notifications' })} />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
            <Ionicons name="people" size={32} color="#4A90E2" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats?.totalPatients || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pacientes</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#3D3020' : '#FFF4E6' }]}>
            <Ionicons name="calendar-outline" size={32} color="#FF9800" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats?.todayAppointments.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hoje</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F3D1F' : '#E8FFF0' }]}>
            <Ionicons name="time-outline" size={32} color="#50C878" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats?.pendingSessions || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendentes</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D1F3D' : '#F3E5F5' }]}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#9C27B0" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{stats?.completedSessions || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completas</Text>
          </View>
        </View>

        {/* Next Appointment */}
        {stats?.nextAppointment && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alarm-outline" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Próxima Consulta</Text>
            </View>
            <View style={[styles.appointmentCard, { backgroundColor: colors.surfaceSecondary }]}>
              <View style={styles.appointmentTime}>
                <Text style={styles.appointmentTimeText}>
                  {formatDateTime(getDateTime(stats.nextAppointment)).time}
                </Text>
                <Text style={[styles.appointmentDateText, { color: colors.textSecondary }]}>
                  {formatDateTime(getDateTime(stats.nextAppointment)).date}
                </Text>
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={[styles.appointmentPatient, { color: colors.textPrimary }]}>
                  {stats.nextAppointment.patient?.name || 'Paciente'}
                </Text>
                <View style={styles.appointmentMeta}>
                  <Ionicons name="time" size={14} color={colors.textSecondary} />
                  <Text style={[styles.appointmentMetaText, { color: colors.textSecondary }]}>
                    {stats.nextAppointment.duration || 50} min
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.appointmentButton}>
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Appointments */}
        {stats?.todayAppointments && stats.todayAppointments.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="today-outline" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Consultas de Hoje</Text>
            </View>
            {stats.todayAppointments.slice(0, 3).map((appointment) => (
              <View key={appointment._id || appointment.id} style={[styles.todayAppointmentItem, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.todayAppointmentTime}>
                  <Text style={[styles.todayAppointmentTimeText, { color: colors.textPrimary }]}>
                    {formatDateTime(getDateTime(appointment)).time}
                  </Text>
                </View>
                <View style={styles.todayAppointmentInfo}>
                  <Text style={[styles.todayAppointmentPatient, { color: colors.textPrimary }]}>
                    {appointment.patient?.name || 'Paciente'}
                  </Text>
                  <View style={styles.todayAppointmentStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            appointment.status === 'confirmed'
                              ? '#50C878'
                              : appointment.status === 'scheduled'
                              ? '#FF9800'
                              : '#999',
                        },
                      ]}
                    />
                    <Text style={[styles.todayAppointmentStatusText, { color: colors.textSecondary }]}>
                      {appointment.status === 'confirmed'
                        ? 'Confirmado'
                        : appointment.status === 'scheduled'
                        ? 'Agendado'
                        : appointment.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {stats.todayAppointments.length > 3 && (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => navigation.navigate('Schedule')}
              >
                <Text style={styles.seeAllText}>
                  Ver todas ({stats.todayAppointments.length})
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Financial Summary */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Resumo Financeiro</Text>
          </View>
          <View style={styles.financialGrid}>
            <View style={[styles.financialCard, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Recebido (mês)</Text>
              <Text style={styles.financialValue}>{formatCurrency(stats?.monthRevenue || 0)}</Text>
            </View>
            <View style={[styles.financialCard, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>A Receber</Text>
              <Text style={[styles.financialValue, { color: '#FF9800' }]}>
                {formatCurrency(stats?.pendingRevenue || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ações Rápidas</Text>
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => navigation.navigate('Clients', { screen: 'InvitePatient' })}
            >
              <Ionicons name="person-add" size={28} color="#50C878" />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Convidar Paciente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => navigation.navigate('Schedule')}
            >
              <Ionicons name="calendar" size={28} color="#4A90E2" />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Ver Agenda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => navigation.navigate('Clients')}
            >
              <Ionicons name="people" size={28} color="#9C27B0" />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Meus Pacientes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => navigation.navigate('Reports')}
            >
              <Ionicons name="stats-chart" size={28} color="#FF9800" />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Relatórios</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  clinicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clinicBadgeText: {
    fontSize: 12,
    color: '#50C878',
    marginLeft: 4,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  appointmentTime: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  appointmentTimeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  appointmentDateText: {
    fontSize: 12,
    marginTop: 4,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentPatient: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentMetaText: {
    fontSize: 14,
    marginLeft: 4,
  },
  appointmentButton: {
    padding: 8,
  },
  todayAppointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  todayAppointmentTime: {
    width: 60,
    marginRight: 16,
  },
  todayAppointmentTimeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  todayAppointmentInfo: {
    flex: 1,
  },
  todayAppointmentPatient: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  todayAppointmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  todayAppointmentStatusText: {
    fontSize: 13,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  financialLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  financialValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#50C878',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});
