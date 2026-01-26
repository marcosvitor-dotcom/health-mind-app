import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import * as psychologistService from '../../services/psychologistService';

interface AppointmentsByDate {
  [date: string]: psychologistService.Appointment[];
}

export default function PsychScheduleScreen({ navigation }: any) {
  const { user } = useAuth();
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

  const handleOpenDetail = (appointment: psychologistService.Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      // TODO: Chamar API para confirmar agendamento
      Alert.alert('Sucesso', 'Consulta confirmada!');
      setShowDetailModal(false);
      loadAppointments();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível confirmar a consulta');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      Alert.alert(
        'Cancelar Consulta',
        'Tem certeza que deseja cancelar esta consulta?',
        [
          { text: 'Não', style: 'cancel' },
          {
            text: 'Sim, Cancelar',
            style: 'destructive',
            onPress: async () => {
              // TODO: Chamar API para cancelar agendamento
              Alert.alert('Sucesso', 'Consulta cancelada!');
              setShowDetailModal(false);
              loadAppointments();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível cancelar a consulta');
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
        return 'Confirmado';
      case 'scheduled':
        return 'Agendado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
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
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum compromisso agendado</Text>
          <TouchableOpacity
            style={styles.addAppointmentButton}
            onPress={() => navigation.navigate('Clients')}
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
                <Text style={styles.appointmentTime}>{formatTime(getDateTime(appt))}</Text>
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

            <Text style={styles.patientName}>
              {appt.patient?.name || 'Paciente não informado'}
            </Text>
            <Text style={styles.appointmentType}>{appt.type || 'Consulta'}</Text>

            <TouchableOpacity
              style={styles.detailsButton}
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando agenda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Clients')}
        >
          <Ionicons name="add-circle" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Calendário */}
      <Calendar
        style={styles.calendar}
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#4A90E2',
          selectedDayBackgroundColor: '#4A90E2',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#4A90E2',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#4A90E2',
          selectedDotColor: '#ffffff',
          arrowColor: '#4A90E2',
          monthTextColor: '#2d4150',
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
      <View style={styles.selectedDateContainer}>
        <Ionicons name="calendar" size={20} color="#4A90E2" />
        <Text style={styles.selectedDateText}>
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
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Consulta</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedAppointment && (
                <>
                  <View style={styles.modalSection}>
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="person-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Paciente</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedAppointment.patient?.name || 'Não informado'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="calendar-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Data</Text>
                        <Text style={styles.modalInfoValue}>
                          {formatDate(getDateTime(selectedAppointment))}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="time-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Horário</Text>
                        <Text style={styles.modalInfoValue}>
                          {formatTime(getDateTime(selectedAppointment))}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="medical-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Tipo</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedAppointment.type || 'Consulta'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalInfoRow}>
                      <Ionicons name="information-circle-outline" size={24} color="#4A90E2" />
                      <View style={styles.modalInfoContent}>
                        <Text style={styles.modalInfoLabel}>Status</Text>
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
                          <Text style={styles.modalInfoLabel}>Observações</Text>
                          <Text style={styles.modalInfoValue}>
                            {selectedAppointment.notes}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Ações */}
                  {selectedAppointment.status === 'scheduled' && (
                    <View style={styles.modalActions}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    color: '#333',
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
    color: '#333',
    marginBottom: 4,
  },
  appointmentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E8F4FD',
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
    color: '#666',
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#666',
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
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
});
