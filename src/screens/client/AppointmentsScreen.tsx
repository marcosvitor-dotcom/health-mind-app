import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import { AppointmentData } from '../../services/appointmentService';

export default function AppointmentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentData[]>([]);
  const [pastAppointments, setPastAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const patientId = user?._id || user?.id || '';

  const loadAppointments = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      const data = await appointmentService.getPatientAppointments(patientId, 1, 50);
      const now = new Date();

      const upcoming: AppointmentData[] = [];
      const past: AppointmentData[] = [];

      (data.appointments || []).forEach((apt) => {
        const aptDate = new Date(apt.date);
        if (aptDate >= now && apt.status !== 'completed' && apt.status !== 'cancelled') {
          upcoming.push(apt);
        } else {
          past.push(apt);
        }
      });

      upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setUpcomingAppointments(upcoming);
      setPastAppointments(past);
    } catch (error) {
      console.error('Erro ao carregar consultas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAppointments();
  }, [loadAppointments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#50C878';
      case 'pending':
      case 'scheduled':
        return '#FFB347';
      case 'completed':
        return '#4A90E2';
      case 'cancelled':
        return '#FF6B6B';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
      case 'scheduled':
        return 'Aguardando';
      case 'completed':
        return 'Realizada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPsychologistName = (psychologistId: AppointmentData['psychologistId']) => {
    if (typeof psychologistId === 'object' && psychologistId !== null) {
      return psychologistId.name;
    }
    return 'Psicologo';
  };

  const AppointmentCard = ({ appointment, isPast = false }: { appointment: AppointmentData; isPast?: boolean }) => {
    const date = new Date(appointment.date);
    return (
      <Card>
        <View style={styles.appointmentHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.day}>
              {date.getDate()}
            </Text>
            <Text style={styles.month}>
              {date.toLocaleDateString('pt-BR', { month: 'short' })}
            </Text>
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.time}>
              {date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.psychologist}>{getPsychologistName(appointment.psychologistId)}</Text>
            <Text style={styles.type}>{appointment.type || 'Consulta Regular'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(appointment.status) + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(appointment.status) },
              ]}
            >
              {getStatusLabel(appointment.status)}
            </Text>
          </View>
        </View>

        {!isPast && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="calendar" size={18} color="#4A90E2" />
              <Text style={styles.actionText}>Reagendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]}>
              <Ionicons name="close-circle" size={18} color="#FF6B6B" />
              <Text style={[styles.actionText, { color: '#FF6B6B' }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando consultas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity
        style={styles.newAppointmentButton}
        onPress={() => navigation.navigate('BookAppointment')}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.newAppointmentText}>Agendar Nova Consulta</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proximas Consultas</Text>
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment._id} appointment={appointment} />
            ))
          ) : (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>Nenhuma consulta agendada</Text>
              </View>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultas Anteriores</Text>
          {pastAppointments.length > 0 ? (
            pastAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment._id}
                appointment={appointment}
                isPast
              />
            ))
          ) : (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>Nenhuma consulta anterior</Text>
              </View>
            </Card>
          )}
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
    fontSize: 14,
    color: '#666',
  },
  newAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  newAppointmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  day: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  month: {
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
  },
  appointmentInfo: {
    flex: 1,
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  psychologist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  type: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 4,
  },
  cancelButton: {
    borderColor: '#FF6B6B',
  },
  actionText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
});
