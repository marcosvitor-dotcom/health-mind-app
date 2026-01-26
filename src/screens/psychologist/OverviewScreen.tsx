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
import * as psychologistService from '../../services/psychologistService';

export default function OverviewScreen({ navigation }: any) {
  const { user } = useAuth();
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.subtitle}>Aqui está um resumo do seu dia</Text>
          </View>
          {user?.clinicId && (
            <View style={styles.clinicBadge}>
              <Ionicons name="business" size={16} color="#50C878" />
              <Text style={styles.clinicBadgeText}>Vinculado</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E8F4FD' }]}>
            <Ionicons name="people" size={32} color="#4A90E2" />
            <Text style={styles.statNumber}>{stats?.totalPatients || 0}</Text>
            <Text style={styles.statLabel}>Pacientes</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="calendar-outline" size={32} color="#FF9800" />
            <Text style={styles.statNumber}>{stats?.todayAppointments.length || 0}</Text>
            <Text style={styles.statLabel}>Hoje</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E8FFF0' }]}>
            <Ionicons name="time-outline" size={32} color="#50C878" />
            <Text style={styles.statNumber}>{stats?.pendingSessions || 0}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#9C27B0" />
            <Text style={styles.statNumber}>{stats?.completedSessions || 0}</Text>
            <Text style={styles.statLabel}>Completas</Text>
          </View>
        </View>

        {/* Next Appointment */}
        {stats?.nextAppointment && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alarm-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Próxima Consulta</Text>
            </View>
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentTime}>
                <Text style={styles.appointmentTimeText}>
                  {formatDateTime(getDateTime(stats.nextAppointment)).time}
                </Text>
                <Text style={styles.appointmentDateText}>
                  {formatDateTime(getDateTime(stats.nextAppointment)).date}
                </Text>
              </View>
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentPatient}>
                  {stats.nextAppointment.patient?.name || 'Paciente'}
                </Text>
                <View style={styles.appointmentMeta}>
                  <Ionicons name="time" size={14} color="#666" />
                  <Text style={styles.appointmentMetaText}>
                    {stats.nextAppointment.duration || 50} min
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.appointmentButton}>
                <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Appointments */}
        {stats?.todayAppointments && stats.todayAppointments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="today-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Consultas de Hoje</Text>
            </View>
            {stats.todayAppointments.slice(0, 3).map((appointment) => (
              <View key={appointment._id || appointment.id} style={styles.todayAppointmentItem}>
                <View style={styles.todayAppointmentTime}>
                  <Text style={styles.todayAppointmentTimeText}>
                    {formatDateTime(getDateTime(appointment)).time}
                  </Text>
                </View>
                <View style={styles.todayAppointmentInfo}>
                  <Text style={styles.todayAppointmentPatient}>
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
                    <Text style={styles.todayAppointmentStatusText}>
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
                <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Financial Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={24} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
          </View>
          <View style={styles.financialGrid}>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Recebido (mês)</Text>
              <Text style={styles.financialValue}>{formatCurrency(stats?.monthRevenue || 0)}</Text>
            </View>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>A Receber</Text>
              <Text style={[styles.financialValue, { color: '#FF9800' }]}>
                {formatCurrency(stats?.pendingRevenue || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={24} color="#4A90E2" />
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          </View>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Clients', { screen: 'InvitePatient' })}
            >
              <Ionicons name="person-add" size={28} color="#50C878" />
              <Text style={styles.actionText}>Convidar Paciente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Schedule')}
            >
              <Ionicons name="calendar" size={28} color="#4A90E2" />
              <Text style={styles.actionText}>Ver Agenda</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Clients')}
            >
              <Ionicons name="people" size={28} color="#9C27B0" />
              <Text style={styles.actionText}>Meus Pacientes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Reports')}
            >
              <Ionicons name="stats-chart" size={28} color="#FF9800" />
              <Text style={styles.actionText}>Relatórios</Text>
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
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  clinicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FFF0',
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
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginLeft: 8,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
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
    color: '#666',
    marginTop: 4,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentPatient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentMetaText: {
    fontSize: 14,
    color: '#666',
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
    borderBottomColor: '#f0f0f0',
  },
  todayAppointmentTime: {
    width: 60,
    marginRight: 16,
  },
  todayAppointmentTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  todayAppointmentInfo: {
    flex: 1,
  },
  todayAppointmentPatient: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
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
    color: '#666',
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
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  financialLabel: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});
