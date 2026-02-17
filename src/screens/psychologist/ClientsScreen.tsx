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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as psychologistService from '../../services/psychologistService';
import NotificationBell from '../../components/NotificationBell';

interface PatientStats {
  sessionsCount: number;
  nextAppointment: string | null;
  lastAppointment: string | null;
  totalPaid: number;
  totalPending: number;
}

export default function ClientsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [patients, setPatients] = useState<psychologistService.Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<psychologistService.Patient | null>(null);
  const [patientStats, setPatientStats] = useState<PatientStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const psychologistId = user?._id || user?.id;
      if (!psychologistId) {
        setLoading(false);
        return;
      }
      const data = await psychologistService.getMyPatients(psychologistId);
      setPatients(data);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async (patient: psychologistService.Patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
    setPatientStats(null);

    setLoadingStats(true);
    try {
      const patientId = patient._id || patient.id;
      if (patientId) {
        const appointments = await psychologistService.getPatientAppointments(patientId);

        const getAptDate = (apt: any) => apt.dateTime || apt.date;

        const completedSessions = appointments.filter(
          (apt) => apt.status === 'completed'
        ).length;

        const now = new Date();
        const futureAppointments = appointments.filter((apt) => {
          const aptDate = new Date(getAptDate(apt));
          return aptDate >= now && ['scheduled', 'confirmed'].includes(apt.status);
        });

        futureAppointments.sort((a, b) => {
          const dateA = new Date(getAptDate(a));
          const dateB = new Date(getAptDate(b));
          return dateA.getTime() - dateB.getTime();
        });

        const nextAppointment = futureAppointments.length > 0 ? getAptDate(futureAppointments[0]) : null;

        const pastAppointments = appointments.filter((apt) => {
          const aptDate = new Date(getAptDate(apt));
          return aptDate < now && apt.status === 'completed';
        });

        pastAppointments.sort((a, b) => {
          const dateA = new Date(getAptDate(a));
          const dateB = new Date(getAptDate(b));
          return dateB.getTime() - dateA.getTime();
        });

        const lastAppointment = pastAppointments.length > 0 ? getAptDate(pastAppointments[0]) : null;

        let totalPaid = 0;
        let totalPending = 0;

        try {
          const paymentResponse = await psychologistService.api.get(
            `/payments/summary/patient/${patientId}`
          );
          const summary = paymentResponse.data?.data;
          if (summary) {
            totalPaid = summary.totalReceived || summary.totalPaid || 0;
            totalPending = summary.totalPending || 0;
          }
        } catch (paymentErr) {
          console.log('Pagamentos não disponíveis:', paymentErr);
        }

        setPatientStats({
          sessionsCount: completedSessions,
          nextAppointment,
          lastAppointment,
          totalPaid,
          totalPending,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#50C878';
      case 'new':
        return '#4A90E2';
      case 'inactive':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'new':
        return 'Novo';
      case 'inactive':
        return 'Inativo';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando pacientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Meus Pacientes</Text>
        <View style={styles.headerButtons}>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
          <TouchableOpacity
            style={[styles.invitationsButton, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8FFF0' }]}
            onPress={() => navigation.navigate('Invitations')}
          >
            <Ionicons name="mail-open" size={18} color="#50C878" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InvitePatient')}
          >
            <Ionicons name="mail" size={18} color="#fff" />
            <Text style={styles.inviteButtonText}>Convidar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddClient')}
          >
            <Ionicons name="person-add" size={24} color="#50C878" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar paciente..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.list}>
        {filteredPatients.map((patient) => (
          <Card key={patient._id || patient.id}>
            <View style={styles.clientHeader}>
              {patient.avatar ? (
                <Image source={{ uri: patient.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {patient.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
              )}
              <View style={styles.clientInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{patient.name}</Text>
                  {patient.status && (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(patient.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(patient.status) },
                        ]}
                      >
                        {getStatusLabel(patient.status)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{patient.email}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.detailsButton, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}
              onPress={() => handleOpenModal(patient)}
            >
              <Ionicons name="information-circle-outline" size={20} color="#4A90E2" />
              <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
            </TouchableOpacity>
          </Card>
        ))}

        {filteredPatients.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: colors.textTertiary }]}>
              {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de Detalhes */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Detalhes do Paciente</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedPatient && (
                <>
                  {/* Info do Paciente */}
                  <View style={styles.modalSection}>
                    {selectedPatient.avatar ? (
                      <Image source={{ uri: selectedPatient.avatar }} style={styles.modalAvatarImage} />
                    ) : (
                      <View style={styles.modalAvatar}>
                        <Text style={styles.modalAvatarText}>
                          {selectedPatient.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.modalName, { color: colors.textPrimary }]}>{selectedPatient.name}</Text>
                    <Text style={[styles.modalEmail, { color: colors.textSecondary }]}>{selectedPatient.email}</Text>
                    {selectedPatient.phone && (
                      <Text style={[styles.modalPhone, { color: colors.textSecondary }]}>{selectedPatient.phone}</Text>
                    )}
                  </View>

                  {/* Estatísticas */}
                  {loadingStats ? (
                    <View style={styles.modalSection}>
                      <ActivityIndicator size="small" color="#4A90E2" />
                      <Text style={[styles.loadingStatsText, { color: colors.textSecondary }]}>Carregando estatísticas...</Text>
                    </View>
                  ) : patientStats ? (
                    <View style={styles.modalSection}>
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Estatísticas</Text>
                      <View style={styles.statsGrid}>
                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="calendar-outline" size={32} color="#4A90E2" />
                          <Text style={[styles.statsNumber, { color: colors.textPrimary }]}>{patientStats.sessionsCount}</Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Sessões Realizadas</Text>
                        </View>
                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="cash-outline" size={32} color="#50C878" />
                          <Text style={[styles.statsNumber, { color: colors.textPrimary }]}>
                            {formatCurrency(patientStats.totalPaid)}
                          </Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Pago</Text>
                        </View>
                      </View>
                      <View style={styles.statsGrid}>
                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="time-outline" size={32} color="#FF9800" />
                          <Text style={[styles.statsDate, { color: colors.textPrimary }]}>
                            {formatDate(patientStats.nextAppointment)}
                          </Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Próxima Sessão</Text>
                        </View>
                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="wallet-outline" size={32} color="#E74C3C" />
                          <Text style={[styles.statsNumber, { color: colors.textPrimary }]}>
                            {formatCurrency(patientStats.totalPending)}
                          </Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>A Receber</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Ações */}
                  <View style={styles.modalSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ações</Text>
                    <TouchableOpacity
                      style={[styles.modalActionButton, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        setShowModal(false);
                        const patientId = selectedPatient?._id || selectedPatient?.id;
                        navigation.navigate('DirectChat', {
                          recipientId: patientId,
                          recipientName: selectedPatient?.name,
                          recipientRole: 'patient',
                        });
                      }}
                    >
                      <Ionicons name="chatbubbles" size={20} color="#4A90E2" />
                      <Text style={[styles.modalActionText, { color: colors.textPrimary }]}>Enviar Mensagem</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        setShowModal(false);
                        navigation.navigate('MedicalRecord', {
                          patient: selectedPatient,
                        });
                      }}
                    >
                      <Ionicons name="document-text" size={20} color="#4A90E2" />
                      <Text style={[styles.modalActionText, { color: colors.textPrimary }]}>Ver Prontuário</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        setShowModal(false);
                        const patientId = selectedPatient?._id || selectedPatient?.id;
                        navigation.navigate('TherapeuticReportList', {
                          patientId,
                          patientName: selectedPatient?.name,
                        });
                      }}
                    >
                      <Ionicons name="sparkles" size={20} color="#9C27B0" />
                      <Text style={[styles.modalActionText, { color: '#9C27B0' }]}>
                        Relatório Terapêutico (IA)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        setShowModal(false);
                        navigation.navigate('AppointmentBooking', {
                          patient: selectedPatient,
                        });
                      }}
                    >
                      <Ionicons name="calendar" size={20} color="#50C878" />
                      <Text style={[styles.modalActionText, { color: '#50C878' }]}>
                        Agendar Consulta
                      </Text>
                    </TouchableOpacity>
                  </View>
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
    fontSize: 20,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invitationsButton: {
    padding: 8,
    borderRadius: 8,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#50C878',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 10,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clientInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    marginBottom: 24,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  modalPhone: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'flex-start',
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%',
  },
  statsCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statsDate: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  statsLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingStatsText: {
    fontSize: 14,
    marginTop: 8,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    width: '100%',
  },
  modalActionText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
});
