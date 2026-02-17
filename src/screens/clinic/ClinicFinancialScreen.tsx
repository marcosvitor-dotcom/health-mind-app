import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as paymentService from '../../services/paymentService';
import * as subleaseService from '../../services/subleaseService';

type DateRangeType = 'month' | 'last_month' | '3months';

const getDateRange = (type: DateRangeType) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let startDate: string;

  switch (type) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      break;
    case '3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      break;
  }

  return { startDate, endDate: today };
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bgDark: string }> = {
  pending: { label: 'Pendente', color: '#E6A000', bg: '#FFF8E8', bgDark: '#3D3020' },
  awaiting_confirmation: { label: 'Aguardando', color: '#4A90E2', bg: '#E8F4FD', bgDark: '#1A2E3D' },
  confirmed: { label: 'Confirmado', color: '#50C878', bg: '#E8FFF0', bgDark: '#1F3D1F' },
  cancelled: { label: 'Cancelado', color: '#E74C3C', bg: '#FDEAEA', bgDark: '#3D1F1F' },
  refunded: { label: 'Reembolsado', color: '#95A5A6', bg: '#F0F0F0', bgDark: '#2D2D2D' },
};

export default function ClinicFinancialScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const clinicId = user?._id || user?.id || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<paymentService.ClinicFinancialSummary | null>(null);
  const [subleaseSummary, setSubleaseSummary] = useState<subleaseService.SubleaseSummary | null>(null);
  const [payments, setPayments] = useState<paymentService.PaymentData[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Batch selection
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange(dateRange);

      const [summaryData, subleaseData, paymentsData] = await Promise.all([
        paymentService.getClinicSummary(clinicId, startDate, endDate),
        subleaseService.getClinicSubleaseSummary(clinicId, startDate, endDate),
        paymentService.listPayments({
          startDate,
          endDate,
          status: statusFilter || undefined,
          limit: 30,
        }),
      ]);

      setSummary(summaryData);
      setSubleaseSummary(subleaseData);
      setPayments(paymentsData.payments || []);
      setSelectedPaymentIds([]);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, dateRange, statusFilter]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleConfirmPayment = async (paymentId: string) => {
    setActionLoading(true);
    try {
      await paymentService.confirmPayment(paymentId);
      Alert.alert('Sucesso', 'Pagamento confirmado!');
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao confirmar pagamento');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    Alert.alert(
      'Cancelar Pagamento',
      'Tem certeza que deseja cancelar este pagamento?',
      [
        { text: 'Nao', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await paymentService.cancelPayment(paymentId, 'Cancelado pela clinica');
              Alert.alert('Sucesso', 'Pagamento cancelado');
              loadData();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao cancelar pagamento');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBatchConfirm = async () => {
    if (selectedPaymentIds.length === 0) return;
    setActionLoading(true);
    try {
      const result = await paymentService.confirmBatchPayments(selectedPaymentIds);
      const msg = result.failed.length > 0
        ? `${result.confirmed.length} confirmado(s), ${result.failed.length} falhou(aram).`
        : `${result.confirmed.length} pagamento(s) confirmado(s)!`;
      Alert.alert('Resultado', msg);
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao confirmar pagamentos');
    } finally {
      setActionLoading(false);
    }
  };

  const getPatientName = (payment: paymentService.PaymentData): string => {
    if (typeof payment.patientId === 'object' && payment.patientId?.name) {
      return payment.patientId.name;
    }
    return 'Paciente';
  };

  const getPsychologistName = (payment: paymentService.PaymentData): string => {
    if (typeof payment.psychologistId === 'object' && payment.psychologistId?.name) {
      return payment.psychologistId.name;
    }
    return 'Psicologo';
  };

  const getAppointmentDate = (payment: paymentService.PaymentData): string => {
    if (typeof payment.appointmentId === 'object' && payment.appointmentId?.date) {
      return new Date(payment.appointmentId.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    }
    return new Date(payment.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const dateRangeLabel = (type: DateRangeType): string => {
    switch (type) {
      case 'month': return 'Este Mes';
      case 'last_month': return 'Mes Passado';
      case '3months': return '3 Meses';
    }
  };

  const awaitingPayments = payments.filter(
    (p) => p.status === 'awaiting_confirmation'
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Financeiro</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Visao geral da clinica
            </Text>
          </View>
        </View>

        {/* Date Range Selector */}
        <View style={styles.dateRangeSelector}>
          {(['month', 'last_month', '3months'] as DateRangeType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.dateRangeButton,
                { backgroundColor: colors.surface },
                dateRange === type && styles.dateRangeButtonActive,
              ]}
              onPress={() => setDateRange(type)}
            >
              <Text
                style={[
                  styles.dateRangeText,
                  dateRange === type && styles.dateRangeTextActive,
                ]}
              >
                {dateRangeLabel(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F3D1F' : '#E8FFF0' }]}>
            <Ionicons name="wallet" size={28} color="#50C878" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {formatCurrency(summary?.confirmedPayments?.clinicValue || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Receita Clinica</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>sua parte</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
            <Ionicons name="checkmark-circle" size={28} color="#4A90E2" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {formatCurrency(summary?.confirmedPayments?.totalValue || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Confirmado</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>
              {summary?.confirmedPayments?.count || 0} sessoes
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#3D3020' : '#FFF4E6' }]}>
            <Ionicons name="time-outline" size={28} color="#FF9800" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {formatCurrency(
                (summary?.pendingPayments?.totalValue || 0) +
                (summary?.awaitingConfirmation?.totalValue || 0)
              )}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendente</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>
              {(summary?.pendingPayments?.count || 0) + (summary?.awaitingConfirmation?.count || 0)} aguardando
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#2D1F3D' : '#F3E5F5' }]}>
            <Ionicons name="calendar" size={28} color="#9C27B0" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {summary?.totalSessions || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Sessoes</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>no periodo</Text>
          </View>
        </View>

        {/* Sublease Income */}
        {subleaseSummary && (subleaseSummary.totalCount > 0 || subleaseSummary.totalValue > 0) && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={20} color="#E8A317" />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Receita de Sublocacoes
              </Text>
            </View>
            <View style={styles.subleaseRow}>
              <View style={styles.subleaseItem}>
                <Text style={[styles.subleaseLabel, { color: colors.textSecondary }]}>Recebido</Text>
                <Text style={[styles.subleaseValue, { color: '#50C878' }]}>
                  {formatCurrency(subleaseSummary.paidValue)}
                </Text>
                <Text style={[styles.subleaseCount, { color: colors.textTertiary }]}>
                  {subleaseSummary.paidCount} pagas
                </Text>
              </View>
              <View style={[styles.subleaseDivider, { backgroundColor: colors.border }]} />
              <View style={styles.subleaseItem}>
                <Text style={[styles.subleaseLabel, { color: colors.textSecondary }]}>Pendente</Text>
                <Text style={[styles.subleaseValue, { color: '#FF9800' }]}>
                  {formatCurrency(subleaseSummary.pendingValue)}
                </Text>
                <Text style={[styles.subleaseCount, { color: colors.textTertiary }]}>
                  {subleaseSummary.pendingCount} pendentes
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Breakdown by Psychologist */}
        {summary?.byPsychologist && summary.byPsychologist.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#4A90E2" />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Por Psicologo</Text>
            </View>
            {summary.byPsychologist.map((psych, index) => (
              <View
                key={psych.psychologistId || index}
                style={[
                  styles.psychBreakdownItem,
                  { borderBottomColor: colors.borderLight },
                  index === summary.byPsychologist.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.psychName, { color: colors.textPrimary }]}>{psych.name}</Text>
                <View style={styles.psychStats}>
                  <View style={styles.psychStatItem}>
                    <Text style={[styles.psychStatLabel, { color: colors.textTertiary }]}>Confirmado</Text>
                    <Text style={[styles.psychStatValue, { color: '#50C878' }]}>
                      {formatCurrency(psych.confirmedPayments?.value || 0)}
                    </Text>
                  </View>
                  <View style={styles.psychStatItem}>
                    <Text style={[styles.psychStatLabel, { color: colors.textTertiary }]}>Pendente</Text>
                    <Text style={[styles.psychStatValue, { color: '#FF9800' }]}>
                      {formatCurrency((psych.pendingPayments?.value || 0) + (psych.awaitingConfirmation?.value || 0))}
                    </Text>
                  </View>
                  <View style={styles.psychStatItem}>
                    <Text style={[styles.psychStatLabel, { color: colors.textTertiary }]}>Sessoes</Text>
                    <Text style={[styles.psychStatValue, { color: colors.textPrimary }]}>
                      {psych.totalSessions}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Payment Status Filter */}
        <View style={styles.filterRow}>
          {[
            { key: null, label: 'Todos' },
            { key: 'awaiting_confirmation', label: 'Aguardando' },
            { key: 'pending', label: 'Pendentes' },
            { key: 'confirmed', label: 'Confirmados' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key || 'all'}
              style={[
                styles.filterPill,
                { backgroundColor: colors.surface },
                statusFilter === filter.key && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === filter.key && styles.filterPillTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Batch Actions */}
        {selectedPaymentIds.length > 0 && (
          <View style={[styles.batchBar, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
            <Text style={[styles.batchText, { color: colors.textPrimary }]}>
              {selectedPaymentIds.length} selecionado(s)
            </Text>
            <TouchableOpacity
              style={styles.batchButton}
              onPress={handleBatchConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.batchButtonText}>Confirmar Selecionados</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Payments List */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={20} color="#4A90E2" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pagamentos</Text>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Nenhum pagamento encontrado
              </Text>
            </View>
          ) : (
            payments.map((payment) => {
              const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
              const isSelectable = payment.status === 'awaiting_confirmation';
              const isSelected = selectedPaymentIds.includes(payment._id);

              return (
                <View
                  key={payment._id}
                  style={[styles.paymentItem, { borderBottomColor: colors.borderLight }]}
                >
                  {/* Checkbox for awaiting_confirmation */}
                  {isSelectable && (
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => togglePaymentSelection(payment._id)}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSelected ? '#4A90E2' : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  )}

                  <View style={styles.paymentItemContent}>
                    <View style={styles.paymentItemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.paymentPatient, { color: colors.textPrimary }]}>
                          {getPatientName(payment)}
                        </Text>
                        <Text style={[styles.paymentPsych, { color: colors.textSecondary }]}>
                          {getPsychologistName(payment)}
                        </Text>
                      </View>
                      <View style={styles.paymentItemRight}>
                        <View style={[styles.statusBadge, { backgroundColor: isDark ? statusConfig.bgDark : statusConfig.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.paymentItemBottom}>
                      <Text style={[styles.paymentDate, { color: colors.textTertiary }]}>
                        {getAppointmentDate(payment)}
                      </Text>
                      <View style={styles.paymentValues}>
                        <Text style={[styles.paymentTotal, { color: colors.textPrimary }]}>
                          {formatCurrency(payment.finalValue)}
                        </Text>
                        {payment.clinicAmount > 0 && (
                          <Text style={[styles.paymentClinicShare, { color: '#50C878' }]}>
                            Clinica: {formatCurrency(payment.clinicAmount)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Actions */}
                    {(payment.status === 'awaiting_confirmation' || payment.status === 'pending') && (
                      <View style={styles.paymentActions}>
                        {payment.status === 'awaiting_confirmation' && (
                          <TouchableOpacity
                            style={[styles.paymentActionButton, { borderColor: '#50C878' }]}
                            onPress={() => handleConfirmPayment(payment._id)}
                            disabled={actionLoading}
                          >
                            <Ionicons name="checkmark" size={14} color="#50C878" />
                            <Text style={[styles.paymentActionText, { color: '#50C878' }]}>
                              Confirmar
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.paymentActionButton, { borderColor: '#E74C3C' }]}
                          onPress={() => handleCancelPayment(payment._id)}
                          disabled={actionLoading}
                        >
                          <Ionicons name="close" size={14} color="#E74C3C" />
                          <Text style={[styles.paymentActionText, { color: '#E74C3C' }]}>
                            Cancelar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  dateRangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  dateRangeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  dateRangeTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statCount: {
    fontSize: 11,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Sublease
  subleaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subleaseItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  subleaseDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },
  subleaseLabel: {
    fontSize: 12,
  },
  subleaseValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subleaseCount: {
    fontSize: 11,
  },
  // Psychologist breakdown
  psychBreakdownItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  psychName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  psychStats: {
    flexDirection: 'row',
    gap: 16,
  },
  psychStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  psychStatLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  psychStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  filterPillActive: {
    backgroundColor: '#4A90E2',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  // Batch
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  batchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  batchButton: {
    backgroundColor: '#50C878',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  batchButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Payments
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkbox: {
    marginRight: 10,
    marginTop: 2,
  },
  paymentItemContent: {
    flex: 1,
  },
  paymentItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  paymentPatient: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentPsych: {
    fontSize: 12,
    marginTop: 1,
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentValues: {
    alignItems: 'flex-end',
  },
  paymentTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  paymentClinicShare: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  paymentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  paymentActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
