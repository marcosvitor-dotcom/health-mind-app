import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as paymentService from '../../services/paymentService';
import NotificationBell from '../../components/NotificationBell';

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

const PAYMENT_METHODS = [
  { key: 'pix', label: 'Pix', icon: 'qr-code' as const },
  { key: 'cash', label: 'Dinheiro', icon: 'cash' as const },
  { key: 'credit_card', label: 'Cartao Credito', icon: 'card' as const },
  { key: 'debit_card', label: 'Cartao Debito', icon: 'card-outline' as const },
  { key: 'bank_transfer', label: 'Transferencia', icon: 'swap-horizontal' as const },
  { key: 'other', label: 'Outro', icon: 'ellipsis-horizontal' as const },
];

export default function PsychologistFinancialScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const psychologistId = user?._id || user?.id || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<paymentService.PsychologistFinancialSummary | null>(null);
  const [payments, setPayments] = useState<paymentService.PaymentData[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeType>('month');

  // Payment method modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange(dateRange);

      const [summaryData, paymentsData] = await Promise.all([
        paymentService.getPsychologistSummary(psychologistId, startDate, endDate),
        paymentService.listPayments({ startDate, endDate, limit: 20 }),
      ]);

      setSummary(summaryData);
      setPayments(paymentsData.payments || []);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  }, [psychologistId, dateRange]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRegisterPayment = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setPaymentModalVisible(true);
  };

  const handleSelectPaymentMethod = async (method: string) => {
    if (!selectedPaymentId) return;
    setActionLoading(true);
    try {
      await paymentService.registerPayment(selectedPaymentId, method);
      setPaymentModalVisible(false);
      setSelectedPaymentId(null);
      Alert.alert('Sucesso', 'Pagamento registrado com sucesso!');
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao registrar pagamento');
    } finally {
      setActionLoading(false);
    }
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

  const getPatientName = (payment: paymentService.PaymentData): string => {
    if (typeof payment.patientId === 'object' && payment.patientId?.name) {
      return payment.patientId.name;
    }
    return 'Paciente';
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
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Resumo dos seus ganhos</Text>
          </View>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
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
            <Ionicons name="checkmark-circle" size={28} color="#50C878" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {formatCurrency(summary?.confirmedEarnings || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Confirmado</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>
              {summary?.confirmedPayments?.count || 0} sessoes
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#3D3020' : '#FFF4E6' }]}>
            <Ionicons name="time-outline" size={28} color="#FF9800" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {formatCurrency(summary?.pendingEarnings || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>A Receber</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>
              {(summary?.pendingPayments?.count || 0) + (summary?.awaitingConfirmation?.count || 0)} pendentes
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}>
            <Ionicons name="trending-up" size={28} color="#4A90E2" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {formatCurrency(summary?.expectedEarnings || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Previsto</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>
              {summary?.totalSessions || 0} sessoes total
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#3D1F1F' : '#FDEAEA' }]}>
            <Ionicons name="close-circle-outline" size={28} color="#E74C3C" />
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {formatCurrency(summary?.cancelledPayments?.value || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cancelados</Text>
            <Text style={[styles.statCount, { color: colors.textTertiary }]}>
              {summary?.cancelledPayments?.count || 0} cancelados
            </Text>
          </View>
        </View>

        {/* Clinic Split Info */}
        {user?.clinicId && summary && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color="#4A90E2" />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Divisao com Clinica</Text>
            </View>
            <View style={[styles.clinicSplitRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.clinicSplitLabel, { color: colors.textSecondary }]}>Percentual da clinica</Text>
              <Text style={[styles.clinicSplitValue, { color: colors.textPrimary }]}>
                {summary.confirmedPayments?.count > 0 ? `${Math.round(((summary.confirmedEarnings || 0) / ((summary.confirmedPayments?.value || 1)) * 100) || 0)}% seu` : '--'}
              </Text>
            </View>
          </View>
        )}

        {/* Recent Payments */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={20} color="#4A90E2" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pagamentos Recentes</Text>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Nenhum pagamento no periodo selecionado
              </Text>
            </View>
          ) : (
            payments.map((payment) => {
              const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
              return (
                <View
                  key={payment._id}
                  style={[styles.paymentItem, { borderBottomColor: colors.borderLight }]}
                >
                  <View style={styles.paymentItemLeft}>
                    <Text style={[styles.paymentPatient, { color: colors.textPrimary }]}>
                      {getPatientName(payment)}
                    </Text>
                    <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                      {getAppointmentDate(payment)}
                    </Text>
                  </View>
                  <View style={styles.paymentItemRight}>
                    <View style={[styles.statusBadge, { backgroundColor: isDark ? statusConfig.bgDark : statusConfig.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                      </Text>
                    </View>
                    <Text style={[styles.paymentValue, { color: colors.textPrimary }]}>
                      {formatCurrency(user?.clinicId ? payment.psychologistAmount : payment.finalValue)}
                    </Text>
                    {/* Actions */}
                    {payment.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleRegisterPayment(payment._id)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.actionButtonText}>Registrar</Text>
                      </TouchableOpacity>
                    )}
                    {payment.status === 'awaiting_confirmation' && !user?.clinicId && (
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: '#50C878' }]}
                        onPress={() => handleConfirmPayment(payment._id)}
                        disabled={actionLoading}
                      >
                        <Text style={[styles.actionButtonText, { color: '#50C878' }]}>Confirmar</Text>
                      </TouchableOpacity>
                    )}
                    {payment.status === 'awaiting_confirmation' && user?.clinicId && (
                      <Text style={[styles.awaitingClinicText, { color: colors.textTertiary }]}>
                        Aguardando clinica
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Payment Method Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Registrar Pagamento</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Selecione o metodo de pagamento
            </Text>

            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[styles.methodButton, { backgroundColor: isDark ? colors.surfaceSecondary : '#F5F5F5' }]}
                  onPress={() => handleSelectPaymentMethod(method.key)}
                  disabled={actionLoading}
                >
                  <Ionicons name={method.icon} size={24} color="#4A90E2" />
                  <Text style={[styles.methodLabel, { color: colors.textPrimary }]}>{method.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {actionLoading && (
              <ActivityIndicator size="small" color="#4A90E2" style={{ marginTop: 12 }} />
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setPaymentModalVisible(false);
                setSelectedPaymentId(null);
              }}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
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
  clinicSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  clinicSplitLabel: {
    fontSize: 14,
  },
  clinicSplitValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  paymentItemLeft: {
    flex: 1,
  },
  paymentPatient: {
    fontSize: 15,
    fontWeight: '500',
  },
  paymentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentItemRight: {
    alignItems: 'flex-end',
    gap: 4,
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
  paymentValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginTop: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  awaitingClinicText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 16,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
  },
});
