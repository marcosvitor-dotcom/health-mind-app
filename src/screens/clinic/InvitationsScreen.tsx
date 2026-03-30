import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import * as authService from '../../services/authService';
import api from '../../services/api';
import { Invitation, InvitationStatus, InvitationRole } from '../../types';

interface PsychologistOption {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  crp?: string;
}

interface InvitationsScreenProps {
  navigation: any;
}

type FilterStatus = 'all' | InvitationStatus;
type FilterRole = 'all' | 'psychologist' | 'patient';

export default function InvitationsScreen({ navigation }: InvitationsScreenProps) {
  const { colors, isDark } = useTheme();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Estados do modal de edição
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Seletor de psicólogo (apenas para convites de paciente)
  const [psychologists, setPsychologists] = useState<PsychologistOption[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<PsychologistOption | null>(null);
  const [psychologistPickerVisible, setPsychologistPickerVisible] = useState(false);

  const loadInvitations = async () => {
    try {
      const data = await authService.listInvitations(
        filterStatus === 'all' ? undefined : filterStatus,
        filterRole === 'all' ? undefined : filterRole
      );
      setInvitations(data);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar convites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPsychologists = async () => {
    try {
      const response = await api.get('/psychologists');
      setPsychologists(response.data?.data || []);
    } catch {
      // não crítico
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInvitations();
    }, [filterStatus, filterRole])
  );

  useEffect(() => {
    loadInvitations();
  }, [filterStatus, filterRole]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleResend = async (invitation: Invitation) => {
    const id = invitation._id || invitation.id;
    setActionLoading(id);
    try {
      await authService.resendInvitation(id);
      Alert.alert('Sucesso', 'Convite reenviado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao reenviar convite');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = (invitation: Invitation) => {
    const id = invitation._id || invitation.id;
    Alert.alert(
      'Cancelar Convite',
      `Deseja realmente cancelar o convite para ${invitation.preFilledData?.name || invitation.email}?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(id);
            try {
              await authService.cancelInvitation(id);
              Alert.alert('Sucesso', 'Convite cancelado!');
              loadInvitations();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao cancelar convite');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatDateToBR = (isoDate?: string): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateToISO = (brDate: string): string | undefined => {
    if (!brDate || brDate.length < 10) return undefined;
    const parts = brDate.split('/');
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts;
    if (!day || !month || !year || year.length !== 4) return undefined;
    return `${year}-${month}-${day}`;
  };

  const openEditModal = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    setEditName(invitation.preFilledData?.name || '');
    setEditPhone(invitation.preFilledData?.phone || '');
    setEditBirthDate(formatDateToBR(invitation.preFilledData?.birthDate));
    setSelectedPsychologist(null);

    if (invitation.role === 'patient') {
      loadPsychologists();
    }

    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingInvitation || !editName.trim()) {
      Alert.alert('Atenção', 'O nome é obrigatório.');
      return;
    }
    setEditLoading(true);
    try {
      const id = editingInvitation._id || editingInvitation.id;
      await authService.updateInvitation(id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        birthDate: formatDateToISO(editBirthDate) || undefined,
        psychologistId: editingInvitation.role === 'patient' && selectedPsychologist
          ? (selectedPsychologist._id || selectedPsychologist.id)
          : undefined,
      });
      setEditModalVisible(false);
      loadInvitations();
      Alert.alert('Sucesso', 'Convite atualizado! O prazo foi renovado por 7 dias e um novo e-mail foi enviado.');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar convite');
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#50C878';
      case 'expired': return '#999';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceito';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  const getRoleLabel = (role: InvitationRole) => {
    switch (role) {
      case 'psychologist': return 'Psicólogo';
      case 'patient': return 'Paciente';
      case 'clinic': return 'Clínica';
      default: return role;
    }
  };

  const getRoleColor = (role: InvitationRole) => {
    switch (role) {
      case 'psychologist': return '#4A90E2';
      case 'patient': return '#50C878';
      case 'clinic': return '#9B59B6';
      default: return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const renderInvitation = ({ item }: { item: Invitation }) => {
    const id = item._id || item.id;
    const isLoading = actionLoading === id;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleBadgeText}>{getRoleLabel(item.role)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.preFilledData?.name || 'Sem nome'}</Text>
        <Text style={[styles.cardEmail, { color: colors.textSecondary }]}>{item.email}</Text>

        <View style={styles.cardDates}>
          <Text style={[styles.cardDateText, { color: colors.textTertiary }]}>
            Enviado: {formatDate(item.createdAt)}
          </Text>
          {item.status === 'pending' && (
            <Text style={[styles.cardDateText, { color: colors.textTertiary }]}>
              Expira: {formatDate(item.expiresAt)}
            </Text>
          )}
        </View>

        {item.status === 'pending' && (
          <View style={[styles.cardActions, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F8EE' }]}
              onPress={() => openEditModal(item)}
              disabled={isLoading}
            >
              <Ionicons name="pencil-outline" size={16} color="#50C878" />
              <Text style={[styles.actionButtonText, { color: '#50C878' }]}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}
              onPress={() => handleResend(item)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#4A90E2" />
                  <Text style={[styles.actionButtonText, { color: '#4A90E2' }]}>Reenviar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? '#3D1F1F' : '#FFEBEE' }]}
              onPress={() => handleCancel(item)}
              disabled={isLoading}
            >
              <Ionicons name="close" size={16} color="#E74C3C" />
              <Text style={[styles.actionButtonText, { color: '#E74C3C' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const FilterButton = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, { backgroundColor: active ? '#4A90E2' : colors.borderLight }, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, { color: active ? '#fff' : colors.textSecondary }, active && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Convites Enviados</Text>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status:</Text>
        <View style={styles.filterRow}>
          <FilterButton label="Todos" active={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
          <FilterButton label="Pendentes" active={filterStatus === 'pending'} onPress={() => setFilterStatus('pending')} />
          <FilterButton label="Aceitos" active={filterStatus === 'accepted'} onPress={() => setFilterStatus('accepted')} />
          <FilterButton label="Expirados" active={filterStatus === 'expired'} onPress={() => setFilterStatus('expired')} />
        </View>

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Tipo:</Text>
        <View style={styles.filterRow}>
          <FilterButton label="Todos" active={filterRole === 'all'} onPress={() => setFilterRole('all')} />
          <FilterButton label="Psicólogos" active={filterRole === 'psychologist'} onPress={() => setFilterRole('psychologist')} />
          <FilterButton label="Pacientes" active={filterRole === 'patient'} onPress={() => setFilterRole('patient')} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhum convite encontrado</Text>
            </View>
          }
        />
      )}

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate('InvitePatient')}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.fabPrimary]}
          onPress={() => navigation.navigate('InvitePsychologist')}
        >
          <Ionicons name="medkit" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal de Edição */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Editar Convite</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={editLoading}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalEmailLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.modalEmailValue, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary }]}>
                {editingInvitation?.email}
              </Text>

              <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Nome *</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome completo"
                placeholderTextColor={colors.textTertiary}
                editable={!editLoading}
              />

              <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Telefone</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                editable={!editLoading}
              />

              {editingInvitation?.role === 'patient' && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Data de Nascimento</Text>
                  <TextInput
                    style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    value={editBirthDate}
                    onChangeText={setEditBirthDate}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                    maxLength={10}
                    editable={!editLoading}
                  />

                  <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Psicólogo Responsável</Text>
                  <TouchableOpacity
                    style={[styles.modalSelectorButton, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => setPsychologistPickerVisible(true)}
                    disabled={editLoading}
                  >
                    <Text style={{ color: selectedPsychologist ? colors.textPrimary : colors.textTertiary, flex: 1 }}>
                      {selectedPsychologist ? selectedPsychologist.name : 'Manter atual (não alterar)'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              <Text style={[styles.modalHint, { color: colors.textTertiary }]}>
                Ao salvar, o prazo do convite será renovado por 7 dias e um novo e-mail será enviado.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border }]}
                  onPress={() => setEditModalVisible(false)}
                  disabled={editLoading}
                >
                  <Text style={[styles.modalCancelButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveButton, editLoading && styles.modalButtonDisabled]}
                  onPress={handleSaveEdit}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal seletor de psicólogo */}
      <Modal
        visible={psychologistPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPsychologistPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Selecionar Psicólogo</Text>
              <TouchableOpacity onPress={() => setPsychologistPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.psychologistOption, { borderBottomColor: colors.borderLight }]}
              onPress={() => { setSelectedPsychologist(null); setPsychologistPickerVisible(false); }}
            >
              <Text style={[styles.psychologistName, { color: colors.textSecondary }]}>Manter atual (não alterar)</Text>
            </TouchableOpacity>

            <FlatList
              data={psychologists}
              keyExtractor={(item) => item._id || item.id || item.email}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.psychologistOption, { borderBottomColor: colors.borderLight }]}
                  onPress={() => { setSelectedPsychologist(item); setPsychologistPickerVisible(false); }}
                >
                  <View style={[styles.psychologistAvatar, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}>
                    <Ionicons name="person" size={20} color="#4A90E2" />
                  </View>
                  <View>
                    <Text style={[styles.psychologistName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.psychologistEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                    {item.crp && <Text style={[styles.psychologistCrp, { color: colors.textTertiary }]}>CRP: {item.crp}</Text>}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  filtersContainer: { padding: 16, borderBottomWidth: 1 },
  filterLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  filterButtonActive: { backgroundColor: '#4A90E2' },
  filterButtonText: { fontSize: 13 },
  filterButtonTextActive: { color: '#fff', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardEmail: { fontSize: 14, marginBottom: 8 },
  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardDateText: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: { fontSize: 13, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 16, fontSize: 16 },
  fabContainer: { position: 'absolute', right: 16, bottom: 24, gap: 12 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabPrimary: { backgroundColor: '#4A90E2' },
  fabSecondary: { backgroundColor: '#50C878' },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
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
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalEmailLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  modalEmailValue: { fontSize: 14, padding: 12, borderRadius: 8, marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 14 },
  modalSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  modalHint: { fontSize: 12, lineHeight: 18, marginBottom: 20, marginTop: 4 },
  modalButtons: { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelButtonText: { fontSize: 15, fontWeight: '500' },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  modalButtonDisabled: { opacity: 0.6 },
  modalSaveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Seletor de psicólogo
  psychologistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  psychologistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  psychologistName: { fontSize: 15, fontWeight: '600' },
  psychologistEmail: { fontSize: 13 },
  psychologistCrp: { fontSize: 12 },
});
