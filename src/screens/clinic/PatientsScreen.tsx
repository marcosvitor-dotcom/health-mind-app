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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
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
  const handleOpenContactModal = (patient: Patient) => {
    setContactPatient(patient);
    setShowContactModal(true);
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pacientes da Clínica</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pacientes da Clínica</Text>
          <Text style={styles.headerSubtitle}>{patients.length} pacientes</Text>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={24} color="#4A90E2" />
          {(searchText || selectedPsychologistFilter) && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar paciente por nome..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={loadPatients}
        />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
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
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPatients}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum paciente encontrado</Text>
            <Text style={styles.emptyText}>
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
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitial(patient.name)}</Text>
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.name}>{patient.name}</Text>
                      {patient.email && <Text style={styles.email}>{patient.email}</Text>}
                    </View>
                  </View>

                <View style={styles.infoRow}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text style={styles.infoLabel}>Psicólogo:</Text>
                  <Text style={[styles.infoValue, !hasAssignedPsy && styles.noPsychologist]}>
                    {psychologistName}
                  </Text>
                </View>

                {patient.phone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color="#666" />
                    <Text style={styles.infoLabel}>Telefone:</Text>
                    <Text style={styles.infoValue}>{patient.phone}</Text>
                  </View>
                )}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.assignButton]}
                    onPress={() => handleAssignPsychologist(patient)}
                  >
                    <Ionicons name={hasAssignedPsy ? 'swap-horizontal' : 'person-add'} size={18} color="#4A90E2" />
                    <Text style={styles.assignButtonText}>
                      {hasAssignedPsy ? 'Reatribuir' : 'Atribuir'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.unlinkButton]}
                    onPress={() => handleUnlinkPatient(patient)}
                  >
                    <Ionicons name="unlink" size={18} color="#FF6B6B" />
                    <Text style={styles.unlinkButtonText}>Desvincular</Text>
                  </TouchableOpacity>
                </View>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Pacientes</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Psicólogo</Text>
            <View style={styles.psychologistList}>
              <TouchableOpacity
                style={[
                  styles.psychologistFilterItem,
                  !selectedPsychologistFilter && styles.psychologistFilterItemSelected,
                ]}
                onPress={() => setSelectedPsychologistFilter('')}
              >
                <Ionicons
                  name={!selectedPsychologistFilter ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={!selectedPsychologistFilter ? '#4A90E2' : '#999'}
                />
                <Text style={styles.psychologistFilterName}>Todos os psicólogos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.psychologistFilterItem,
                  selectedPsychologistFilter === 'none' && styles.psychologistFilterItemSelected,
                ]}
                onPress={() => setSelectedPsychologistFilter('none')}
              >
                <Ionicons
                  name={selectedPsychologistFilter === 'none' ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={selectedPsychologistFilter === 'none' ? '#4A90E2' : '#999'}
                />
                <Text style={styles.psychologistFilterName}>Sem psicólogo</Text>
              </TouchableOpacity>

              {psychologists.map((psy) => {
                const psyId = psy._id || psy.id;
                const isSelected = selectedPsychologistFilter === psyId;

                return (
                  <TouchableOpacity
                    key={psyId}
                    style={[styles.psychologistFilterItem, isSelected && styles.psychologistFilterItemSelected]}
                    onPress={() => setSelectedPsychologistFilter(psyId)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isSelected ? '#4A90E2' : '#999'}
                    />
                    <View style={styles.psychologistFilterInfo}>
                      <Text style={styles.psychologistFilterName}>{psy.name}</Text>
                      <Text style={styles.psychologistFilterCrp}>{psy.crp}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
                <Text style={styles.clearFiltersButtonText}>Limpar Filtros</Text>
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

      {/* Modal de Contato do Paciente */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dados do Paciente</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {contactPatient && (
              <View>
                <View style={styles.contactAvatar}>
                  <Ionicons name="person-circle" size={80} color="#50C878" />
                </View>

                <Text style={styles.contactName}>{contactPatient.name}</Text>

                <View style={styles.contactInfo}>
                  <View style={styles.contactInfoRow}>
                    <Ionicons name="mail" size={20} color="#666" />
                    <Text style={styles.contactInfoText}>
                      {contactPatient.email || 'Email não disponível'}
                    </Text>
                  </View>

                  <View style={styles.contactInfoRow}>
                    <Ionicons name="call" size={20} color="#666" />
                    <Text style={styles.contactInfoText}>
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
                      <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                      <Text style={styles.contactActionText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.contactActionButton, { backgroundColor: '#4A90E2' }]}
                      onPress={() => handleCall(contactPatient.phone)}
                    >
                      <Ionicons name="call" size={24} color="#fff" />
                      <Text style={styles.contactActionText}>Ligar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeContactButton}
                  onPress={() => setShowContactModal(false)}
                >
                  <Text style={styles.closeContactButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Atribuir Psicólogo</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <>
                <View style={styles.patientInfoSection}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarTextLarge}>{getInitial(selectedPatient.name)}</Text>
                  </View>
                  <Text style={styles.patientNameLarge}>{selectedPatient.name}</Text>
                  {selectedPatient.email && (
                    <Text style={styles.patientEmailLarge}>{selectedPatient.email}</Text>
                  )}
                </View>

                <Text style={styles.assignSectionTitle}>Selecione o psicólogo:</Text>

                <ScrollView style={styles.psychologistList}>
                  {psychologists.map((psy) => {
                    const psyId = psy._id || psy.id;
                    const isSelected = selectedPsychologistId === psyId;

                    return (
                      <TouchableOpacity
                        key={psyId}
                        style={[styles.psychologistItem, isSelected && styles.psychologistItemSelected]}
                        onPress={() => setSelectedPsychologistId(psyId)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={24}
                          color={isSelected ? '#4A90E2' : '#999'}
                        />
                        <View style={styles.psychologistItemInfo}>
                          <Text style={styles.psychologistItemName}>{psy.name}</Text>
                          <Text style={styles.psychologistItemCrp}>{psy.crp}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.assignActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowAssignModal(false)}
                    disabled={assigning}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
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
    backgroundColor: '#f5f5f5',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E8F4FF',
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
    color: '#666',
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
    color: '#333',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
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
    color: '#333',
  },
  email: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
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
    backgroundColor: '#fff',
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
    color: '#333',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#f9f9f9',
  },
  psychologistFilterItemSelected: {
    backgroundColor: '#E8F4FF',
  },
  psychologistFilterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  psychologistFilterName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  psychologistFilterCrp: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
    borderBottomColor: '#e0e0e0',
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
  avatarTextLarge: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  patientNameLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  patientEmailLarge: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  assignSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  psychologistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  psychologistItemSelected: {
    backgroundColor: '#E8F4FF',
  },
  psychologistItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  psychologistItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  psychologistItemCrp: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    borderBottomColor: '#f0f0f0',
  },
  contactInfoText: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeContactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
