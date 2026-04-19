import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import * as expenseService from '../../../services/expenseService';

type DateRangeType = 'month' | 'last_month' | '3months';
type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled';

const getDateRange = (type: DateRangeType) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let startDate: string;
  switch (type) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]; break;
    case '3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]; break;
  }
  return { startDate, endDate: today };
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bgDark: string; icon: string }> = {
  pending:   { label: 'Pendente',  color: '#E6A000', bg: '#FFF8E8', bgDark: '#3D3020', icon: 'time-outline' },
  paid:      { label: 'Pago',      color: '#50C878', bg: '#E8FFF0', bgDark: '#1F3D1F', icon: 'checkmark-circle' },
  overdue:   { label: 'Vencida',   color: '#E74C3C', bg: '#FDEAEA', bgDark: '#3D1F1F', icon: 'alert-circle' },
  cancelled: { label: 'Cancelado', color: '#95A5A6', bg: '#F0F0F0', bgDark: '#2D2D2D', icon: 'close-circle' },
};

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendente' },
  { key: 'overdue', label: 'Vencida' },
  { key: 'paid', label: 'Pago' },
  { key: 'cancelled', label: 'Cancelado' },
];

export default function ExpensesScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expenses, setExpenses] = useState<expenseService.Expense[]>([]);
  const [summary, setSummary] = useState<expenseService.ExpenseSummary | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const params: expenseService.ListExpensesParams = {
        startDate, endDate, limit: 50,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      };
      const [expensesData, summaryData] = await Promise.all([
        expenseService.listExpenses(params),
        expenseService.getExpenseSummary(startDate, endDate),
      ]);
      setExpenses(expensesData.expenses);
      setSummary(summaryData);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar as despesas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleMarkPaid = (expense: expenseService.Expense) => {
    Alert.alert(
      'Marcar como Pago',
      `Confirmar pagamento de ${formatCurrency(expense.amount)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading(expense._id);
            try {
              await expenseService.markExpenseAsPaid(expense._id, {});
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

  const handleCancel = (expense: expenseService.Expense) => {
    Alert.alert(
      'Cancelar Despesa',
      `Tem certeza que deseja cancelar "${expense.description}"?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Cancelar Despesa',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(expense._id);
            try {
              await expenseService.cancelExpense(expense._id);
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

  const getCategoryName = (categoryId: expenseService.FinancialCategory | string) => {
    if (typeof categoryId === 'object') return categoryId.name;
    return 'Sem categoria';
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
        {/* Seletor de período */}
        <View style={styles.dateRangeSelector}>
          {(['month', 'last_month', '3months'] as DateRangeType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.dateBtn, { backgroundColor: colors.surface }, dateRange === type && styles.dateBtnActive]}
              onPress={() => setDateRange(type)}
            >
              <Text style={[styles.dateBtnText, { color: colors.primary }, dateRange === type && styles.dateBtnTextActive]}>
                {type === 'month' ? 'Este Mês' : type === 'last_month' ? 'Mês Passado' : '3 Meses'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cards de resumo */}
        {summary && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1F3D1F' : '#E8FFF0' }]}>
              <Ionicons name="checkmark-circle" size={22} color="#50C878" />
              <Text style={[styles.summaryValue, { color: '#50C878' }]}>{formatCurrency(summary.totalPaid)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Pago</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#3D2020' : '#FFF0E8' }]}>
              <Ionicons name="alert-circle" size={22} color="#FF6B35" />
              <Text style={[styles.summaryValue, { color: '#FF6B35' }]}>{formatCurrency(summary.totalPending)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pendente/Vencido</Text>
            </View>
          </View>
        )}

        {/* Filtros de status */}
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
                <Text style={[styles.filterPillText, { color: colors.textSecondary }, statusFilter === f.key && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Lista de despesas */}
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma despesa encontrada</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Toque em "+" para registrar uma despesa
              </Text>
            </View>
          ) : (
            expenses.map((expense, idx) => {
              const sc = STATUS_CONFIG[expense.status] || STATUS_CONFIG.pending;
              const isLoading = actionLoading === expense._id;
              const canPay = expense.status === 'pending' || expense.status === 'overdue';
              const canCancel = expense.status === 'pending' || expense.status === 'overdue';

              return (
                <View key={expense._id}>
                  {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />}
                  <View style={styles.expenseItem}>
                    <View style={[styles.expenseIconWrap, { backgroundColor: isDark ? sc.bgDark : sc.bg }]}>
                      <Ionicons name={sc.icon as any} size={20} color={sc.color} />
                    </View>
                    <View style={styles.expenseInfo}>
                      <View style={styles.expenseTopRow}>
                        <Text style={[styles.expenseDesc, { color: colors.textPrimary }]} numberOfLines={1}>
                          {expense.description}
                        </Text>
                        <Text style={[styles.expenseAmount, { color: colors.textPrimary }]}>
                          {formatCurrency(expense.amount)}
                        </Text>
                      </View>
                      <View style={styles.expenseBottomRow}>
                        <Text style={[styles.expenseCategory, { color: colors.textSecondary }]}>
                          {getCategoryName(expense.categoryId)}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: isDark ? sc.bgDark : sc.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.expenseDate, { color: colors.textTertiary }]}>
                        Venc: {formatDate(expense.dueDate)}
                        {expense.paidAt ? `  •  Pago: ${formatDate(expense.paidAt)}` : ''}
                      </Text>

                      {/* Ações */}
                      {(canPay || canCancel) && (
                        <View style={styles.actionsRow}>
                          {canPay && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnPay]}
                              onPress={() => handleMarkPaid(expense)}
                              disabled={isLoading}
                            >
                              {isLoading
                                ? <ActivityIndicator size="small" color="#50C878" />
                                : <Text style={[styles.actionBtnText, { color: '#50C878' }]}>Pagar</Text>
                              }
                            </TouchableOpacity>
                          )}
                          {canCancel && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnCancel]}
                              onPress={() => handleCancel(expense)}
                              disabled={isLoading}
                            >
                              <Text style={[styles.actionBtnText, { color: '#E74C3C' }]}>Cancelar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ExpenseForm', { expense: null })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  dateRangeSelector: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dateBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  dateBtnActive: { borderColor: colors.primary },
  dateBtnText: { fontSize: 12, fontWeight: '500' },
  dateBtnTextActive: { fontWeight: '700' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 4 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  summaryLabel: { fontSize: 11, textAlign: 'center' },
  filtersScroll: { marginTop: 8 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { fontSize: 12, fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },
  listCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
  divider: { height: 1, marginHorizontal: 16 },
  expenseItem: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start' },
  expenseIconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  expenseInfo: { flex: 1 },
  expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  expenseDesc: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  expenseAmount: { fontSize: 14, fontWeight: '700' },
  expenseBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  expenseCategory: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  expenseDate: { fontSize: 11, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  actionBtnPay: { borderColor: '#50C878' },
  actionBtnCancel: { borderColor: '#E74C3C' },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
});
