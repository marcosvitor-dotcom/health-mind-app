import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as roomService from '../../services/roomService';
import { Room, PendingRoomRequest, AMENITIES_MAP } from '../../services/roomService';
import * as subleaseService from '../../services/subleaseService';
import { RoomSublease } from '../../services/subleaseService';

type Segment = 'rooms' | 'requests' | 'subleases';

export default function RoomsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const clinicId = user?._id || user?.id || '';

  const [segment, setSegment] = useState<Segment>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<PendingRoomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [subleases, setSubleases] = useState<RoomSublease[]>([]);
  const [subleasePendingCount, setSubleasePendingCount] = useState<number>(0);
  const [loadingSubleases, setLoadingSubleases] = useState<boolean>(false);

  // Modal para trocar sala
  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [changeTarget, setChangeTarget] = useState<PendingRoomRequest | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    try {
      setLoadingSubleases(true);
      const [roomsData, requestsData, subleasesData] = await Promise.all([
        roomService.getRooms(clinicId, true),
        roomService.getPendingRoomRequests(),
        subleaseService.getSubleases(1, 50),
      ]);
      setRooms(roomsData);
      setRequests(requestsData);
      setSubleases(subleasesData.subleases);
      const pendingSubs = subleasesData.subleases.filter(s => s.status === 'pending').length;
      setSubleasePendingCount(pendingSubs);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingSubleases(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDecision = async (appointmentId: string, action: 'approve' | 'reject', newRoomId?: string) => {
    setProcessingId(appointmentId);
    try {
      await roomService.handleRoomDecision(appointmentId, action, newRoomId);
      Alert.alert(
        'Sucesso',
        action === 'approve' ? 'Sala aprovada' : 'Sala rejeitada'
      );
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeRoom = async (request: PendingRoomRequest) => {
    setChangeTarget(request);
    setChangeModalVisible(true);
    setLoadingRooms(true);
    try {
      // Get all active rooms for the clinic
      const allRooms = await roomService.getRooms(clinicId);
      // Filter out the currently requested room
      const filtered = allRooms.filter(r => r._id !== request.roomId?._id);
      setAvailableRooms(filtered);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
      setChangeModalVisible(false);
    } finally {
      setLoadingRooms(false);
    }
  };

  const confirmChangeRoom = async (newRoomId: string) => {
    if (!changeTarget) return;
    setChangeModalVisible(false);
    setProcessingId(changeTarget._id);
    try {
      await roomService.handleRoomDecision(changeTarget._id, 'change', newRoomId);
      Alert.alert('Sucesso', 'Sala alterada com sucesso');
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setProcessingId(null);
      setChangeTarget(null);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${time}`;
  };

  const pendingCount = requests.length;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando salas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Salas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('RoomDetail')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={[styles.segmentContainer, { backgroundColor: isDark ? colors.border : '#e8e8e8' }]}>
        <TouchableOpacity
          style={[styles.segmentButton, segment === 'rooms' && [styles.segmentActive, { backgroundColor: colors.surface }]]}
          onPress={() => setSegment('rooms')}
        >
          <Text style={[styles.segmentText, { color: colors.textSecondary }, segment === 'rooms' && styles.segmentTextActive]}>
            Salas ({rooms.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, segment === 'requests' && [styles.segmentActive, { backgroundColor: colors.surface }]]}
          onPress={() => setSegment('requests')}
        >
          <Text style={[styles.segmentText, { color: colors.textSecondary }, segment === 'requests' && styles.segmentTextActive]}>
            Solicitacoes
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, segment === 'subleases' && [styles.segmentActive, { backgroundColor: colors.surface }]]}
          onPress={() => setSegment('subleases')}
        >
          <Text style={[styles.segmentText, { color: colors.textSecondary }, segment === 'subleases' && styles.segmentTextActive]}>
            Sublocacoes
          </Text>
          {subleasePendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{subleasePendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {segment === 'rooms' ? (
          rooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhuma sala cadastrada</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('RoomDetail')}
              >
                <Text style={styles.emptyButtonText}>Criar Sala</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rooms.map((room) => (
              <TouchableOpacity
                key={room._id}
                style={[styles.roomCard, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate('RoomDetail', { room })}
              >
                <View style={styles.roomCardHeader}>
                  <View style={styles.roomCardLeft}>
                    <View style={[styles.roomIcon, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }, !room.isActive && { backgroundColor: colors.borderLight }]}>
                      <Ionicons
                        name="business"
                        size={20}
                        color={room.isActive ? '#4A90E2' : colors.textTertiary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.roomName, { color: colors.textPrimary }]}>{room.name}</Text>
                      {room.number && (
                        <Text style={[styles.roomNumber, { color: colors.textSecondary }]}>Sala {room.number}</Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.statusBadge, room.isActive ? [styles.activeBadge, { backgroundColor: isDark ? '#1F3D1F' : '#E8FFE8' }] : { backgroundColor: colors.borderLight }]}>
                    <Text style={[styles.statusBadgeText, room.isActive ? styles.activeText : { color: colors.textTertiary }]}>
                      {room.isActive ? 'Ativa' : 'Inativa'}
                    </Text>
                  </View>
                </View>
                <View style={styles.roomCardDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>{room.capacity} pessoas</Text>
                  </View>
                  {room.subleasePrice != null && room.subleasePrice > 0 && (
                    <Text style={styles.roomSublease}>
                      Sublocacao: R$ {room.subleasePrice.toFixed(2).replace('.', ',')}
                    </Text>
                  )}
                  {room.amenities.length > 0 && (
                    <View style={styles.amenitiesRow}>
                      {room.amenities.slice(0, 4).map((a) => (
                        <View key={a} style={[styles.amenityChip, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
                          <Ionicons
                            name={(AMENITIES_MAP[a]?.icon || 'ellipse') as any}
                            size={12}
                            color="#4A90E2"
                          />
                        </View>
                      ))}
                      {room.amenities.length > 4 && (
                        <Text style={[styles.moreAmenities, { color: colors.textSecondary }]}>+{room.amenities.length - 4}</Text>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={styles.chevron} />
              </TouchableOpacity>
            ))
          )
        ) : segment === 'requests' ? (
          // Segment: Requests
          requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhuma solicitacao pendente</Text>
            </View>
          ) : (
            requests.map((req) => (
              <View key={req._id} style={[styles.requestCard, { backgroundColor: colors.surface }]}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.requestPsychologist, { color: colors.textPrimary }]}>
                      {req.psychologistId?.name || 'Psicologo'}
                    </Text>
                    <Text style={[styles.requestPatient, { color: colors.textSecondary }]}>
                      Paciente: {req.patientId?.name || '-'}
                    </Text>
                    <Text style={styles.requestDateTime}>
                      {formatDateTime(req.date)} - {req.duration}min
                    </Text>
                  </View>
                  <View style={[styles.requestRoom, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
                    <Ionicons name="business" size={16} color="#4A90E2" />
                    <Text style={styles.requestRoomName}>
                      {req.roomId?.name || 'Sala'}
                    </Text>
                    {req.roomId?.number && (
                      <Text style={[styles.requestRoomNumber, { color: colors.textSecondary }]}>#{req.roomId.number}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleDecision(req._id, 'approve')}
                    disabled={processingId === req._id}
                  >
                    {processingId === req._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Aprovar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => {
                      Alert.alert(
                        'Rejeitar Sala',
                        'Deseja rejeitar esta solicitacao de sala?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Rejeitar', style: 'destructive', onPress: () => handleDecision(req._id, 'reject') },
                        ]
                      );
                    }}
                    disabled={processingId === req._id}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Rejeitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.changeButton]}
                    onPress={() => handleChangeRoom(req)}
                    disabled={processingId === req._id}
                  >
                    <Ionicons name="swap-horizontal" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Alterar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          // Segment: Subleases
          loadingSubleases ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
            </View>
          ) : subleases.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhuma sublocacao encontrada</Text>
            </View>
          ) : (
            subleases.map((sublease) => {
              const psychName = typeof sublease.psychologistId === 'object' ? sublease.psychologistId.name : '';
              const roomName = typeof sublease.roomId === 'object' ? sublease.roomId.name : '';
              const patientName = typeof sublease.patientId === 'object' ? sublease.patientId.name : '';
              const dateFormatted = new Date(sublease.appointmentDate).toLocaleDateString('pt-BR');
              const valueFormatted = sublease.value.toFixed(2).replace('.', ',');

              let statusLabel = 'Pendente';
              let statusStyle = isDark ? { backgroundColor: '#3D3020' } : styles.subleaseStatusPending;
              let statusTextStyle = styles.subleaseStatusPendingText;
              if (sublease.status === 'paid') {
                statusLabel = 'Pago';
                statusStyle = isDark ? { backgroundColor: '#1F3D1F' } : styles.subleaseStatusPaid;
                statusTextStyle = styles.subleaseStatusPaidText;
              } else if (sublease.status === 'cancelled') {
                statusLabel = 'Cancelado';
                statusStyle = { backgroundColor: colors.borderLight };
                statusTextStyle = { color: colors.textTertiary } as any;
              }

              return (
                <View key={sublease._id} style={[styles.subleaseCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.subleaseCardHeader}>
                    <View style={styles.subleaseCardInfo}>
                      <Text style={[styles.subleasePsychologist, { color: colors.textPrimary }]}>{psychName || 'Psicologo'}</Text>
                      <Text style={styles.subleaseRoom}>Sala: {roomName || '-'}</Text>
                      <Text style={[styles.subleasePatient, { color: colors.textSecondary }]}>Paciente: {patientName || '-'}</Text>
                      <Text style={[styles.subleaseDate, { color: colors.textSecondary }]}>{dateFormatted}</Text>
                    </View>
                    <View style={styles.subleaseCardRight}>
                      <View style={[styles.subleaseStatusBadge, statusStyle]}>
                        <Text style={[styles.subleaseStatusText, statusTextStyle]}>{statusLabel}</Text>
                      </View>
                      <Text style={[styles.subleaseValue, { color: colors.textPrimary }]}>R$ {valueFormatted}</Text>
                    </View>
                  </View>
                  {sublease.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.markPaidButton}
                      onPress={async () => {
                        try {
                          setProcessingId(sublease._id);
                          await subleaseService.markSubleasePaid(sublease._id);
                          Alert.alert('Sucesso', 'Sublocacao marcada como paga');
                          loadData();
                        } catch (error: any) {
                          Alert.alert('Erro', error.message);
                        } finally {
                          setProcessingId(null);
                        }
                      }}
                      disabled={processingId === sublease._id}
                    >
                      {processingId === sublease._id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          <Text style={styles.markPaidButtonText}>Marcar como Pago</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )
        )}
      </ScrollView>

      {/* Modal para trocar sala */}
      <Modal
        visible={changeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Selecionar Outra Sala</Text>
              <TouchableOpacity onPress={() => setChangeModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {loadingRooms ? (
              <ActivityIndicator size="large" color="#4A90E2" style={{ marginVertical: 40 }} />
            ) : availableRooms.length === 0 ? (
              <View style={styles.emptyModal}>
                <Text style={[styles.emptyModalText, { color: colors.textTertiary }]}>Nenhuma sala disponivel</Text>
              </View>
            ) : (
              <FlatList
                data={availableRooms}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalRoomItem, { borderBottomColor: colors.borderLight }]}
                    onPress={() => confirmChangeRoom(item._id)}
                  >
                    <View style={styles.modalRoomInfo}>
                      <Ionicons name="business" size={20} color="#4A90E2" />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.modalRoomName, { color: colors.textPrimary }]}>{item.name}</Text>
                        {item.number && (
                          <Text style={[styles.modalRoomNumber, { color: colors.textSecondary }]}>Sala {item.number}</Text>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.modalRoomCapacity, { color: colors.textSecondary }]}>{item.capacity}p</Text>
                  </TouchableOpacity>
                )}
              />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Room card
  roomCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomIconInactive: {
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
  },
  roomNumber: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
  },
  inactiveBadge: {
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#50C878',
  },
  inactiveText: {
  },
  roomCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
  },
  amenitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amenityChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAmenities: {
    fontSize: 12,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  // Request card
  requestCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB347',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestPsychologist: {
    fontSize: 15,
    fontWeight: '600',
  },
  requestPatient: {
    fontSize: 13,
    marginTop: 2,
  },
  requestDateTime: {
    fontSize: 13,
    color: '#4A90E2',
    marginTop: 4,
    fontWeight: '500',
  },
  requestRoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  requestRoomName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  requestRoomNumber: {
    fontSize: 12,
  },
  requestActions: {
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
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#50C878',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  changeButton: {
    backgroundColor: '#4A90E2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
    maxHeight: '60%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyModal: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyModalText: {
    fontSize: 15,
  },
  modalRoomItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalRoomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRoomName: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalRoomNumber: {
    fontSize: 13,
    marginTop: 2,
  },
  modalRoomCapacity: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Room sublease price
  roomSublease: {
    fontSize: 12,
    color: '#E8A317',
    marginTop: 2,
  },
  // Sublease card
  subleaseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E8A317',
  },
  subleaseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subleaseCardInfo: {
    flex: 1,
  },
  subleaseCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  subleasePsychologist: {
    fontSize: 15,
    fontWeight: '600',
  },
  subleaseRoom: {
    fontSize: 13,
    color: '#4A90E2',
    marginTop: 2,
    fontWeight: '500',
  },
  subleasePatient: {
    fontSize: 13,
    marginTop: 2,
  },
  subleaseDate: {
    fontSize: 13,
    marginTop: 4,
  },
  subleaseValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Sublease status badges
  subleaseStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subleaseStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subleaseStatusPending: {
    backgroundColor: '#FFF8E1',
  },
  subleaseStatusPendingText: {
    color: '#E8A317',
  },
  subleaseStatusPaid: {
    backgroundColor: '#E8FFE8',
  },
  subleaseStatusPaidText: {
    color: '#50C878',
  },
  subleaseStatusCancelled: {
  },
  subleaseStatusCancelledText: {
  },
  // Mark as paid button
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#50C878',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  markPaidButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
