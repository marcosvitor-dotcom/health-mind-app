import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import * as insuranceBatchService from '../../../services/insuranceBatchService';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bgDark: string }> = {
  open:           { label: 'Aberto',    color: '#4A90E2', bg: '#E8F4FD', bgDark: '#1A2E4A' },
  submitted:      { label: 'Enviado',   color: '#E6A000', bg: '#FFF8E8', bgDark: '#3D3020' },
  partially_paid: { label: 'Parcial',   color: '#FF9800', bg: '#FFF4E8', bgDark: '#3D2E1A' },
  paid:           { label: 'Pago',      color: '#50C878', bg: '#E8FFF0', bgDark: '#1F3D1F' },
  cancelled:      { label: 'Cancelado', color: '#95A5A6', bg: '#F0F0F0', bgDark: '#2D2D2D' },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatMonth = (m: string) => {
  const [year, month] = m.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
};

export default function InsuranceBatchDetailScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const batchId: string = route.params?.batchId;
  const [batch, setBatch] = useState<insuranceBatchService.InsuranceBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal recebimento parcial
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [savingPaid, setSavingPaid] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await insuranceBatchService.getBatch(batchId);
      setBatch(data);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível carregar o lote');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleSubmit = () => {
    if (!batch) return;
    Alert.alert(
      'Enviar ao Convênio',
      `Confirmar envio do lote "${batch.insuranceName}" com ${batch.paymentIds.length} sessões (${formatCurrency(batch.totalAmount)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await insuranceBatchService.submitBatch(batch._id);
              setBatch(updated);
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkPaid = async () => {
    if (!batch) return;
    const amount = parseFloat(receivedAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return Alert.alert('Atenção', 'Informe um valor válido');
    setSavingPaid(true);
    try {
      const updated = await insuranceBatchService.markBatchPaid(batch._id, { receivedAmount: amount });
      setBatch(updated);
      setShowPaidModal(false);
      setReceivedAmount('');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSavingPaid(false);
    }
  };

  const handleCancel = () => {
    if (!batch) return;
    Alert.alert(
      'Cancelar Lote',
      `Tem certeza que deseja cancelar o lote "${batch.insuranceName}"?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Cancelar Lote',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await insuranceBatchService.cancelBatch(batch._id);
              setBatch(updated);
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(colors, isDark);

  const sc = batch ? (STATUS_CONFIG[batch.status] || STATUS_CONFIG.open) : STATUS_CONFIG.open;
  const canSubmit = batch?.status === 'open';
  const canMarkPaid = batch?.status === 'submitted' || batch?.status === 'partially_paid';
  const canCancel = batch?.status === 'open' || batch?.status === 'submitted';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {batch?.insuranceName || 'Lote de Convênio'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : batch ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Resumo do lote */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={[styles.batchName, { color: colors.textPrimary }]}>{batch.insuranceName}</Text>
                <Text style={[styles.batchMonth, { color: colors.textSecondary }]}>
                  {formatMonth(batch.referenceMonth)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isDark ? sc.bgDark : sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
              </View>
            </View>

            <View style={[styles.metricsRow, { borderTopColor: colors.borderLight }]}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Sessões</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {batch.paymentIds.length}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Total do Lote</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatCurrency(batch.totalAmount)}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Recebido</Text>
                <Text style={[styles.metricValue, { color: '#50C878' }]}>
                  {formatCurrency(batch.receivedAmount)}
                </Text>
              </View>
            </View>

            {batch.receivedAmount > 0 && batch.receivedAmount < batch.totalAmount && (
              <View style={[styles.diffRow, { backgroundColor: isDark ? '#3D2E1A' : '#FFF4E8' }]}>
                <Ionicons name="alert-circle-outline" size={14} color="#FF9800" />
                <Text style={{ color: '#FF9800', fontSize: 12, marginLeft: 6 }}>
                  Diferença: {formatCurrency(batch.totalAmount - batch.receivedAmount)}
                </Text>
              </View>
            )}

            {batch.notes ? (
              <View style={[styles.notesBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8F8' }]}>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{batch.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Ações */}
          {(canSubmit || canMarkPaid || canCancel) && (
            <View style={styles.actionsContainer}>
              {canSubmit && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#4A90E2' }]}
                  onPress={handleSubmit}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Enviar ao Convênio</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
              {canMarkPaid && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#50C878' }]}
                  onPress={() => {
                    setReceivedAmount(String(batch.totalAmount));
                    setShowPaidModal(true);
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="cash" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Registrar Recebimento</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
              {canCancel && (
                <TouchableOpacity
                  style={[styles.actionBtnOutline, { borderColor: '#E74C3C' }]}
                  onPress={handleCancel}
                  disabled={actionLoading}
                >
                  <Text style={[styles.actionBtnOutlineText, { color: '#E74C3C' }]}>Cancelar Lote</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Sessões no lote */}
          <View style={[styles.sessionsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Sessões no Lote ({batch.paymentIds.length})
            </Text>
            {batch.paymentIds.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  Nenhuma sessão adicionada
                </Text>
              </View>
            ) : (
              batch.paymentIds.map((pid, idx) => (
                <View key={String(pid)}>
                  {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />}
                  <View style={styles.sessionItem}>
                    <View style={[styles.sessionIcon, { backgroundColor: isDark ? '#1A2E4A' : '#E8F4FD' }]}>
                      <Ionicons name="medical" size={14} color="#4A90E2" />
                    </View>
                    <Text style={[styles.sessionId, { color: colors.textSecondary }]}>
                      Sessão #{String(pid).slice(-6).toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}

      {/* Modal Registrar Recebimento */}
      <Modal visible={showPaidModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowPaidModal(false)}
          activeOpacity={1}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Registrar Recebimento</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Valor Recebido (R$)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={receivedAmount}
              onChangeText={setReceivedAmount}
              placeholder="0,00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: '#50C878' }]}
              onPress={handleMarkPaid}
              disabled={savingPaid}
            >
              {savingPaid
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalSaveBtnText}>Confirmar Recebimento</Text>
              }
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { margin: 16, borderRadius: 12, overflow: 'hidden' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16 },
  batchName: { fontSize: 17, fontWeight: '700' },
  batchMonth: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  metricsRow: {
    flexDirection: 'row', borderTopWidth: 1, paddingVertical: 14,
    paddingHorizontal: 16, justifyContent: 'space-between',
  },
  metricItem: { alignItems: 'center' },
  metricLabel: { fontSize: 11, marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: '700' },
  diffRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 8 },
  notesBox: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
  notesText: { fontSize: 13 },
  actionsContainer: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 13,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionBtnOutline: {
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600' },
  sessionsCard: { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 13 },
  divider: { height: 1, marginHorizontal: -16 },
  sessionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  sessionIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sessionId: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
  },
  modalSaveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
