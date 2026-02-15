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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import * as authService from '../../services/authService';
import { Invitation, InvitationStatus } from '../../types';

interface InvitationsScreenProps {
  navigation: any;
}

type FilterStatus = 'all' | InvitationStatus;

export default function InvitationsScreen({ navigation }: InvitationsScreenProps) {
  const { colors, isDark } = useTheme();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadInvitations = async () => {
    try {
      const data = await authService.listInvitations(
        filterStatus === 'all' ? undefined : filterStatus,
        'patient'
      );
      setInvitations(data);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar convites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInvitations();
    }, [filterStatus])
  );

  useEffect(() => {
    loadInvitations();
  }, [filterStatus]);

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

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'accepted':
        return '#50C878';
      case 'expired':
        return '#999';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'accepted':
        return 'Aceito';
      case 'expired':
        return 'Expirado';
      default:
        return status;
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
          <View style={styles.patientBadge}>
            <Text style={styles.patientBadgeText}>Paciente</Text>
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
          <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.resendButton, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FF' }]}
              onPress={() => handleResend(item)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#4A90E2" />
                  <Text style={styles.resendButtonText}>Reenviar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { backgroundColor: isDark ? '#3D1F1F' : '#FFEBEE' }]}
              onPress={() => handleCancel(item)}
              disabled={isLoading}
            >
              <Ionicons name="close" size={16} color="#E74C3C" />
              <Text style={styles.cancelButtonText}>Cancelar</Text>
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
      style={[styles.filterButton, { backgroundColor: colors.borderLight }, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, { color: colors.textSecondary }, active && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Convites de Pacientes</Text>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status:</Text>
        <View style={styles.filterRow}>
          <FilterButton
            label="Todos"
            active={filterStatus === 'all'}
            onPress={() => setFilterStatus('all')}
          />
          <FilterButton
            label="Pendentes"
            active={filterStatus === 'pending'}
            onPress={() => setFilterStatus('pending')}
          />
          <FilterButton
            label="Aceitos"
            active={filterStatus === 'accepted'}
            onPress={() => setFilterStatus('accepted')}
          />
          <FilterButton
            label="Expirados"
            active={filterStatus === 'expired'}
            onPress={() => setFilterStatus('expired')}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#50C878" />
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('InvitePatient')}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterButtonActive: {
    backgroundColor: '#50C878',
  },
  filterButtonText: {
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  patientBadge: {
    backgroundColor: '#50C878',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  patientBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardDateText: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  resendButton: {},
  resendButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {},
  cancelButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#50C878',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
