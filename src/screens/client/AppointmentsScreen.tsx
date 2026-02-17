import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as appointmentService from '../../services/appointmentService';
import { AppointmentData } from '../../services/appointmentService';
import NotificationBell from '../../components/NotificationBell';

export default function AppointmentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentData[]>([]);
  const [pastAppointments, setPastAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de detalhes
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'awaiting_patient':
        return 'Aguardando Confirmação';
      case 'awaiting_psychologist':
        return 'Reagendamento Solicitado';
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

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'online': return 'Online';
      case 'in_person': return 'Presencial';
      default: return 'Consulta';
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

  const getPsychologistName = (psychologistId: AppointmentData['psychologistId']) => {
    if (typeof psychologistId === 'object' && psychologistId !== null) {
      return psychologistId.name;
    }
    return 'Psicólogo';
  };

  const handleConfirmAttendance = async (appointment: AppointmentData) => {
    try {
      await appointmentService.confirmAppointment(appointment._id);
      Alert.alert('Sucesso', 'Presença confirmada!');
      loadAppointments();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível confirmar.');
    }
  };

  const handleCancelAppointment = (appointment: AppointmentData) => {
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
              await appointmentService.cancelAppointment(appointment._id);
              Alert.alert('Sucesso', 'Consulta cancelada com sucesso.');
              loadAppointments();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível cancelar a consulta.');
            }
          },
        },
      ]
    );
  };

  const handleReschedule = (appointment: AppointmentData) => {
    navigation.navigate('BookAppointment', { rescheduleId: appointment._id });
  };

  const handleOpenDetails = async (appointment: AppointmentData) => {
    setShowDetailModal(true);
    setLoadingDetails(true);
    try {
      const details = await appointmentService.getAppointmentDetails(appointment._id);
      setSelectedAppointment(details);
    } catch (error) {
      setSelectedAppointment(appointment);
    } finally {
      setLoadingDetails(false);
    }
  };

  const AppointmentCard = ({ appointment, isPast = false }: { appointment: AppointmentData; isPast?: boolean }) => {
    const date = new Date(appointment.date);
    return (
      <TouchableOpacity onPress={() => handleOpenDetails(appointment)} activeOpacity={0.7}>
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
              <Text style={[styles.time, { color: colors.textPrimary }]}>
                {date.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={[styles.psychologist, { color: colors.textSecondary }]}>{getPsychologistName(appointment.psychologistId)}</Text>
              <Text style={[styles.type, { color: colors.textTertiary }]}>{getTypeLabel(appointment.type)}</Text>
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
              {(appointment.status === 'awaiting_patient' || appointment.status === 'scheduled') && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: '#50C878' }]}
                  onPress={() => handleConfirmAttendance(appointment)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#50C878" />
                  <Text style={[styles.actionText, { color: '#50C878' }]}>Confirmar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.primary }]}
                onPress={() => handleReschedule(appointment)}
              >
                <Ionicons name="calendar" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Reagendar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelAppointment(appointment)}
              >
                <Ionicons name="close-circle" size={18} color="#FF6B6B" />
                <Text style={[styles.actionText, { color: '#FF6B6B' }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando consultas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.screenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenHeaderTitle, { color: colors.textPrimary }]}>Consultas</Text>
        <NotificationBell onPress={() => navigation.navigate('Notifications')} />
      </View>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Próximas Consultas</Text>
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment._id} appointment={appointment} />
            ))
          ) : (
            <Card>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhuma consulta agendada</Text>
              </View>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Consultas Anteriores</Text>
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
                <Ionicons name="time-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhuma consulta anterior</Text>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Modal de Detalhes */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Detalhes da Consulta</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : selectedAppointment ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Data</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {new Date(selectedAppointment.date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={22} color={colors.primary} />
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Horário</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {new Date(selectedAppointment.date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="person-outline" size={22} color={colors.primary} />
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Psicólogo</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                        {getPsychologistName(selectedAppointment.psychologistId)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name={selectedAppointment.type === 'online' ? 'videocam-outline' : 'business-outline'} size={22} color={colors.primary} />
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tipo</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{getTypeLabel(selectedAppointment.type)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                      <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedAppointment.status) + '20' }]}>
                        <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedAppointment.status) }]}>
                          {getStatusLabel(selectedAppointment.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedAppointment.notes && (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                      <View style={styles.detailInfo}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Observações</Text>
                        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{selectedAppointment.notes}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Seção de Pagamento */}
                <View style={[styles.paymentSection, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.paymentTitle, { color: colors.textPrimary }]}>Pagamento</Text>
                  {selectedAppointment.paymentId ? (
                    <View>
                      <View style={styles.paymentRow}>
                        <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Status:</Text>
                        <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(selectedAppointment.paymentId.status) + '20' }]}>
                          <Text style={[styles.paymentBadgeText, { color: getPaymentStatusColor(selectedAppointment.paymentId.status) }]}>
                            {getPaymentStatusLabel(selectedAppointment.paymentId.status)}
                          </Text>
                        </View>
                      </View>
                      {selectedAppointment.paymentId.finalValue > 0 && (
                        <View style={styles.paymentRow}>
                          <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Valor:</Text>
                          <Text style={[styles.paymentValue, { color: colors.textPrimary }]}>
                            R$ {selectedAppointment.paymentId.finalValue.toFixed(2).replace('.', ',')}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.paymentNotAvailable, { color: colors.textTertiary }]}>Informação de pagamento não disponível</Text>
                  )}
                </View>

                {/* Ações no Modal */}
                {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                  <View style={styles.modalActions}>
                    {(selectedAppointment.status === 'awaiting_patient' || selectedAppointment.status === 'scheduled') && (
                      <TouchableOpacity
                        style={[styles.modalActionButton, { backgroundColor: '#50C878' }]}
                        onPress={() => {
                          setShowDetailModal(false);
                          handleConfirmAttendance(selectedAppointment);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.modalActionText}>Confirmar Presença</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.modalActionButton, { backgroundColor: '#4A90E2' }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        navigation.navigate('BookAppointment', { rescheduleId: selectedAppointment._id });
                      }}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#fff" />
                      <Text style={styles.modalActionText}>Sugerir Nova Data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, { backgroundColor: '#FF6B6B' }]}
                      onPress={() => {
                        setShowDetailModal(false);
                        handleCancelAppointment(selectedAppointment);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.modalActionText}>Cancelar Consulta</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : null}
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
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  screenHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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
  },
  psychologist: {
    fontSize: 14,
    marginTop: 2,
  },
  type: {
    fontSize: 12,
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
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailInfo: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  paymentNotAvailable: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalActions: {
    gap: 10,
    marginBottom: 20,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  modalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
