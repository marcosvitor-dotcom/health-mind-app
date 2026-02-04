import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as adminService from '../../services/adminService';
import { AdminPsychologist, AdminPatient, AdminUser } from '../../types';

type TabType = 'psychologists' | 'patients' | 'admins';

export default function UsersScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('psychologists');
  const [psychologists, setPsychologists] = useState<AdminPsychologist[]>([]);
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const canManageAdmins = (user as any)?.permissions?.promoteAdmin;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (activeTab === 'psychologists') {
        const data = await adminService.listPsychologists({ search, includeDeleted: true });
        setPsychologists(data.psychologists);
      } else if (activeTab === 'patients') {
        const data = await adminService.listPatients({ search, includeDeleted: true });
        setPatients(data.patients);
      } else if (activeTab === 'admins' && canManageAdmins) {
        const data = await adminService.listAdmins({ includeDeleted: true });
        setAdmins(data.admins);
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search, canManageAdmins]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDeletePsychologist = async (item: AdminPsychologist) => {
    Alert.alert('Desativar Psicólogo', `Tem certeza que deseja desativar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desativar',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deletePsychologist(item._id);
            Alert.alert('Sucesso', 'Psicólogo desativado com sucesso');
            loadData();
          } catch (err: any) {
            Alert.alert('Erro', err.message);
          }
        },
      },
    ]);
  };

  const handleRestorePsychologist = async (item: AdminPsychologist) => {
    try {
      await adminService.restorePsychologist(item._id);
      Alert.alert('Sucesso', 'Psicólogo restaurado com sucesso');
      loadData();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  const handleDeletePatient = async (item: AdminPatient) => {
    Alert.alert('Desativar Paciente', `Tem certeza que deseja desativar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desativar',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deletePatient(item._id);
            Alert.alert('Sucesso', 'Paciente desativado com sucesso');
            loadData();
          } catch (err: any) {
            Alert.alert('Erro', err.message);
          }
        },
      },
    ]);
  };

  const handleRestorePatient = async (item: AdminPatient) => {
    try {
      await adminService.restorePatient(item._id);
      Alert.alert('Sucesso', 'Paciente restaurado com sucesso');
      loadData();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  const handleRevokeAdmin = async (item: AdminUser) => {
    if (item._id === (user as any)?._id) {
      Alert.alert('Erro', 'Você não pode revogar seu próprio acesso');
      return;
    }

    Alert.alert('Revogar Admin', `Tem certeza que deseja revogar "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revogar',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.revokeAdmin(item._id);
            Alert.alert('Sucesso', 'Administrador revogado com sucesso');
            loadData();
          } catch (err: any) {
            Alert.alert('Erro', err.message);
          }
        },
      },
    ]);
  };

  const renderPsychologist = ({ item }: { item: AdminPsychologist }) => (
    <View style={[styles.userCard, item.deletedAt && styles.deletedCard]}>
      <View style={styles.userHeader}>
        <View style={[styles.userIcon, { backgroundColor: '#EDE7F6' }]}>
          <Ionicons name="medkit" size={24} color={item.deletedAt ? '#999' : '#9B59B6'} />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, item.deletedAt && styles.deletedText]}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.clinicId && (
            <Text style={styles.userMeta}>Clínica: {item.clinicId.name}</Text>
          )}
        </View>
        {item.deletedAt && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>Desativado</Text>
          </View>
        )}
      </View>
      <View style={styles.userActions}>
        {item.deletedAt ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.restoreBtn]}
            onPress={() => handleRestorePsychologist(item)}
          >
            <Ionicons name="refresh" size={16} color="#27AE60" />
            <Text style={[styles.actionBtnText, { color: '#27AE60' }]}>Restaurar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeletePsychologist(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#E74C3C" />
            <Text style={[styles.actionBtnText, { color: '#E74C3C' }]}>Desativar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPatient = ({ item }: { item: AdminPatient }) => (
    <View style={[styles.userCard, item.deletedAt && styles.deletedCard]}>
      <View style={styles.userHeader}>
        <View style={[styles.userIcon, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="person" size={24} color={item.deletedAt ? '#999' : '#27AE60'} />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, item.deletedAt && styles.deletedText]}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.psychologistId && (
            <Text style={styles.userMeta}>Psicólogo: {item.psychologistId.name}</Text>
          )}
        </View>
        {item.deletedAt && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>Desativado</Text>
          </View>
        )}
      </View>
      <View style={styles.userActions}>
        {item.deletedAt ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.restoreBtn]}
            onPress={() => handleRestorePatient(item)}
          >
            <Ionicons name="refresh" size={16} color="#27AE60" />
            <Text style={[styles.actionBtnText, { color: '#27AE60' }]}>Restaurar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeletePatient(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#E74C3C" />
            <Text style={[styles.actionBtnText, { color: '#E74C3C' }]}>Desativar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAdmin = ({ item }: { item: AdminUser }) => (
    <View style={[styles.userCard, item.deletedAt && styles.deletedCard]}>
      <View style={styles.userHeader}>
        <View style={[styles.userIcon, { backgroundColor: '#FADBD8' }]}>
          <Ionicons name="shield" size={24} color={item.deletedAt ? '#999' : '#E74C3C'} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.adminNameRow}>
            <Text style={[styles.userName, item.deletedAt && styles.deletedText]}>{item.name}</Text>
            {item.permissions?.promoteAdmin && (
              <View style={styles.superAdminBadge}>
                <Text style={styles.superAdminText}>Super</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        {item.deletedAt && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>Revogado</Text>
          </View>
        )}
      </View>
      {!item.deletedAt && item._id !== (user as any)?._id && (
        <View style={styles.userActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleRevokeAdmin(item)}
          >
            <Ionicons name="close-circle" size={16} color="#E74C3C" />
            <Text style={[styles.actionBtnText, { color: '#E74C3C' }]}>Revogar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const TabButton = ({ tab, label, icon }: { tab: TabType; label: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? '#E74C3C' : '#666'}
      />
      <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getCurrentList = () => {
    if (activeTab === 'psychologists') return psychologists;
    if (activeTab === 'patients') return patients;
    return admins;
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'psychologists') return renderPsychologist({ item });
    if (activeTab === 'patients') return renderPatient({ item });
    return renderAdmin({ item });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Usuários</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton tab="psychologists" label="Psicólogos" icon="medkit" />
        <TabButton tab="patients" label="Pacientes" icon="people" />
        {canManageAdmins && <TabButton tab="admins" label="Admins" icon="shield" />}
      </View>

      {/* Search */}
      {activeTab !== 'admins' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder={`Buscar ${activeTab === 'psychologists' ? 'psicólogos' : 'pacientes'}...`}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={loadData}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E74C3C" />
        </View>
      ) : getCurrentList().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={getCurrentList()}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E74C3C']} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FADBD8',
  },
  tabBtnText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deletedCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  adminNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deletedText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  deletedBadge: {
    backgroundColor: '#FADBD8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deletedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E74C3C',
  },
  superAdminBadge: {
    backgroundColor: '#FEF5E7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  superAdminText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E67E22',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  deleteBtn: {
    backgroundColor: '#FADBD8',
  },
  restoreBtn: {
    backgroundColor: '#D5F5E3',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
