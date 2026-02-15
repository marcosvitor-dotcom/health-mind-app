import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { PatientBasic, ClinicPsychologist } from '../../services/clinicService';

interface Patient extends PatientBasic {
  psychologistId?: any;
  psychologist?: {
    _id?: string;
    name?: string;
  };
}

export default function PatientsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [psychologists, setPsychologists] = useState<ClinicPsychologist[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [selectedPsychologistFilter, setSelectedPsychologistFilter] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Modal de atribuição
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPsychologistId, setSelectedPsychologistId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Modal de contato do paciente
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPatient, setContactPatient] = useState<Patient | null>(null);
  const [patientStats, setPatientStats] = useState<{
    sessionsCount: number;
    nextAppointment: string | null;
    totalPaid: number;
    totalPending: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Carregar psicólogos
  const loadPsychologists = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await clinicService.getClinicPsychologists(user.id);
      setPsychologists(data);
    } catch (err) {
      console.error('Erro ao carregar psicólogos:', err);
    }
  }, [user?.id]);

  // Carregar pacientes
  const loadPatients = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const options: any = {};
      if (searchText) options.search = searchText;
      if (selectedPsychologistFilter) options.psychologistId = selectedPsychologistFilter;

      const { patients: data } = await clinicService.getClinicPatients(user.id, options);
      setPatients(data as Patient[]);
    } catch (err: any) {
      console.error('Erro ao carregar pacientes:', err);
      setError(err.message || 'Erro ao carregar pacientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, searchText, selectedPsychologistFilter]);

  useEffect(() => {
    loadPsychologists();
  }, [loadPsychologists]);

  useEffect(() => {
    if (psychologists.length > 0) {
      loadPatients();
    }
  }, [psychologists, loadPatients]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPatients();
    });
    return unsubscribe;
  }, [navigation, loadPatients]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPatients();
  }, [loadPatients]);

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const extractId = (idField: any): string | null => {
    if (!idField) return null;
    if (typeof idField === 'string') return idField;
    if (typeof idField === 'object') {
      if (idField.$oid) return idField.$oid;
      if (idField._id) return idField._id;
      if (idField.id) return idField.id;
    }
    return null;
  };

  const getPsychologistName = (patient: Patient): string => {
    if (patient.psychologist?.name) return patient.psychologist.name;
    const psyId = extractId(patient.psychologistId);
    if (psyId) {
      const psy = psychologists.find((p) => (p._id || p.id) === psyId);
      if (psy) return psy.name;
    }
    return 'Sem psicólogo';
  };

  const hasPsychologist = (patient: Patient): boolean => {
    return !!extractId(patient.psychologistId) || !!patient.psychologist?.name;
  };

  // Abrir modal de atribuição
  const handleAssignPsychologist = (patient: Patient) => {
    setSelectedPatient(patient);
    const currentPsyId = extractId(patient.psychologistId) || extractId(patient.psychologist?._id);
    setSelectedPsychologistId(currentPsyId || '');
    setShowAssignModal(true);
  };

  // Confirmar atribuição
  const handleConfirmAssignment = async () => {
    if (!selectedPatient || !selectedPsychologistId || !user?.id) {
      Alert.alert('Erro', 'Por favor, selecione um psicólogo.');
      return;
    }

    const patientId = selectedPatient._id || selectedPatient.id;
    if (!patientId) {
      Alert.alert('Erro', 'ID do paciente não encontrado.');
      return;
    }

    setAssigning(true);

    try {
      await clinicService.assignPatientToPsychologist(user.id, patientId, selectedPsychologistId);

      const psychologist = psychologists.find((p) => (p._id || p.id) === selectedPsychologistId);
      Alert.alert(
        'Sucesso',
        `${selectedPatient.name} foi atribuído(a) a ${psychologist?.name || 'psicólogo'}.`
      );

      setShowAssignModal(false);
      setSelectedPatient(null);
      setSelectedPsychologistId('');
      setLoading(true);
      loadPatients();
    } catch (err: any) {
      console.error('Erro ao atribuir paciente:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao atribuir paciente';
      Alert.alert('Erro', errorMessage);
    } finally {
      setAssigning(false);
    }
  };

  // Desvincular paciente
  const handleUnlinkPatient = (patient: Patient) => {
    const patientId = patient._id || patient.id;
    if (!patientId) return;

    Alert.alert(
      'Desvincular Paciente',
      `Tem certeza que deseja desvincular ${patient.name} da clínica?\n\n` +
      `O paciente não será deletado, apenas desvinculado da clínica.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            try {
              setLoading(true);
              await clinicService.unlinkPatientFromClinic(user.id, patientId);
              Alert.alert('Sucesso', `${patient.name} foi desvinculado(a) da clínica.`);
              loadPatients();
            } catch (err: any) {
              console.error('Erro ao desvincular paciente:', err);
              const errorMessage = err.response?.data?.message || err.message || 'Erro ao desvincular paciente';
              Alert.alert('Erro', errorMessage);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchText('');
    setSelectedPsychologistFilter('');
    setShowFilterModal(false);
  };

  // Abrir modal de contato do paciente
  const handleOpenContactModal = async (patient: Patient) => {
    setContactPatient(patient);
    setShowContactModal(true);
    setPatientStats(null);

    // Carregar estatísticas do paciente
    setLoadingStats(true);
    try {
      const patientId = patient._id || patient.id;
      if (patientId) {
        const stats = await clinicService.getPatientStats(patientId);
        setPatientStats(stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas do paciente:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Abrir WhatsApp
  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não disponível.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=55${cleanPhone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  // Ligar
  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não disponível.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Pacientes da Clínica</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Pacientes da Clínica</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patients.length} pacientes</Text>
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={24} color="#4A90E2" />
          {(searchText || selectedPsychologistFilter) && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {/* Barra de busca */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar paciente por nome..."
          placeholderTextColor={colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={loadPatients}
        />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPatients}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nenhum paciente encontrado</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchText || selectedPsychologistFilter
                ? 'Tente ajustar os filtros de busca.'
                : 'Vincule pacientes à clínica para gerenciá-los.'}
            </Text>
          </View>
        ) : (
          patients.map((patient) => {
            const hasAssignedPsy = hasPsychologist(patient);
            const psychologistName = getPsychologistName(patient);

            return (
              <TouchableOpacity
                key={patient._id || patient.id}
                activeOpacity={0.7}
                onPress={() => handleOpenContactModal(patient)}
              >
                <Card style={styles.patientCard}>
                  <View style={styles.patientHeader}>
                    {patient.avatar ? (
                      <Image source={{ uri: patient.avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitial(patient.name)}</Text>
                      </View>
                    )}
                    <View style={styles.patientInfo}>
                      <Text style={[styles.name, { color: colors.textPrimary }]}>{patient.name}</Text>
                      {patient.email && <Text style={[styles.email, { color: colors.textSecondary }]}>{patient.email}</Text>}
                    </View>
                  </View>

                <View style={styles.infoRow}>
                  <Ionicons name="person" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Psicólogo:</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }, !hasAssignedPsy && styles.noPsychologist]}>
                    {psychologistName}
                  </Text>
                </View>

                {patient.phone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color={colors.textSecondary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefone:</Text>
                    <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{patient.phone}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => handleOpenContactModal(patient)}
                >
                  <Text style={styles.viewDetailsButtonText}>Ver Detalhes</Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Filtros */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filtrar Pacientes</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Psicólogo</Text>
            <View style={styles.psychologistList}>
              <TouchableOpacity
                style={[
                  styles.psychologistFilterItem,
                  { backgroundColor: colors.surfaceSecondary },
                  !selectedPsychologistFilter && [styles.psychologistFilterItemSelected, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }],
                ]}
                onPress={() => setSelectedPsychologistFilter('')}
              >
                <Ionicons
                  name={!selectedPsychologistFilter ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={!selectedPsychologistFilter ? '#4A90E2' : colors.textTertiary}
                />
                <Text style={[styles.psychologistFilterName, { color: colors.textPrimary }]}>Todos os psicólogos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.psychologistFilterItem,
                  { backgroundColor: colors.surfaceSecondary },
                  selectedPsychologistFilter === 'none' && [styles.psychologistFilterItemSelected, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }],
                ]}
                onPress={() => setSelectedPsychologistFilter('none')}
              >
                <Ionicons
                  name={selectedPsychologistFilter === 'none' ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={selectedPsychologistFilter === 'none' ? '#4A90E2' : colors.textTertiary}
                />
                <Text style={[styles.psychologistFilterName, { color: colors.textPrimary }]}>Sem psicólogo</Text>
              </TouchableOpacity>

              {psychologists.map((psy) => {
                const psyId = psy._id || psy.id;
                const isSelected = selectedPsychologistFilter === psyId;

                return (
                  <TouchableOpacity
                    key={psyId}
                    style={[
                      styles.psychologistFilterItem,
                      { backgroundColor: colors.surfaceSecondary },
                      isSelected && [styles.psychologistFilterItemSelected, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }],
                    ]}
                    onPress={() => setSelectedPsychologistFilter(psyId)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isSelected ? '#4A90E2' : colors.textTertiary}
                    />
                    <View style={styles.psychologistFilterInfo}>
                      <Text style={[styles.psychologistFilterName, { color: colors.textPrimary }]}>{psy.name}</Text>
                      <Text style={[styles.psychologistFilterCrp, { color: colors.textSecondary }]}>{psy.crp}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={[styles.clearFiltersButton, { backgroundColor: colors.borderLight }]} onPress={handleClearFilters}>
                <Text style={[styles.clearFiltersButtonText, { color: colors.textSecondary }]}>Limpar Filtros</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => {
                  setShowFilterModal(false);
                  setLoading(true);
                  loadPatients();
                }}
              >
                <Text style={styles.applyFiltersButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes do Paciente */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Detalhes do Paciente</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {contactPatient && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.contactAvatar}>
                  {contactPatient.avatar ? (
                    <Image source={{ uri: contactPatient.avatar }} style={styles.contactAvatarImage} />
                  ) : (
                    <Ionicons name="person-circle" size={80} color="#50C878" />
                  )}
                </View>

                <Text style={[styles.contactName, { color: colors.textPrimary }]}>{contactPatient.name}</Text>
                <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
                  {getPsychologistName(contactPatient)}
                </Text>

                <View style={styles.contactInfo}>
                  <View style={[styles.contactInfoRow, { borderBottomColor: colors.borderLight }]}>
                    <Ionicons name="mail" size={20} color={colors.textSecondary} />
                    <Text style={[styles.contactInfoText, { color: colors.textPrimary }]}>
                      {contactPatient.email || 'Email não disponível'}
                    </Text>
                  </View>

                  <View style={[styles.contactInfoRow, { borderBottomColor: colors.borderLight }]}>
                    <Ionicons name="call" size={20} color={colors.textSecondary} />
                    <Text style={[styles.contactInfoText, { color: colors.textPrimary }]}>
                      {contactPatient.phone || 'Telefone não disponível'}
                    </Text>
                  </View>
                </View>

                {contactPatient.phone && (
                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={[styles.contactActionButton, { backgroundColor: '#25D366' }]}
                      onPress={() => handleWhatsApp(contactPatient.phone)}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                      <Text style={styles.contactActionText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.contactActionButton, { backgroundColor: '#4A90E2' }]}
                      onPress={() => handleCall(contactPatient.phone)}
                    >
                      <Ionicons name="call" size={20} color="#fff" />
                      <Text style={styles.contactActionText}>Ligar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Estatísticas do Paciente */}
                <View style={styles.statsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Estatísticas</Text>

                  {loadingStats ? (
                    <ActivityIndicator color="#4A90E2" style={{ marginVertical: 20 }} />
                  ) : (
                    <>
                      <View style={styles.statsGrid}>
                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="calendar-outline" size={32} color="#4A90E2" />
                          <Text style={[styles.statsNumber, { color: colors.textPrimary }]}>{patientStats?.sessionsCount || 0}</Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Sessões Realizadas</Text>
                        </View>

                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="calendar" size={32} color="#27AE60" />
                          <Text style={[styles.statsNumber, { color: colors.textPrimary }]}>
                            {patientStats?.nextAppointment
                              ? new Date(patientStats.nextAppointment).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })
                              : '--/--'}
                          </Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Próxima Sessão</Text>
                        </View>
                      </View>

                      <View style={styles.statsGrid}>
                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="cash-outline" size={32} color="#27AE60" />
                          <Text style={[styles.statsNumber, { color: colors.textPrimary }]}>
                            R$ {(patientStats?.totalPaid || 0).toFixed(2)}
                          </Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Pago</Text>
                        </View>

                        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSecondary }]}>
                          <Ionicons name="alert-circle-outline" size={32} color="#E74C3C" />
                          <Text style={[styles.statsNumber, { color: colors.textPrimary }]}>
                            R$ {(patientStats?.totalPending || 0).toFixed(2)}
                          </Text>
                          <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Devendo</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Botões de Ação */}
                <View style={styles.modalActionsSection}>
                  <TouchableOpacity
                    style={[styles.reassignButtonModal, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}
                    onPress={() => {
                      setShowContactModal(false);
                      handleAssignPsychologist(contactPatient);
                    }}
                  >
                    <Ionicons
                      name={hasPsychologist(contactPatient) ? 'swap-horizontal' : 'person-add'}
                      size={20}
                      color="#4A90E2"
                    />
                    <Text style={styles.reassignButtonModalText}>
                      {hasPsychologist(contactPatient) ? 'Reatribuir Psicólogo' : 'Atribuir Psicólogo'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.unlinkButtonModalPatient}
                    onPress={() => {
                      setShowContactModal(false);
                      handleUnlinkPatient(contactPatient);
                    }}
                  >
                    <Ionicons name="unlink" size={20} color="#FF6B6B" />
                    <Text style={styles.unlinkButtonModalTextPatient}>Desvincular da Clínica</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.closeContactButton, { backgroundColor: colors.borderLight }]}
                  onPress={() => setShowContactModal(false)}
                >
                  <Text style={[styles.closeContactButtonText, { color: colors.textSecondary }]}>Fechar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Atribuição */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Atribuir Psicólogo</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <>
                <View style={[styles.patientInfoSection, { borderBottomColor: colors.border }]}>
                  {selectedPatient.avatar ? (
                    <Image source={{ uri: selectedPatient.avatar }} style={styles.avatarLargeImage} />
                  ) : (
                    <View style={styles.avatarLarge}>
                      <Text style={styles.avatarTextLarge}>{getInitial(selectedPatient.name)}</Text>
                    </View>
                  )}
                  <Text style={[styles.patientNameLarge, { color: colors.textPrimary }]}>{selectedPatient.name}</Text>
                  {selectedPatient.email && (
                    <Text style={[styles.patientEmailLarge, { color: colors.textSecondary }]}>{selectedPatient.email}</Text>
                  )}
                </View>

                <Text style={[styles.assignSectionTitle, { color: colors.textPrimary }]}>Selecione o psicólogo:</Text>

                <ScrollView style={styles.psychologistList}>
                  {psychologists.map((psy) => {
                    const psyId = psy._id || psy.id;
                    const isSelected = selectedPsychologistId === psyId;

                    return (
                      <TouchableOpacity
                        key={psyId}
                        style={[
                          styles.psychologistItem,
                          { backgroundColor: colors.surfaceSecondary },
                          isSelected && [styles.psychologistItemSelected, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }],
                        ]}
                        onPress={() => setSelectedPsychologistId(psyId)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={24}
                          color={isSelected ? '#4A90E2' : colors.textTertiary}
                        />
                        <View style={styles.psychologistItemInfo}>
                          <Text style={[styles.psychologistItemName, { color: colors.textPrimary }]}>{psy.name}</Text>
                          <Text style={[styles.psychologistItemCrp, { color: colors.textSecondary }]}>{psy.crp}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.assignActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.borderLight }]}
                    onPress={() => setShowAssignModal(false)}
                    disabled={assigning}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmButton, !selectedPsychologistId && styles.confirmButtonDisabled]}
                    onPress={handleConfirmAssignment}
                    disabled={!selectedPsychologistId || assigning}
                  >
                    {assigning ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Confirmar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
    padding: 40,
    marginTop: 40,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    flex: 1,
    padding: 10,
  },
  patientCard: {
    marginBottom: 12,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#50C878',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  patientInfo: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  noPsychologist: {
    color: '#FF6B6B',
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  assignButton: {
    backgroundColor: '#E8F4FF',
  },
  assignButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  unlinkButton: {
    backgroundColor: '#FFE8E8',
  },
  unlinkButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
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
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  psychologistList: {
    maxHeight: 300,
  },
  psychologistFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  psychologistFilterItemSelected: {},
  psychologistFilterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  psychologistFilterName: {
    fontSize: 16,
    fontWeight: '500',
  },
  psychologistFilterCrp: {
    fontSize: 12,
    marginTop: 2,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  applyFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Assign modal
  patientInfoSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#50C878',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  patientNameLarge: {
    fontSize: 20,
    fontWeight: '600',
  },
  patientEmailLarge: {
    fontSize: 14,
    marginTop: 4,
  },
  assignSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  psychologistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  psychologistItemSelected: {},
  psychologistItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  psychologistItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  psychologistItemCrp: {
    fontSize: 12,
    marginTop: 2,
  },
  assignActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Contact Modal styles
  contactAvatar: {
    alignItems: 'center',
    marginBottom: 16,
  },
  contactAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  contactInfo: {
    marginBottom: 24,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contactInfoText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  contactActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeContactButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeContactButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statsLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  modalActionsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  reassignButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  reassignButtonModalText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  unlinkButtonModalPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8E8',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  unlinkButtonModalTextPatient: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});
