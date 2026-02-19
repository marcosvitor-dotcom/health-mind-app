import React, { useState, useEffect } from 'react';
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

      // Organizar por data
      const byDate: AppointmentsByDate = {};
      data.forEach((apt) => {
        const aptDateTime = apt.dateTime || apt.date;
        if (!aptDateTime) return;
        const date = aptDateTime.split('T')[0];
        if (!byDate[date]) {
          byDate[date] = [];
        }
        byDate[date].push(apt);
      });

      // Ordenar por horário
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

  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleOpenDetail = async (appointment: psychologistService.Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
    setLoadingDetails(true);
    try {
      const details = await appointmentService.getAppointmentDetails(appointment._id || appointment.id || '');
      setSelectedAppointment({ ...appointment, ...details });
    } catch (error) {
      // Mantém os dados originais se falhar
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

    // Parse date DD/MM/YYYY
    const dateParts = editDate.split('/');
    if (dateParts.length !== 3) {
      Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/AAAA');
      return;
    }
    const [day, month, year] = dateParts;

    // Parse time HH:MM
    const timeParts = editTime.split(':');
    if (timeParts.length !== 2) {
      Alert.alert('Erro', 'Horário inválido. Use o formato HH:MM');
      return;
    }
    const [hours, minutes] = timeParts;

    // Build ISO date
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

  // Marcar datas com compromissos
  const markedDates = Object.keys(appointments).reduce((acc, date) => {
    acc[date] = {
      marked: true,
      dotColor: '#4A90E2',
      selected: date === selectedDate,
      selectedColor: '#4A90E2',
    };
    return acc;
  }, {} as any);

  // Adiciona a data selecionada mesmo que não tenha compromissos
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: '#4A90E2',
    };
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#50C878';
      case 'awaiting_patient':
        return '#FFB347';
      case 'awaiting_psychologist':
        return '#9B59B6';
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'awaiting_patient':
        return 'Aguardando Paciente';
      case 'awaiting_psychologist':
        return 'Aguardando Confirmação';
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

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '--:--';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateTime: string | undefined) => {
    if (!dateTime) return '--/--/----';
    const date = new Date(dateTime);
    return date.toLocaleDateString('pt-BR');
  };

  const getDateTime = (apt: psychologistService.Appointment) => {
    return apt.dateTime || apt.date;
  };

  const renderDayAppointments = () => {
    const dayAppointments = appointments[selectedDate] || [];

    if (dayAppointments.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum compromisso agendado</Text>
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
        {dayAppointments.map((appt) => (
          <Card key={appt._id || appt.id} style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={20} color="#4A90E2" />
                <Text style={[styles.appointmentTime, { color: colors.textPrimary }]}>{formatTime(getDateTime(appt))}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(appt.status) + '20' },
                ]}
              >
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

      {/* Calendário */}
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

      {/* Data Selecionada */}
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

      {/* Lista de Compromissos do Dia */}
      {renderDayAppointments()}

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
              {selectedAppointment && !isEditing && (
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
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                getStatusColor(selectedAppointment.status) + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(selectedAppointment.status) },
                            ]}
                          >
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
                      <TouchableOpacity
                        style={[styles.modalActionButton, styles.editButton]}
                        onPress={handleEditAppointment}
                      >
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Editar Consulta</Text>
                      </TouchableOpacity>
                      {(selectedAppointment.status === 'awaiting_psychologist' || selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'awaiting_patient') && (
                        <TouchableOpacity
                          style={[styles.modalActionButton, styles.confirmButton]}
                          onPress={() =>
                            handleConfirmAppointment(
                              selectedAppointment._id || selectedAppointment.id || ''
                            )
                          }
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.modalActionText}>Confirmar Consulta</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.modalActionButton, styles.cancelButton]}
                        onPress={() =>
                          handleCancelAppointment(
                            selectedAppointment._id || selectedAppointment.id || ''
                          )
                        }
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
                        style={[
                          styles.editTypeOption,
                          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                          editType === 'in_person' && styles.editTypeOptionSelected,
                        ]}
                        onPress={() => setEditType('in_person')}
                      >
                        <Ionicons name="business" size={18} color={editType === 'in_person' ? '#fff' : '#4A90E2'} />
                        <Text style={[styles.editTypeText, editType === 'in_person' && styles.editTypeTextSelected]}>
                          Presencial
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.editTypeOption,
                          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                          editType === 'online' && styles.editTypeOptionSelected,
                        ]}
                        onPress={() => setEditType('online')}
                      >
                        <Ionicons name="videocam" size={18} color={editType === 'online' ? '#fff' : '#4A90E2'} />
                        <Text style={[styles.editTypeText, editType === 'online' && styles.editTypeTextSelected]}>
                          Online
                        </Text>
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
                    <TouchableOpacity
                      style={[styles.editCancelBtn, { borderColor: colors.border }]}
                      onPress={() => setIsEditing(false)}
                    >
                      <Text style={[styles.editCancelBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}
                      onPress={handleSaveEdit}
                      disabled={saving}
                    >
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
  },
  calendar: {
    borderBottomWidth: 1,
  },
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
  appointmentsList: {
    flex: 1,
    padding: 16,
  },
  appointmentCard: {
    marginBottom: 12,
    padding: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentType: {
    fontSize: 14,
    marginBottom: 12,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
  },
  addAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addAppointmentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  modalInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 20,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: '#4A90E2',
  },
  confirmButton: {
    backgroundColor: '#50C878',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentSection: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Edit form styles
  editForm: {
    gap: 16,
  },
  editField: {
    gap: 6,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  editPatientName: {
    fontSize: 16,
    fontWeight: '500',
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  editNotesInput: {
    minHeight: 80,
  },
  editTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
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
  editTypeOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  editTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  editTypeTextSelected: {
    color: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  editCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  editCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
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
  editSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
