import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as roomService from '../../services/roomService';
import { RoomSchedule } from '../../services/roomService';

export default function RoomScheduleScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const clinicId = user?._id || user?.id || '';

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<RoomSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const loadSchedule = useCallback(async () => {
    if (!clinicId) return;
    try {
      const data = await roomService.getAllRoomsSchedule(clinicId, formatDate(selectedDate));
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Erro ao carregar agenda:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, selectedDate]);

  useEffect(() => {
    setLoading(true);
    loadSchedule();
  }, [loadSchedule]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSchedule();
  }, [loadSchedule]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  const getStatusColor = (roomStatus?: string) => {
    switch (roomStatus) {
      case 'pending': return '#FFB347';
      case 'approved': return '#50C878';
      case 'rejected': return '#ccc';
      case 'changed': return '#4A90E2';
      default: return '#50C878';
    }
  };

  const getStatusLabel = (roomStatus?: string) => {
    switch (roomStatus) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rejeitada';
      case 'changed': return 'Alterada';
      default: return '';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEndTime = (dateStr: string, duration: number) => {
    const end = new Date(new Date(dateStr).getTime() + duration * 60000);
    return end.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayDate = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agenda das Salas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Date Selector */}
      <View style={[styles.dateSelector, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedDate(new Date())}
          style={styles.dateCenter}
        >
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>{displayDate}</Text>
          {!isToday && <Text style={styles.todayLink}>Ir para hoje</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhuma sala com agenda</Text>
          </View>
        ) : (
          schedules.map((schedule) => (
            <View key={schedule.room._id} style={[styles.roomSection, { backgroundColor: colors.surface }]}>
              <View style={[styles.roomSectionHeader, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.borderLight }]}>
                <Ionicons name="business" size={18} color="#4A90E2" />
                <Text style={[styles.roomSectionName, { color: colors.textPrimary }]}>{schedule.room.name}</Text>
                {schedule.room.number && (
                  <Text style={[styles.roomSectionNumber, { color: colors.textSecondary }]}>#{schedule.room.number}</Text>
                )}
                <View style={[styles.appointmentCount, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
                  <Text style={styles.appointmentCountText}>
                    {schedule.appointments.length}
                  </Text>
                </View>
              </View>

              {schedule.appointments.length === 0 ? (
                <View style={styles.noAppointments}>
                  <Text style={styles.noAppointmentsText}>Livre</Text>
                </View>
              ) : (
                schedule.appointments.map((appt) => (
                  <View
                    key={appt._id}
                    style={[
                      styles.appointmentItem,
                      { borderLeftColor: getStatusColor(appt.roomStatus), borderBottomColor: colors.borderLight },
                    ]}
                  >
                    <View style={styles.appointmentTime}>
                      <Text style={[styles.timeStart, { color: colors.textPrimary }]}>{formatTime(appt.date)}</Text>
                      <Text style={[styles.timeEnd, { color: colors.textTertiary }]}>{formatEndTime(appt.date, appt.duration)}</Text>
                    </View>
                    <View style={styles.appointmentDetails}>
                      <Text style={[styles.appointmentPsychologist, { color: colors.textPrimary }]}>
                        {appt.psychologistId?.name || 'Psicologo'}
                      </Text>
                      <Text style={[styles.appointmentPatient, { color: colors.textSecondary }]}>
                        {appt.patientId?.name || 'Paciente'}
                      </Text>
                    </View>
                    {appt.roomStatus && (
                      <View style={[styles.roomStatusBadge, { backgroundColor: getStatusColor(appt.roomStatus) + '20' }]}>
                        <Text style={[styles.roomStatusText, { color: getStatusColor(appt.roomStatus) }]}>
                          {getStatusLabel(appt.roomStatus)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          ))
        )}
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dateArrow: {
    padding: 8,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  todayLink: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingCenter: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  roomSection: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  roomSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
  },
  roomSectionName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  roomSectionNumber: {
    fontSize: 13,
  },
  appointmentCount: {
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  appointmentCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A90E2',
  },
  noAppointments: {
    padding: 16,
    alignItems: 'center',
  },
  noAppointmentsText: {
    fontSize: 14,
    color: '#50C878',
    fontWeight: '500',
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 4,
  },
  appointmentTime: {
    width: 60,
    alignItems: 'center',
  },
  timeStart: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeEnd: {
    fontSize: 12,
  },
  appointmentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  appointmentPsychologist: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentPatient: {
    fontSize: 13,
    marginTop: 2,
  },
  roomStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roomStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
