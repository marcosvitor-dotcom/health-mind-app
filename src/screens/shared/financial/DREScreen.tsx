import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import * as financialReportService from '../../../services/financialReportService';

const SCREEN_WIDTH = Dimensions.get('window').width;

type PeriodMode = '1m' | '3m' | '6m' | '12m';

const PERIOD_OPTIONS: { key: PeriodMode; label: string }[] = [
  { key: '1m', label: '1 Mês' },
  { key: '3m', label: '3 Meses' },
  { key: '6m', label: '6 Meses' },
  { key: '12m', label: '12 Meses' },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatMonthLabel = (month: string) => {
  const [year, m] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${year.slice(2)}`;
};

const getDateRange = (mode: PeriodMode) => {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const months = mode === '1m' ? 1 : mode === '3m' ? 3 : mode === '6m' ? 6 : 12;
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return { startDate: start.toISOString().split('T')[0], endDate };
};

export default function DREScreen(_props: any) {
  const { colors, isDark } = useTheme();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('3m');
  const [dre, setDre] = useState<financialReportService.DREReport | null>(null);
  const [cashFlow, setCashFlow] = useState<financialReportService.CashFlowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRange(periodMode);
      const [dreData, cashFlowData] = await Promise.all([
        financialReportService.getDRE(startDate, endDate),
        financialReportService.getCashFlow(startDate, endDate),
      ]);
      setDre(dreData);
      setCashFlow(cashFlowData);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível carregar o relatório');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodMode]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const styles = createStyles(colors, isDark);

  const netProfitColor = dre && dre.netProfit >= 0 ? '#50C878' : '#E74C3C';
  const netProfitBg = dre && dre.netProfit >= 0
    ? (isDark ? '#1F3D1F' : '#E8FFF0')
    : (isDark ? '#3D1F1F' : '#FDEAEA');

  const maxBarValue = cashFlow
    ? Math.max(...cashFlow.cashFlow.flatMap((m) => [m.income, m.expenses]), 1)
    : 1;

  const maxExpense = dre && dre.expenses.byCategory.length > 0
    ? Math.max(...dre.expenses.byCategory.map((c) => c.total), 1)
    : 1;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Seletor de período */}
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.periodBtn,
              { backgroundColor: colors.surface },
              periodMode === opt.key && styles.periodBtnActive,
            ]}
            onPress={() => setPeriodMode(opt.key)}
          >
            <Text style={[
              styles.periodBtnText,
              { color: colors.textSecondary },
              periodMode === opt.key && { color: colors.primary, fontWeight: '700' },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* KPI Cards */}
          {dre && (
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1A2E4A' : '#E8F4FD' }]}>
                <Ionicons name="trending-up" size={20} color="#4A90E2" />
                <Text style={[styles.kpiValue, { color: '#4A90E2' }]} numberOfLines={1}>
                  {formatCurrency(dre.revenue.ownerRevenue)}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Receita Líquida</Text>
                <Text style={[styles.kpiSub, { color: colors.textTertiary }]}>
                  {dre.revenue.sessionCount} sessões
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: isDark ? '#3D2E1A' : '#FFF4E8' }]}>
                <Ionicons name="trending-down" size={20} color="#FF9800" />
                <Text style={[styles.kpiValue, { color: '#FF9800' }]} numberOfLines={1}>
                  {formatCurrency(dre.expenses.total)}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Total Despesas</Text>
                <Text style={[styles.kpiSub, { color: colors.textTertiary }]}>
                  {dre.expenses.byCategory.length} categorias
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: netProfitBg }]}>
                <Ionicons
                  name={dre.netProfit >= 0 ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={netProfitColor}
                />
                <Text style={[styles.kpiValue, { color: netProfitColor }]} numberOfLines={1}>
                  {formatCurrency(dre.netProfit)}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Lucro Líquido</Text>
                <Text style={[styles.kpiSub, { color: colors.textTertiary }]}>
                  {dre.revenue.ownerRevenue > 0
                    ? `${Math.round((dre.netProfit / dre.revenue.ownerRevenue) * 100)}% margem`
                    : '—'}
                </Text>
              </View>
            </View>
          )}

          {/* Gráfico de Fluxo de Caixa */}
          {cashFlow && cashFlow.cashFlow.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fluxo de Caixa</Text>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4A90E2' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Receita</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Despesa</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartContainer}>
                  {cashFlow.cashFlow.map((m) => {
                    const incomeH = Math.max((m.income / maxBarValue) * 120, 2);
                    const expenseH = Math.max((m.expenses / maxBarValue) * 120, 2);
                    return (
                      <View key={m.month} style={styles.barGroup}>
                        <View style={styles.barsWrapper}>
                          <View style={[styles.bar, { height: incomeH, backgroundColor: '#4A90E2' }]} />
                          <View style={[styles.bar, { height: expenseH, backgroundColor: '#FF9800' }]} />
                        </View>
                        <Text style={[styles.barLabel, { color: colors.textTertiary }]}>
                          {formatMonthLabel(m.month)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Totais do período */}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Receita Total</Text>
                  <Text style={[styles.totalValue, { color: '#4A90E2' }]}>
                    {formatCurrency(cashFlow.totals.totalIncome)}
                  </Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Despesa Total</Text>
                  <Text style={[styles.totalValue, { color: '#FF9800' }]}>
                    {formatCurrency(cashFlow.totals.totalExpenses)}
                  </Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Saldo</Text>
                  <Text style={[styles.totalValue, { color: cashFlow.totals.totalBalance >= 0 ? '#50C878' : '#E74C3C' }]}>
                    {formatCurrency(cashFlow.totals.totalBalance)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Breakdown por Categoria */}
          {dre && dre.expenses.byCategory.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Despesas por Categoria</Text>
              {dre.expenses.byCategory.map((cat) => {
                const pct = dre.expenses.total > 0
                  ? Math.round((cat.total / dre.expenses.total) * 100)
                  : 0;
                const barWidth = dre.expenses.total > 0 ? (cat.total / dre.expenses.total) : 0;
                return (
                  <View key={cat._id} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {cat.categoryName}
                      </Text>
                      <View style={styles.categoryRight}>
                        <Text style={[styles.categoryPct, { color: colors.textTertiary }]}>{pct}%</Text>
                        <Text style={[styles.categoryValue, { color: colors.textPrimary }]}>
                          {formatCurrency(cat.total)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F0F0' }]}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#FF9800' }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {dre && dre.expenses.byCategory.length === 0 && dre.revenue.ownerRevenue === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="stats-chart-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Sem dados para o período
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Registre sessões e despesas para ver o DRE
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  periodBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  periodBtnActive: { borderColor: colors.primary },
  periodBtnText: { fontSize: 12, fontWeight: '500' },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  kpiCard: {
    flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4,
  },
  kpiValue: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  kpiLabel: { fontSize: 10, textAlign: 'center', fontWeight: '600' },
  kpiSub: { fontSize: 9, textAlign: 'center' },
  section: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 4, minHeight: 140 },
  barGroup: { alignItems: 'center', gap: 4, minWidth: 48 },
  barsWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 120 },
  bar: { width: 14, borderRadius: 4 },
  barLabel: { fontSize: 9, textAlign: 'center' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, marginTop: 12, paddingTop: 12,
  },
  totalItem: { alignItems: 'center', flex: 1 },
  totalLabel: { fontSize: 10, marginBottom: 2 },
  totalValue: { fontSize: 13, fontWeight: '700' },
  categoryItem: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryName: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryPct: { fontSize: 11 },
  categoryValue: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
});
