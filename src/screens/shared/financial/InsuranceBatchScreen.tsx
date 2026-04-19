import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import * as insuranceBatchService from '../../../services/insuranceBatchService';

type StatusFilter = 'all' | 'open' | 'submitted' | 'partially_paid' | 'paid' | 'cancelled';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bgDark: string; icon: string }> = {
  open:           { label: 'Aberto',          color: '#4A90E2', bg: '#E8F4FD', bgDark: '#1A2E4A', icon: 'folder-open' },
  submitted:      { label: 'Enviado',          color: '#E6A000', bg: '#FFF8E8', bgDark: '#3D3020', icon: 'send' },
  partially_paid: { label: 'Parcial',          color: '#FF9800', bg: '#FFF4E8', bgDark: '#3D2E1A', icon: 'cash-outline' },
  paid:           { label: 'Pago',             color: '#50C878', bg: '#E8FFF0', bgDark: '#1F3D1F', icon: 'checkmark-circle' },
  cancelled:      { label: 'Cancelado',        color: '#95A5A6', bg: '#F0F0F0', bgDark: '#2D2D2D', icon: 'close-circle' },
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Aberto' },
  { key: 'submitted', label: 'Enviado' },
  { key: 'partially_paid', label: 'Parcial' },
  { key: 'paid', label: 'Pago' },
  { key: 'cancelled', label: 'Cancelado' },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatMonth = (m: string) => {
  const [year, month] = m.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function InsuranceBatchScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [batches, setBatches] = useState<insuranceBatchService.InsuranceBatch[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal novo lote
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchMonth, setNewBatchMonth] = useState(getCurrentMonth());
  const [savingBatch, setSavingBatch] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const params: insuranceBatchService.ListBatchesParams = {
        limit: 50,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      };
      const data = await insuranceBatchService.listBatches(params);
      setBatches(data.batches);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível carregar os lotes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleSubmit = (batch: insuranceBatchService.InsuranceBatch) => {
    Alert.alert(
      'Enviar ao Convênio',
      `Enviar lote "${batch.insuranceName}" (${formatCurrency(batch.totalAmount)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setActionLoading(batch._id);
            try {
              await insuranceBatchService.submitBatch(batch._id);
              loadData();
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleMarkPaid = (batch: insuranceBatchService.InsuranceBatch) => {
    Alert.alert(
      'Registrar Recebimento',
      `Valor total do lote: ${formatCurrency(batch.totalAmount)}\n\nConfirmar recebimento integral?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading(batch._id);
            try {
              await insuranceBatchService.markBatchPaid(batch._id, { receivedAmount: batch.totalAmount });
              loadData();
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) return Alert.alert('Atenção', 'Informe o nome do convênio');
    if (!newBatchMonth.match(/^\d{4}-\d{2}$/)) return Alert.alert('Atenção', 'Formato do mês inválido (AAAA-MM)');
    setSavingBatch(true);
    try {
      await insuranceBatchService.createBatch({
        insuranceName: newBatchName.trim(),
        referenceMonth: newBatchMonth,
        paymentIds: [],
      });
      setShowNewBatchModal(false);
      setNewBatchName('');
      setNewBatchMonth(getCurrentMonth());
      loadData();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSavingBatch(false);
    }
  };

  const styles = createStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filtersRow}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  statusFilter === f.key && styles.filterPillActive,
                ]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Text style={[
                  styles.filterPillText,
                  { color: colors.textSecondary },
                  statusFilter === f.key && styles.filterPillTextActive,
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Lista */}
        <View style={styles.listContainer}>
          {batches.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="business-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum lote encontrado</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Toque em "+" para criar um lote de convênio
              </Text>
            </View>
          ) : (
            batches.map((batch) => {
              const sc = STATUS_CONFIG[batch.status] || STATUS_CONFIG.open;
              const isLoading = actionLoading === batch._id;
              const canSubmit = batch.status === 'open';
              const canMarkPaid = batch.status === 'submitted' || batch.status === 'partially_paid';

              return (
                <TouchableOpacity
                  key={batch._id}
                  style={[styles.batchCard, { backgroundColor: colors.surface }]}
                  onPress={() => navigation.navigate('InsuranceBatchDetail', { batchId: batch._id })}
                  activeOpacity={0.85}
                >
                  {/* Cabeçalho do card */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconWrap, { backgroundColor: isDark ? sc.bgDark : sc.bg }]}>
                      <Ionicons name={sc.icon as any} size={18} color={sc.color} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {batch.insuranceName}
                      </Text>
                      <Text style={[styles.cardMonth, { color: colors.textSecondary }]}>
                        {formatMonth(batch.referenceMonth)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isDark ? sc.bgDark : sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                  </View>

                  {/* Valores */}
                  <View style={[styles.valuesRow, { borderTopColor: colors.borderLight }]}>
                    <View style={styles.valueItem}>
                      <Text style={[styles.valueLabel, { color: colors.textTertiary }]}>Sessões</Text>
                      <Text style={[styles.valueNum, { color: colors.textPrimary }]}>
                        {batch.paymentIds.length}
                      </Text>
                    </View>
                    <View style={styles.valueItem}>
                      <Text style={[styles.valueLabel, { color: colors.textTertiary }]}>Total</Text>
                      <Text style={[styles.valueNum, { color: colors.textPrimary }]}>
                        {formatCurrency(batch.totalAmount)}
                      </Text>
                    </View>
                    {batch.receivedAmount > 0 && (
                      <View style={styles.valueItem}>
                        <Text style={[styles.valueLabel, { color: colors.textTertiary }]}>Recebido</Text>
                        <Text style={[styles.valueNum, { color: '#50C878' }]}>
                          {formatCurrency(batch.receivedAmount)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Ações */}
                  {(canSubmit || canMarkPaid) && (
                    <View style={styles.actionsRow}>
                      {canSubmit && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: '#4A90E2' }]}
                          onPress={() => handleSubmit(batch)}
                          disabled={isLoading}
                        >
                          {isLoading
                            ? <ActivityIndicator size="small" color="#4A90E2" />
                            : <Text style={[styles.actionBtnText, { color: '#4A90E2' }]}>Enviar ao Convênio</Text>
                          }
                        </TouchableOpacity>
                      )}
                      {canMarkPaid && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: '#50C878' }]}
                          onPress={() => handleMarkPaid(batch)}
                          disabled={isLoading}
                        >
                          {isLoading
                            ? <ActivityIndicator size="small" color="#50C878" />
                            : <Text style={[styles.actionBtnText, { color: '#50C878' }]}>Registrar Recebimento</Text>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowNewBatchModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal Novo Lote */}
      <Modal visible={showNewBatchModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowNewBatchModal(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalSheet, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Novo Lote de Convênio</Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nome do Convênio *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={newBatchName}
              onChangeText={setNewBatchName}
              placeholder="Ex: Unimed, Bradesco Saúde..."
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Mês de Referência *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={newBatchMonth}
              onChangeText={setNewBatchMonth}
              placeholder="AAAA-MM"
              placeholderTextColor={colors.textTertiary}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateBatch}
              disabled={savingBatch}
            >
              {savingBatch
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSaveBtnText}>Criar Lote</Text>
              }
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  filtersScroll: { marginTop: 8 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { fontSize: 12, fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },
  listContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  emptyCard: { borderRadius: 12, alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
  batchCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardHeaderInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardMonth: { fontSize: 12, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  valuesRow: {
    flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12,
    paddingTop: 10, borderTopWidth: 1, gap: 16,
  },
  valueItem: { alignItems: 'center' },
  valueLabel: { fontSize: 10, marginBottom: 2 },
  valueNum: { fontSize: 13, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  actionBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
  },
  modalSaveBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
