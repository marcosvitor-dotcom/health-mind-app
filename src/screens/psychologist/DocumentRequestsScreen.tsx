import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import * as documentRequestService from '../../services/documentRequestService';
import type {
  DocumentRequestStatus,
  DocumentRequestData,
} from '../../services/documentRequestService';

interface DocumentRequestsScreenProps {
  navigation: any;
  route: any;
}

type FilterStatus = 'all' | DocumentRequestStatus;

const FILTER_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'in_progress', label: 'Em Andamento' },
  { key: 'completed', label: 'Concluídas' },
  { key: 'rejected', label: 'Recusadas' },
];

export default function DocumentRequestsScreen({ navigation, route }: DocumentRequestsScreenProps) {
  const { colors, isDark } = useTheme();
  const patientIdFilter = route?.params?.patientId || null;

  const [requests, setRequests] = useState<DocumentRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequestData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [responseNote, setResponseNote] = useState('');

  const loadRequests = async () => {
    try {
      const statusFilter = filterStatus === 'all' ? undefined : filterStatus;
      const result = await documentRequestService.getReceivedRequests(
        1,
        50,
        statusFilter,
        patientIdFilter || undefined
      );
      setRequests(result.requests);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filterStatus, patientIdFilter])
  );

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const openActionModal = (request: DocumentRequestData) => {
    setSelectedRequest(request);
    setResponseNote('');
    setModalVisible(true);
  };

  const handleUpdateStatus = async (status: 'in_progress' | 'completed' | 'rejected') => {
    if (!selectedRequest) return;

    if (status === 'rejected' && !responseNote.trim()) {
      Alert.alert('Atenção', 'Informe o motivo da recusa');
      return;
    }

    const statusLabels = {
      in_progress: 'iniciar',
      completed: 'concluir',
      rejected: 'recusar',
    };

    Alert.alert(
      'Confirmar',
      `Deseja ${statusLabels[status]} esta solicitação?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading(selectedRequest._id);
            try {
              await documentRequestService.updateRequestStatus(
                selectedRequest._id,
                status,
                responseNote.trim() || undefined
              );
              Alert.alert('Sucesso', 'Solicitação atualizada');
              setModalVisible(false);
              setSelectedRequest(null);
              loadRequests();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao atualizar');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const getPatientName = (req: DocumentRequestData): string => {
    if (typeof req.patientId === 'object' && req.patientId?.name) {
      return req.patientId.name;
    }
    return 'Paciente';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderStatusBadge = (status: DocumentRequestStatus) => {
    const config = documentRequestService.STATUS_CONFIG[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: DocumentRequestData }) => {
    const typeConfig = documentRequestService.TYPE_CONFIG[item.type];
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openActionModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={[styles.cardIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F4F8' }]}>
              <Ionicons name={typeConfig?.icon as any || 'document'} size={20} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardType, { color: colors.textPrimary }]}>
                {typeConfig?.label || item.type}
              </Text>
              <Text style={[styles.cardPatient, { color: colors.textSecondary }]}>
                {getPatientName(item)}
              </Text>
            </View>
          </View>
          {renderStatusBadge(item.status)}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
            {formatDate(item.createdAt)}
          </Text>
          {item.description ? (
            <Text style={[styles.cardDescription, { color: colors.textTertiary }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        Nenhuma solicitação
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
        {filterStatus === 'all'
          ? 'Solicitações de documentos dos pacientes aparecerão aqui'
          : `Nenhuma solicitação com status "${FILTER_OPTIONS.find(f => f.key === filterStatus)?.label}"`}
      </Text>
    </View>
  );

  const renderActionModal = () => {
    if (!selectedRequest) return null;
    const typeConfig = documentRequestService.TYPE_CONFIG[selectedRequest.type];
    const isPending = selectedRequest.status === 'pending';
    const isInProgress = selectedRequest.status === 'in_progress';

    return (
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Solicitação de Documento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tipo:</Text>
                <Text style={[styles.modalValue, { color: colors.textPrimary }]}>
                  {typeConfig?.label || selectedRequest.type}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Paciente:</Text>
                <Text style={[styles.modalValue, { color: colors.textPrimary }]}>
                  {getPatientName(selectedRequest)}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Data:</Text>
                <Text style={[styles.modalValue, { color: colors.textPrimary }]}>
                  {formatDate(selectedRequest.createdAt)}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Status:</Text>
                {renderStatusBadge(selectedRequest.status)}
              </View>

              {selectedRequest.description ? (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Motivo do paciente:</Text>
                  <Text style={[styles.modalDescription, { color: colors.textPrimary, backgroundColor: isDark ? colors.surfaceSecondary : '#F8F9FA' }]}>
                    {selectedRequest.description}
                  </Text>
                </View>
              ) : null}

              {selectedRequest.responseNote ? (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Sua resposta:</Text>
                  <Text style={[styles.modalDescription, { color: colors.textPrimary, backgroundColor: isDark ? colors.surfaceSecondary : '#F8F9FA' }]}>
                    {selectedRequest.responseNote}
                  </Text>
                </View>
              ) : null}

              {(isPending || isInProgress) && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                    Nota de resposta (obrigatório para recusar):
                  </Text>
                  <TextInput
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: isDark ? colors.surfaceSecondary : '#F8F9FA',
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="Escreva uma observação..."
                    placeholderTextColor={colors.textTertiary}
                    value={responseNote}
                    onChangeText={setResponseNote}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={1000}
                  />
                </View>
              )}
            </View>

            {(isPending || isInProgress) && (
              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                {isPending && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#4A90E2' }]}
                    onPress={() => handleUpdateStatus('in_progress')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === selectedRequest._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="play" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Iniciar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {(isPending || isInProgress) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#50C878' }]}
                    onPress={() => handleUpdateStatus('completed')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === selectedRequest._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Concluir</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FF6B6B' }]}
                  onPress={() => handleUpdateStatus('rejected')}
                  disabled={!!actionLoading}
                >
                  {actionLoading === selectedRequest._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Recusar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Solicitações de Documentos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = filterStatus === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilterStatus(item.key)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {renderActionModal()}
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterContainer: {
    paddingVertical: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardType: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardPatient: {
    fontSize: 13,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardDate: {
    fontSize: 12,
  },
  cardDescription: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Status
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 14,
  },
  modalSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    lineHeight: 20,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
