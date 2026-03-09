import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as psychologistService from '../../services/psychologistService';
import * as appointmentService from '../../services/appointmentService';
import NotificationBell from '../../components/NotificationBell';

interface AppointmentsByDate {
  [date: string]: psychologistService.Appointment[];
}

// Horários do dia para visualização diária (07:00 às 20:00)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

// Nomes dos dias da semana para a linha semanal
const WEEK_DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function PsychScheduleScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [appointments, setAppointments] = useState<AppointmentsByDate>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<psychologistService.Appointment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState<'online' | 'in_person'>('in_person');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const psychologistId = user?._id || user?.id;
      if (!psychologistId) {
        setLoading(false);
        return;
      }

      const data = await psychologistService.getMyAppointments(psychologistId);

      const byDate: AppointmentsByDate = {};
      data.forEach((apt) => {
        const aptDateTime = apt.dateTime || apt.date;
        if (!aptDateTime) return;
        const date = aptDateTime.split('T')[0];
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(apt);
      });

      Object.keys(byDate).forEach((date) => {
        byDate[date].sort((a, b) => {
          const timeA = new Date(a.dateTime || a.date).getTime();
          const timeB = new Date(b.dateTime || b.date).getTime();
          return timeA - timeB;
        });
      });

      setAppointments(byDate);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getDateTime = (apt: psychologistService.Appointment) => apt.dateTime || apt.date;

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '--:--';
    return new Date(dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateTime: string | undefined) => {
    if (!dateTime) return '--/--/----';
    return new Date(dateTime).toLocaleDateString('pt-BR');
  };

  const getAppointmentHour = (apt: psychologistService.Appointment): number => {
    const dt = getDateTime(apt);
    if (!dt) return 0;
    return new Date(dt).getHours();
  };

  // Retorna os 7 dias (Dom–Sáb) da semana da data fornecida
  const getWeekDates = useCallback((dateStr: string): string[] => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, []);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let dates: string[] = [];
    let label = '';

    if (viewMode === 'day') {
      dates = [selectedDate];
      label = 'Hoje';
    } else if (viewMode === 'week') {
      dates = getWeekDates(selectedDate);
      label = 'Semana';
    } else {
      const d = new Date(selectedDate + 'T00:00:00');
      const year = d.getFullYear();
      const month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      dates = Array.from({ length: daysInMonth }, (_, i) => {
        const day = new Date(year, month, i + 1);
        return day.toISOString().split('T')[0];
      });
      label = 'Mês';
    }

    let total = 0;
    let confirmed = 0;
    let pending = 0;

    dates.forEach((date) => {
      const dayAppts = appointments[date] || [];
      total += dayAppts.length;
      confirmed += dayAppts.filter((a) => a.status === 'confirmed').length;
      pending += dayAppts.filter((a) =>
        ['pending', 'scheduled', 'awaiting_patient', 'awaiting_psychologist'].includes(a.status)
      ).length;
    });

    return { total, confirmed, pending, label };
  }, [viewMode, selectedDate, appointments, getWeekDates]);

  // ─── Marked dates para o calendário ──────────────────────────────────────

  const markedDates = useMemo(() => {
    const marked: any = {};

    Object.keys(appointments).forEach((date) => {
      const dayAppts = appointments[date] || [];
      const hasConfirmed = dayAppts.some((a) => a.status === 'confirmed');
      const hasPending = dayAppts.some((a) =>
        ['pending', 'scheduled', 'awaiting_patient', 'awaiting_psychologist'].includes(a.status)
      );

      marked[date] = {
        marked: true,
        dotColor: hasConfirmed ? '#50C878' : hasPending ? '#FFB347' : '#4A90E2',
        selected: date === selectedDate,
        selectedColor: '#4A90E2',
      };
    });

    if (!marked[selectedDate]) {
      marked[selectedDate] = { selected: true, selectedColor: '#4A90E2' };
    }

    return marked;
  }, [appointments, selectedDate]);

  // ─── Status helpers ───────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#50C878';
      case 'awaiting_patient': return '#FFB347';
      case 'awaiting_psychologist': return '#9B59B6';
      case 'pending':
      case 'scheduled': return '#FFB347';
      case 'completed': return '#4A90E2';
      case 'cancelled': return '#FF6B6B';
      default: return '#999';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'awaiting_patient': return 'Aguardando Paciente';
      case 'awaiting_psychologist': return 'Aguardando Confirmação';
      case 'pending':
      case 'scheduled': return 'Aguardando';
      case 'completed': return 'Realizada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getPaymentStatusLabel = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'Pago';
      case 'pending': return 'Aguardando Pagamento';
      case 'awaiting_confirmation': return 'Aguardando Assinatura';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return 'Não informado';
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return '#50C878';
      case 'pending': return '#FFB347';
      case 'awaiting_confirmation': return '#9B59B6';
      case 'cancelled': return '#FF6B6B';
      case 'refunded': return '#4A90E2';
      default: return '#999';
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'online': return 'Online';
      case 'in_person': return 'Presencial';
      default: return 'Consulta';
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleOpenDetail = async (appointment: psychologistService.Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
    setLoadingDetails(true);
    try {
      const details = await appointmentService.getAppointmentDetails(
        appointment._id || appointment.id || ''
      );
      setSelectedAppointment({ ...appointment, ...details });
    } catch {
      // mantém dados originais
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await appointmentService.confirmAppointment(appointmentId);
      Alert.alert('Sucesso', 'Consulta confirmada!');
      setShowDetailModal(false);
      loadAppointments();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível confirmar a consulta');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancelar Consulta',
      'Tem certeza que deseja cancelar esta consulta?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentService.cancelAppointment(appointmentId);
              Alert.alert('Sucesso', 'Consulta cancelada!');
              setShowDetailModal(false);
              loadAppointments();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível cancelar a consulta');
            }
          },
        },
      ]
    );
  };

  const handleEditAppointment = () => {
    if (!selectedAppointment) return;
    const dateTime = getDateTime(selectedAppointment);
    if (dateTime) {
      const d = new Date(dateTime);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      setEditDate(`${day}/${month}/${year}`);
      setEditTime(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } else {
      setEditDate('');
      setEditTime('');
    }
    setEditType((selectedAppointment.type as 'online' | 'in_person') || 'in_person');
    setEditNotes(selectedAppointment.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAppointment) return;
    const appointmentId = selectedAppointment._id || selectedAppointment.id || '';
    if (!appointmentId) return;

    const dateParts = editDate.split('/');
    if (dateParts.length !== 3) {
      Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/AAAA');
      return;
    }
    const [day, month, year] = dateParts;

    const timeParts = editTime.split(':');
    if (timeParts.length !== 2) {
      Alert.alert('Erro', 'Horário inválido. Use o formato HH:MM');
      return;
    }
    const [hours, minutes] = timeParts;

    const newDate = new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(hours), parseInt(minutes)
    );

    if (isNaN(newDate.getTime())) {
      Alert.alert('Erro', 'Data ou horário inválido');
      return;
    }

    setSaving(true);
    try {
      await appointmentService.updateAppointment(appointmentId, {
        date: newDate.toISOString(),
        type: editType,
        notes: editNotes.trim() || undefined,
      });
      Alert.alert('Sucesso', 'Consulta atualizada! O paciente será notificado.');
      setIsEditing(false);
      setShowDetailModal(false);
      loadAppointments();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível atualizar a consulta');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render: Linha semanal (substituindo calendário no modo semana) ────────

  const renderWeekStrip = () => {
    const weekDates = getWeekDates(selectedDate);
    const today = new Date().toISOString().split('T')[0];

    // Navegação para semana anterior/próxima
    const goToPrevWeek = () => {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    };
    const goToNextWeek = () => {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    };

    // Rótulo do período (ex: "2 – 8 Mar")
    const first = new Date(weekDates[0] + 'T00:00:00');
    const last = new Date(weekDates[6] + 'T00:00:00');
    const periodLabel =
      first.getMonth() === last.getMonth()
        ? `${first.getDate()} – ${last.getDate()} ${last.toLocaleDateString('pt-BR', { month: 'short' })}`
        : `${first.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;

    return (
      <View style={[styles.weekStripWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.weekStripNav}>
          <TouchableOpacity onPress={goToPrevWeek} style={styles.weekNavBtn}>
            <Ionicons name="chevron-back" size={22} color="#4A90E2" />
          </TouchableOpacity>
          <Text style={[styles.weekPeriodLabel, { color: colors.textPrimary }]}>{periodLabel}</Text>
          <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavBtn}>
            <Ionicons name="chevron-forward" size={22} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekStrip}>
          {weekDates.map((date, idx) => {
            const dayNum = new Date(date + 'T00:00:00').getDate();
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const hasAppts = (appointments[date] || []).length > 0;
            const dotColor = (() => {
              if (!hasAppts) return 'transparent';
              const dayAppts = appointments[date] || [];
              const hasConfirmed = dayAppts.some((a) => a.status === 'confirmed');
              return hasConfirmed ? '#50C878' : '#FFB347';
            })();

            return (
              <TouchableOpacity
                key={date}
                style={[
                  styles.weekDayCell,
                  isSelected && { backgroundColor: '#4A90E2', borderRadius: 10 },
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.weekDayLabel,
                    { color: isSelected ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {WEEK_DAY_LABELS[idx]}
                </Text>
                <Text
                  style={[
                    styles.weekDayNum,
                    {
                      color: isSelected ? '#fff' : isToday ? '#4A90E2' : colors.textPrimary,
                      fontWeight: isToday ? 'bold' : '400',
                    },
                  ]}
                >
                  {dayNum}
                </Text>
                <View
                  style={[
                    styles.weekDayDot,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : dotColor },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── Render: Visão diária com grade de horários ───────────────────────────

  const renderDayView = () => {
    const dayAppts = appointments[selectedDate] || [];

    return (
      <ScrollView style={[styles.dayViewContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.dayHeader, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.dayHeaderText, { color: colors.textPrimary }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

        {HOURS.map((hour) => {
          const hourAppts = dayAppts.filter((a) => getAppointmentHour(a) === hour);
          const formattedHour = `${hour.toString().padStart(2, '0')}:00`;

          return (
            <View key={hour} style={[styles.hourRow, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.hourLabel, { backgroundColor: colors.surfaceSecondary, borderRightColor: colors.borderLight }]}>
                <Text style={[styles.hourText, { color: colors.textSecondary }]}>{formattedHour}</Text>
              </View>
              <View style={styles.hourContent}>
                {hourAppts.length === 0 ? (
                  <View style={styles.emptyHourSlot} />
                ) : (
                  hourAppts.map((appt, idx) => (
                    <TouchableOpacity
                      key={appt._id || idx}
                      style={[
                        styles.hourAppointment,
                        {
                          borderLeftColor: getStatusColor(appt.status),
                          backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF',
                        },
                      ]}
                      onPress={() => handleOpenDetail(appt)}
                    >
                      <Text style={styles.hourApptTime}>{formatTime(getDateTime(appt))}</Text>
                      <Text style={[styles.hourApptPatient, { color: colors.textPrimary }]} numberOfLines={1}>
                        {appt.patient?.name || 'Paciente não informado'}
                      </Text>
                      <Text style={[styles.hourApptType, { color: colors.textSecondary }]} numberOfLines={1}>
                        {getTypeLabel(appt.type)}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // ─── Render: Lista de consultas (modo mês e semana) ───────────────────────

  const renderAppointmentsList = () => {
    const appts: psychologistService.Appointment[] =
      viewMode === 'week'
        ? getWeekDates(selectedDate).flatMap((date) => appointments[date] || [])
        : appointments[selectedDate] || [];

    if (appts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum compromisso agendado</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            {viewMode === 'week' ? 'Nesta semana' : 'Neste dia'}
          </Text>
          <TouchableOpacity
            style={styles.addAppointmentButton}
            onPress={() => navigation.navigate('AppointmentBooking', { date: selectedDate })}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addAppointmentText}>Agendar Consulta</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.appointmentsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {appts.map((appt) => (
          <Card key={appt._id || appt.id} style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={20} color="#4A90E2" />
                <Text style={[styles.appointmentTime, { color: colors.textPrimary }]}>
                  {viewMode === 'week' && (
                    <Text style={[styles.appointmentDateLabel, { color: colors.textSecondary }]}>
                      {new Date((getDateTime(appt) || '').split('T')[0] + 'T00:00:00')
                        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                      -{' '}
                    </Text>
                  )}
                  {formatTime(getDateTime(appt))}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appt.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(appt.status) }]}>
                  {getStatusText(appt.status)}
                </Text>
              </View>
            </View>

            <Text style={[styles.patientName, { color: colors.textPrimary }]}>
              {appt.patient?.name || 'Paciente não informado'}
            </Text>
            <Text style={[styles.appointmentType, { color: colors.textSecondary }]}>{getTypeLabel(appt.type)}</Text>

            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}
              onPress={() => handleOpenDetail(appt)}
            >
              <Ionicons name="information-circle-outline" size={18} color="#4A90E2" />
              <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
            </TouchableOpacity>
          </Card>
        ))}
      </ScrollView>
    );
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando agenda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agenda</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AppointmentBooking', { date: selectedDate })}
          >
            <Ionicons name="add-circle" size={28} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Seletor de visualização */}
      <View style={[styles.viewSelector, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {(['day', 'week', 'month'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewButton, viewMode === mode && styles.viewButtonActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[
              styles.viewButtonText,
              { color: colors.textSecondary },
              viewMode === mode && styles.viewButtonTextActive,
            ]}>
              {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resumo de estatísticas */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total ({stats.label})</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#50C878' }]}>{stats.confirmed}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Confirmadas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FFB347' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendentes</Text>
        </View>
      </View>

      {/* Calendário completo — apenas no modo Mês */}
      {viewMode === 'month' && (
        <Calendar
          style={[styles.calendar, { borderBottomColor: colors.border }]}
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: isDark ? colors.surface : '#ffffff',
            calendarBackground: isDark ? colors.surface : '#ffffff',
            textSectionTitleColor: colors.primary,
            selectedDayBackgroundColor: '#4A90E2',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#4A90E2',
            dayTextColor: isDark ? colors.textPrimary : '#2d4150',
            textDisabledColor: isDark ? '#555' : '#d9e1e8',
            dotColor: '#4A90E2',
            selectedDotColor: '#ffffff',
            arrowColor: '#4A90E2',
            monthTextColor: isDark ? colors.textPrimary : '#2d4150',
            indicatorColor: '#4A90E2',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
        />
      )}

      {/* Linha semanal — apenas no modo Semana */}
      {viewMode === 'week' && renderWeekStrip()}

      {/* Data selecionada — apenas no modo Mês */}
      {viewMode === 'month' && (
        <View style={[styles.selectedDateContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="calendar" size={20} color="#4A90E2" />
          <Text style={[styles.selectedDateText, { color: colors.textPrimary }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}

      {/* Data selecionada na semana (indicador do dia escolhido) */}
      {viewMode === 'week' && (
        <View style={[styles.selectedDateContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="calendar" size={20} color="#4A90E2" />
          <Text style={[styles.selectedDateText, { color: colors.textPrimary }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
      )}

      {/* Conteúdo principal */}
      {viewMode === 'day' ? renderDayView() : renderAppointmentsList()}

      {/* Modal de Detalhes */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowDetailModal(false); setIsEditing(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {isEditing ? 'Editar Consulta' : 'Detalhes da Consulta'}
              </Text>
              <TouchableOpacity onPress={() => { setShowDetailModal(false); setIsEditing(false); }}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingDetails && (
                <ActivityIndicator size="small" color="#4A90E2" style={{ marginVertical: 20 }} />
              )}

              {selectedAppointment && !isEditing && !loadingDetails && (
                <>
                  <View style={styles.modalSection}>
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="person-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Paciente</Text>
                        <Text style={[styles.modalInfoValue, { color: colors.textPrimary }]}>
                          {selectedAppointment.patient?.name || 'Não informado'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="calendar-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Data</Text>
                        <Text style={[styles.modalInfoValue, { color: colors.textPrimary }]}>
                          {formatDate(getDateTime(selectedAppointment))}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="time-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Horário</Text>
                        <Text style={[styles.modalInfoValue, { color: colors.textPrimary }]}>
                          {formatTime(getDateTime(selectedAppointment))}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="medical-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Tipo</Text>
                        <Text style={[styles.modalInfoValue, { color: colors.textPrimary }]}>
                          {getTypeLabel(selectedAppointment.type)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(selectedAppointment.status) }]}>
                            {getStatusText(selectedAppointment.status)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {selectedAppointment.notes && (
                      <View style={styles.modalInfoRow}>
                        <Ionicons name="document-text-outline" size={24} color="#4A90E2" />
                        <View style={styles.modalInfoContent}>
                          <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Observações</Text>
                          <Text style={[styles.modalInfoValue, { color: colors.textPrimary }]}>
                            {selectedAppointment.notes}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Seção de Pagamento */}
                  {(selectedAppointment as any).paymentId && (
                    <View style={[styles.paymentSection, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.paymentTitle, { color: colors.textPrimary }]}>Pagamento</Text>
                      <View style={styles.paymentRow}>
                        <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Status:</Text>
                        <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor((selectedAppointment as any).paymentId.status) + '20' }]}>
                          <Text style={[styles.paymentBadgeText, { color: getPaymentStatusColor((selectedAppointment as any).paymentId.status) }]}>
                            {getPaymentStatusLabel((selectedAppointment as any).paymentId.status)}
                          </Text>
                        </View>
                      </View>
                      {(selectedAppointment as any).paymentId.finalValue > 0 && (
                        <View style={styles.paymentRow}>
                          <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Valor:</Text>
                          <Text style={[styles.paymentValue, { color: colors.textPrimary }]}>
                            R$ {(selectedAppointment as any).paymentId.finalValue.toFixed(2).replace('.', ',')}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Ações */}
                  {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={[styles.modalActionButton, styles.editButton]} onPress={handleEditAppointment}>
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Editar Consulta</Text>
                      </TouchableOpacity>
                      {['awaiting_psychologist', 'scheduled', 'awaiting_patient'].includes(selectedAppointment.status) && (
                        <TouchableOpacity
                          style={[styles.modalActionButton, styles.confirmButton]}
                          onPress={() => handleConfirmAppointment(selectedAppointment._id || selectedAppointment.id || '')}
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.modalActionText}>Confirmar Consulta</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.modalActionButton, styles.cancelButton]}
                        onPress={() => handleCancelAppointment(selectedAppointment._id || selectedAppointment.id || '')}
                      >
                        <Ionicons name="close-circle" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Cancelar Consulta</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Edit Mode */}
              {selectedAppointment && isEditing && (
                <View style={styles.editForm}>
                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Paciente</Text>
                    <Text style={[styles.editPatientName, { color: colors.textPrimary }]}>
                      {selectedAppointment.patient?.name || 'Não informado'}
                    </Text>
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Data (DD/MM/AAAA)</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, borderColor: colors.border }]}
                      value={editDate}
                      onChangeText={setEditDate}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Horário (HH:MM)</Text>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, borderColor: colors.border }]}
                      value={editTime}
                      onChangeText={setEditTime}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Tipo de Consulta</Text>
                    <View style={styles.editTypeSelector}>
                      <TouchableOpacity
                        style={[styles.editTypeOption, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, editType === 'in_person' && styles.editTypeOptionSelected]}
                        onPress={() => setEditType('in_person')}
                      >
                        <Ionicons name="business" size={18} color={editType === 'in_person' ? '#fff' : '#4A90E2'} />
                        <Text style={[styles.editTypeText, editType === 'in_person' && styles.editTypeTextSelected]}>Presencial</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editTypeOption, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, editType === 'online' && styles.editTypeOptionSelected]}
                        onPress={() => setEditType('online')}
                      >
                        <Ionicons name="videocam" size={18} color={editType === 'online' ? '#fff' : '#4A90E2'} />
                        <Text style={[styles.editTypeText, editType === 'online' && styles.editTypeTextSelected]}>Online</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Observações</Text>
                    <TextInput
                      style={[styles.editInput, styles.editNotesInput, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, borderColor: colors.border }]}
                      value={editNotes}
                      onChangeText={setEditNotes}
                      placeholder="Adicione observações..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.editActions}>
                    <TouchableOpacity style={[styles.editCancelBtn, { borderColor: colors.border }]} onPress={() => setIsEditing(false)}>
                      <Text style={[styles.editCancelBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.editSaveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveEdit} disabled={saving}>
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color="#fff" />
                          <Text style={styles.editSaveBtnText}>Salvar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  addButton: { padding: 4 },

  // View selector
  viewSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewButtonActive: { borderBottomColor: '#4A90E2' },
  viewButtonText: { fontSize: 14, fontWeight: '500' },
  viewButtonTextActive: { color: '#4A90E2', fontWeight: '700' },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 2 },

  // Week strip
  weekStripWrapper: { borderBottomWidth: 1, paddingBottom: 10 },
  weekStripNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  weekNavBtn: { padding: 4 },
  weekPeriodLabel: { fontSize: 14, fontWeight: '600' },
  weekStrip: { flexDirection: 'row', paddingHorizontal: 8 },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  weekDayLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  weekDayNum: { fontSize: 16 },
  weekDayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },

  // Calendar
  calendar: { borderBottomWidth: 1 },

  // Selected date
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'capitalize',
  },

  // Day view
  dayViewContainer: { flex: 1 },
  dayHeader: { padding: 12, borderBottomWidth: 1 },
  dayHeaderText: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  hourRow: { flexDirection: 'row', minHeight: 52, borderBottomWidth: 1 },
  hourLabel: {
    width: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  hourText: { fontSize: 12 },
  hourContent: { flex: 1, padding: 4 },
  emptyHourSlot: { height: 44 },
  hourAppointment: {
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 2,
  },
  hourApptTime: { fontSize: 11, color: '#4A90E2', fontWeight: '600' },
  hourApptPatient: { fontSize: 13, fontWeight: '500' },
  hourApptType: { fontSize: 11 },

  // Appointments list
  appointmentsList: { flex: 1, padding: 16 },
  appointmentCard: { marginBottom: 12, padding: 16 },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  appointmentTime: { fontSize: 18, fontWeight: 'bold', marginLeft: 6 },
  appointmentDateLabel: { fontSize: 14, fontWeight: '400' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  patientName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  appointmentType: { fontSize: 14, marginBottom: 12 },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailsButtonText: { fontSize: 14, color: '#4A90E2', fontWeight: '600', marginLeft: 6 },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  emptySubtext: { fontSize: 14, marginBottom: 20 },
  addAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addAppointmentText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalSection: { marginBottom: 20 },
  modalInfoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  modalInfoContent: { marginLeft: 12, flex: 1 },
  modalInfoLabel: { fontSize: 12, marginBottom: 4 },
  modalInfoValue: { fontSize: 16, fontWeight: '500' },
  modalActions: { marginTop: 20 },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  editButton: { backgroundColor: '#4A90E2' },
  confirmButton: { backgroundColor: '#50C878' },
  cancelButton: { backgroundColor: '#FF6B6B' },
  modalActionText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  // Payment
  paymentSection: { padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 16 },
  paymentTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  paymentLabel: { fontSize: 14 },
  paymentValue: { fontSize: 16, fontWeight: '600' },
  paymentBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  paymentBadgeText: { fontSize: 12, fontWeight: '600' },

  // Edit form
  editForm: { gap: 16 },
  editField: { gap: 6 },
  editLabel: { fontSize: 13, fontWeight: '600' },
  editPatientName: { fontSize: 16, fontWeight: '500' },
  editInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  editNotesInput: { minHeight: 80 },
  editTypeSelector: { flexDirection: 'row', gap: 12 },
  editTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  editTypeOptionSelected: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  editTypeText: { fontSize: 14, fontWeight: '600', color: '#4A90E2' },
  editTypeTextSelected: { color: '#fff' },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 20 },
  editCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, borderWidth: 1 },
  editCancelBtnText: { fontSize: 16, fontWeight: '600' },
  editSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#50C878',
    gap: 8,
  },
  editSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
