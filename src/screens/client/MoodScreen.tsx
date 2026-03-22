import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as moodService from '../../services/moodService';
import { MoodEntry, MoodType, MOODS } from '../../services/moodService';
import * as appointmentService from '../../services/appointmentService';
import NotificationBell from '../../components/NotificationBell';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

// ── Ícones minimalistas SVG inline via Text unicode (Noto Emoji style) ───────
// Substituímos os emojis genéricos por formas geométricas coloridas minimalistas
const MOOD_ICONS: Record<MoodType, { symbol: string; bg: string }> = {
  euforico: { symbol: '◉', bg: '#FFD700' },
  feliz:    { symbol: '◎', bg: '#50C878' },
  normal:   { symbol: '◌', bg: '#4A90E2' },
  ansioso:  { symbol: '◈', bg: '#FF9800' },
  triste:   { symbol: '◍', bg: '#9E9E9E' },
  raiva:    { symbol: '◆', bg: '#E53935' },
};

type Period = '7d' | '1m' | '6m' | '1a';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '7d', label: '7 dias',  days: 7   },
  { key: '1m', label: '1 mês',   days: 30  },
  { key: '6m', label: '6 meses', days: 182 },
  { key: '1a', label: '1 ano',   days: 365 },
];

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

/** Agrega dias em buckets para períodos longos, retornando labels e valores médios */
function buildChartData(entries: MoodEntry[], days: string[], period: Period) {
  const map: Record<string, number[]> = {};
  entries.forEach((e) => {
    const day = new Date(e.loggedAt).toISOString().split('T')[0];
    if (!map[day]) map[day] = [];
    map[day].push(e.value);
  });

  // Decide quantos pontos exibir no gráfico (máx ~12 para caber na tela)
  let bucketSize = 1;
  if (period === '1m')  bucketSize = 3;   // ~10 pontos
  if (period === '6m')  bucketSize = 14;  // ~13 pontos
  if (period === '1a')  bucketSize = 30;  // ~12 pontos

  const buckets: { label: string; value: number | null }[] = [];
  for (let i = 0; i < days.length; i += bucketSize) {
    const slice = days.slice(i, i + bucketSize);
    const vals: number[] = [];
    slice.forEach((d) => { if (map[d]) vals.push(...map[d]); });
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const [, m, day] = slice[0].split('-');
    buckets.push({ label: `${day}/${m}`, value: avg !== null ? Math.round(avg * 10) / 10 : null });
  }

  const hasData = buckets.some((b) => b.value !== null);
  if (!hasData) return null;

  // Forward-fill nulls
  let last = 3;
  const filled = buckets.map((b) => {
    if (b.value !== null) { last = b.value; return b.value; }
    return last;
  });

  return {
    labels: buckets.map((b) => b.label),
    filled,
    raw: buckets.map((b) => b.value),
  };
}

export default function MoodScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const patientId = (user?._id || user?.id) as string;

  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [sessionDays, setSessionDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('7d');

  const activePeriod = PERIODS.find((p) => p.key === period)!;
  const days = useMemo(() => getLastNDays(activePeriod.days), [activePeriod.days]);
  const startDate = days[0] + 'T00:00:00.000Z';

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      const [timeline, appts] = await Promise.all([
        moodService.getMoodTimeline(patientId, startDate, undefined, 400),
        appointmentService.getPatientAppointments(patientId, 1, 100),
      ]);
      setEntries(timeline.entries);
      const sessSet = new Set(
        (appts.appointments || [])
          .filter((a: any) => a.status === 'completed' || a.status === 'confirmed')
          .map((a: any) => new Date(a.date).toISOString().split('T')[0])
      );
      setSessionDays(sessSet);
    } catch (err) {
      console.error('Erro ao carregar humor:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId, startDate]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLog = async () => {
    if (!selectedMood) return;
    setSaving(true);
    try {
      await moodService.logMood(selectedMood, note.trim() || undefined);
      setSelectedMood(null);
      setNote('');
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o humor. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: MoodEntry) => {
    Alert.alert('Remover registro', 'Deseja remover este registro de humor?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          try {
            await moodService.deleteMoodEntry(entry._id);
            await load();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover o registro.');
          }
        },
      },
    ]);
  };

  const chartData = useMemo(() => buildChartData(entries, days, period), [entries, days, period]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Meu Humor</Text>
          <NotificationBell navigation={navigation} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Meu Humor</Text>
        <NotificationBell navigation={navigation} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* ── Seletor de humor ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Como você está agora?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => {
              const icon = MOOD_ICONS[m.type];
              const isSelected = selectedMood === m.type;
              return (
                <TouchableOpacity
                  key={m.type}
                  style={[
                    styles.moodBtn,
                    { backgroundColor: isDark ? colors.surfaceSecondary : '#f5f5f5' },
                    isSelected && { borderColor: m.color, borderWidth: 2, backgroundColor: isDark ? colors.surfaceSecondary : '#fff' },
                  ]}
                  onPress={() => setSelectedMood(m.type)}
                >
                  {/* Ícone minimalista: círculo colorido com símbolo */}
                  <View style={[styles.moodIconCircle, { backgroundColor: icon.bg + (isSelected ? 'FF' : '33') }]}>
                    <View style={[styles.moodIconDot, { backgroundColor: icon.bg }]} />
                  </View>
                  <Text style={[styles.moodLabel, { color: isSelected ? m.color : colors.textSecondary }, isSelected && { fontWeight: '700' }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedMood && (
            <>
              <TextInput
                style={[styles.noteInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: isDark ? colors.surfaceSecondary : '#fafafa' }]}
                placeholder="Adicionar nota (opcional)..."
                placeholderTextColor={colors.textTertiary}
                value={note}
                onChangeText={setNote}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.logBtn, saving && styles.logBtnDisabled]}
                onPress={handleLog}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.logBtnText}>Registrar</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Gráfico ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Título + seletor de período */}
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Evolução</Text>
            <View style={styles.periodRow}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.periodBtn,
                    { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceSecondary : '#f0f0f0' },
                    period === p.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setPeriod(p.key)}
                >
                  <Text style={[styles.periodLabel, { color: period === p.key ? '#fff' : colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {sessionDays.size > 0 && (
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#4A90E2' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Dia de sessão</Text>
            </View>
          )}

          {chartData ? (
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{ data: chartData.filled }],
              }}
              width={CHART_WIDTH}
              height={180}
              yAxisSuffix=""
              yAxisInterval={1}
              fromZero
              segments={5}
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(80, 200, 120, ${opacity})`,
                labelColor: () => colors.textSecondary,
                propsForDots: { r: '4', strokeWidth: '2', stroke: '#50C878' },
                propsForBackgroundLines: { stroke: isDark ? '#333' : '#eee' },
                propsForLabels: { fontSize: 10 },
              }}
              bezier
              style={{ borderRadius: 8, marginLeft: -8 }}
              withVerticalLines={false}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum registro no período selecionado
              </Text>
            </View>
          )}

          {/* Legenda Y */}
          <View style={styles.yLegend}>
            {MOODS.slice().reverse().map((m) => {
              const icon = MOOD_ICONS[m.type];
              return (
                <View key={m.type} style={styles.yLegendItem}>
                  <View style={[styles.yLegendDot, { backgroundColor: icon.bg }]} />
                  <Text style={[styles.yLegendLabel, { color: colors.textTertiary }]}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Histórico ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Histórico</Text>
          {entries.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum registro ainda. Comece registrando como você está!
            </Text>
          ) : (
            [...entries].reverse().map((entry) => {
              const cfg = moodService.getMoodConfig(entry.mood);
              const icon = MOOD_ICONS[entry.mood];
              const date = new Date(entry.loggedAt);
              return (
                <View key={entry._id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={[styles.historyIconCircle, { backgroundColor: icon.bg + '33' }]}>
                    <View style={[styles.historyIconDot, { backgroundColor: icon.bg }]} />
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyRow}>
                      <Text style={[styles.historyMood, { color: cfg.color }]}>{cfg.label}</Text>
                      <Text style={[styles.historyDate, { color: colors.textTertiary }]}>
                        {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {entry.note && <Text style={[styles.historyNote, { color: colors.textSecondary }]}>{entry.note}</Text>}
                    {sessionDays.has(date.toISOString().split('T')[0]) && (
                      <Text style={styles.sessionTag}>Dia de sessão terapêutica</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(entry)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  card: {
    borderRadius: 12, padding: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },

  // Seletor de humor
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  moodBtn: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 2, borderColor: 'transparent', width: '30%',
  },
  moodIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  moodIconDot: {
    width: 18, height: 18, borderRadius: 9,
  },
  moodLabel: { fontSize: 11, textAlign: 'center' },

  noteInput: {
    marginTop: 12, borderWidth: 1, borderRadius: 8,
    padding: 10, minHeight: 60, fontSize: 14,
  },
  logBtn: {
    marginTop: 10, backgroundColor: '#50C878', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  logBtnDisabled: { opacity: 0.6 },
  logBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Gráfico
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  periodRow: { flexDirection: 'row', gap: 4 },
  periodBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  periodLabel: { fontSize: 11, fontWeight: '500' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  emptyChart: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },

  yLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  yLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yLegendDot: { width: 8, height: 8, borderRadius: 4 },
  yLegendLabel: { fontSize: 10 },

  // Histórico
  historyItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, gap: 10,
  },
  historyIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  historyIconDot: { width: 12, height: 12, borderRadius: 6 },
  historyContent: { flex: 1 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  historyMood: { fontWeight: '600', fontSize: 14 },
  historyDate: { fontSize: 12 },
  historyNote: { fontSize: 13, marginTop: 2 },
  sessionTag: { fontSize: 11, color: '#4A90E2', marginTop: 2 },
  deleteBtn: { padding: 4 },
});
