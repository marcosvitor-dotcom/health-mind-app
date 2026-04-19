import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { listSubscriptions, AdminSubscription } from '../../services/adminService';

const PLAN_NAMES: Record<string, string> = {
  psico_avaliacao: 'Avaliação (Trial)',
  psico_basico: 'Básico',
  psico_consciencia: 'Consciência',
  psico_equilibrio: 'Equilíbrio',
  psico_plenitude: 'Plenitude',
  clinic_essencia: 'Essência',
  clinic_amplitude: 'Amplitude',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativa', color: '#27AE60' },
  overdue: { label: 'Em atraso', color: '#E67E22' },
  blocked: { label: 'Bloqueada', color: '#E74C3C' },
  cancelled: { label: 'Cancelada', color: '#95A5A6' },
  none: { label: 'Sem assinatura', color: '#95A5A6' },
};

const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'active', label: 'Ativas' },
  { key: 'overdue', label: 'Em atraso' },
  { key: 'blocked', label: 'Bloqueadas' },
  { key: 'active&isTrial=true', label: 'Trial' },
];

export default function SubscriptionsScreen() {
  const navigation = useNavigation<any>();
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');

  const loadData = useCallback(async (filter: string) => {
    try {
      const result = await listSubscriptions({ status: filter || undefined, limit: 50 });
      setSubscriptions(result.subscriptions);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeFilter);
  }, [activeFilter, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(activeFilter);
  };

  const handleFilterChange = (key: string) => {
    if (key === activeFilter) return;
    setActiveFilter(key);
    setLoading(true);
  };

  const renderItem = ({ item }: { item: AdminSubscription }) => {
    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.none;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{item.userId?.name ?? '—'}</Text>
            <Text style={styles.userEmail}>{item.userId?.email ?? '—'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="ribbon-outline" size={14} color="#666" />
            <Text style={styles.detailText}>
              {PLAN_NAMES[item.planKey] ?? item.planKey}
              {item.isTrial ? '  (Trial)' : ''}
            </Text>
          </View>

          {!item.isTrial && item.billing.monthlyAmount > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={14} color="#666" />
              <Text style={styles.detailText}>R$ {item.billing.monthlyAmount}/mês</Text>
            </View>
          )}

          {item.billing.nextBillingDate && !item.isTrial && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                Próx. venc.: {new Date(item.billing.nextBillingDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}

          {item.isTrial && item.trialEndsAt && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                Trial até: {new Date(item.trialEndsAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Assinaturas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
            onPress={() => handleFilterChange(f.key)}
          >
            <Text style={[styles.filterTabText, activeFilter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma assinatura encontrada</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: { backgroundColor: '#4A90E2' },
  filterTabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterTabTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  userName: { fontSize: 15, fontWeight: '700', color: '#333' },
  userEmail: { fontSize: 13, color: '#666', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#555' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#aaa' },
});
