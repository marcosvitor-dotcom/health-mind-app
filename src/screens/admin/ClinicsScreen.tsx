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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as adminService from '../../services/adminService';
import { AdminClinic } from '../../types';

type FilterType = 'all' | 'active' | 'deleted';

export default function ClinicsScreen() {
  const navigation = useNavigation<any>();
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('active');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClinics = useCallback(
    async (resetPage = true) => {
      try {
        setError(null);
        const currentPage = resetPage ? 1 : page;

        const data = await adminService.listClinics({
          page: currentPage,
          limit: 20,
          search,
          includeDeleted: filter === 'all' || filter === 'deleted',
        });

        let filteredClinics = data.clinics;

        // Filtrar localmente se necessário
        if (filter === 'deleted') {
          filteredClinics = data.clinics.filter((c) => c.deletedAt);
        } else if (filter === 'active') {
          filteredClinics = data.clinics.filter((c) => !c.deletedAt);
        }

        if (resetPage) {
          setClinics(filteredClinics);
          setPage(1);
        } else {
          setClinics((prev) => [...prev, ...filteredClinics]);
        }

        setHasMore(data.pagination.page < data.pagination.pages);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar clínicas');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, filter]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadClinics(true);
    }, [filter])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadClinics(true);
  }, [loadClinics]);

  const handleSearch = useCallback(() => {
    setLoading(true);
    loadClinics(true);
  }, [loadClinics]);

  const handleDelete = async (clinic: AdminClinic) => {
    Alert.alert(
      'Desativar Clínica',
      `Tem certeza que deseja desativar "${clinic.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteClinic(clinic._id);
              Alert.alert('Sucesso', 'Clínica desativada com sucesso');
              loadClinics(true);
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao desativar clínica');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (clinic: AdminClinic) => {
    Alert.alert(
      'Restaurar Clínica',
      `Tem certeza que deseja restaurar "${clinic.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            try {
              await adminService.restoreClinic(clinic._id);
              Alert.alert('Sucesso', 'Clínica restaurada com sucesso');
              loadClinics(true);
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao restaurar clínica');
            }
          },
        },
      ]
    );
  };

  const renderClinic = ({ item }: { item: AdminClinic }) => (
    <TouchableOpacity
      style={[styles.clinicCard, item.deletedAt && styles.deletedCard]}
      onPress={() => navigation.navigate('ClinicDetail', { clinic: item })}
    >
      <View style={styles.clinicHeader}>
        <View style={styles.clinicIcon}>
          <Ionicons name="business" size={24} color={item.deletedAt ? '#999' : '#3498DB'} />
        </View>
        <View style={styles.clinicInfo}>
          <Text style={[styles.clinicName, item.deletedAt && styles.deletedText]}>
            {item.name}
          </Text>
          <Text style={styles.clinicEmail}>{item.email}</Text>
        </View>
        {item.deletedAt && (
          <View style={styles.deletedBadge}>
            <Text style={styles.deletedBadgeText}>Desativada</Text>
          </View>
        )}
      </View>

      <View style={styles.clinicStats}>
        <View style={styles.statItem}>
          <Ionicons name="medkit" size={16} color="#9B59B6" />
          <Text style={styles.statText}>{item.psychologistsCount} psicólogos</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#27AE60" />
          <Text style={styles.statText}>{item.patientsCount} pacientes</Text>
        </View>
      </View>

      <View style={styles.clinicActions}>
        {item.deletedAt ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.restoreBtn]}
            onPress={() => handleRestore(item)}
          >
            <Ionicons name="refresh" size={18} color="#27AE60" />
            <Text style={[styles.actionBtnText, { color: '#27AE60' }]}>Restaurar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#E74C3C" />
            <Text style={[styles.actionBtnText, { color: '#E74C3C' }]}>Desativar</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
    <TouchableOpacity
      style={[styles.filterBtn, filter === type && styles.filterBtnActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterBtnText, filter === type && styles.filterBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && clinics.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E74C3C" />
          <Text style={styles.loadingText}>Carregando clínicas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Clínicas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('InviteClinic')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar clínicas..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterButton type="active" label="Ativas" />
        <FilterButton type="deleted" label="Desativadas" />
        <FilterButton type="all" label="Todas" />
      </View>

      {/* List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadClinics(true)}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : clinics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Nenhuma clínica encontrada</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'active'
              ? 'Não há clínicas ativas no momento'
              : filter === 'deleted'
              ? 'Não há clínicas desativadas'
              : 'Nenhuma clínica cadastrada'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={clinics}
          renderItem={renderClinic}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E74C3C']} />
          }
          onEndReached={() => {
            if (hasMore && !loading) {
              setPage((p) => p + 1);
              loadClinics(false);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && clinics.length > 0 ? (
              <ActivityIndicator style={{ padding: 16 }} color="#E74C3C" />
            ) : null
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterBtnActive: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  filterBtnText: {
    fontSize: 14,
    color: '#666',
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  clinicCard: {
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
  clinicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clinicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deletedText: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  clinicEmail: {
    fontSize: 14,
    color: '#666',
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
  clinicStats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  clinicActions: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
