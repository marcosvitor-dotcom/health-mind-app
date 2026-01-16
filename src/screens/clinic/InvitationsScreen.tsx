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
import * as authService from '../../services/authService';
import { Invitation, InvitationStatus, InvitationRole } from '../../types';

interface InvitationsScreenProps {
  navigation: any;
}

type FilterStatus = 'all' | InvitationStatus;
type FilterRole = 'all' | 'psychologist' | 'patient';

export default function InvitationsScreen({ navigation }: InvitationsScreenProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const getRoleLabel = (role: InvitationRole) => {
    switch (role) {
      case 'psychologist':
        return 'Psicólogo';
      case 'patient':
        return 'Paciente';
      case 'clinic':
        return 'Clínica';
      default:
        return role;
    }
  };

  const getRoleColor = (role: InvitationRole) => {
    switch (role) {
      case 'psychologist':
        return '#4A90E2';
      case 'patient':
        return '#50C878';
      case 'clinic':
        return '#9B59B6';
      default:
        return '#666';
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleBadgeText}>{getRoleLabel(item.role)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <Text style={styles.cardName}>{item.preFilledData?.name || 'Sem nome'}</Text>
        <Text style={styles.cardEmail}>{item.email}</Text>

        <View style={styles.cardDates}>
          <Text style={styles.cardDateText}>
            Enviado: {formatDate(item.createdAt)}
          </Text>
          {item.status === 'pending' && (
            <Text style={styles.cardDateText}>
              Expira: {formatDate(item.expiresAt)}
            </Text>
          )}
        </View>

        {item.status === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.resendButton]}
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
              style={[styles.actionButton, styles.cancelButton]}
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
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Convites Enviados</Text>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
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

        <Text style={styles.filterLabel}>Tipo:</Text>
        <View style={styles.filterRow}>
          <FilterButton
            label="Todos"
            active={filterRole === 'all'}
            onPress={() => setFilterRole('all')}
          />
          <FilterButton
            label="Psicólogos"
            active={filterRole === 'psychologist'}
            onPress={() => setFilterRole('psychologist')}
          />
          <FilterButton
            label="Pacientes"
            active={filterRole === 'patient'}
            onPress={() => setFilterRole('patient')}
          />
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
              <Ionicons name="mail-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum convite encontrado</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
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
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#fff',
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
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
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
    color: '#333',
    marginBottom: 4,
  },
  cardEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardDateText: {
    fontSize: 12,
    color: '#999',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  resendButton: {
    backgroundColor: '#E8F4FF',
  },
  resendButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
  },
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
    color: '#999',
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    gap: 12,
  },
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
  fabPrimary: {
    backgroundColor: '#4A90E2',
  },
  fabSecondary: {
    backgroundColor: '#50C878',
  },
});
