import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';
import * as moodService from '../../services/moodService';
import { MoodEntry, MOODS } from '../../services/moodService';
import * as appointmentService from '../../services/appointmentService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32;

type RangeKey = '7' | '30' | '90';
const RANGES: { label: string; key: RangeKey }[] = [
  { label: '7 dias', key: '7' },
  { label: '30 dias', key: '30' },
  { label: '90 dias', key: '90' },
];

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

function buildChartData(entries: MoodEntry[], days: string[]) {
  const map: Record<string, number> = {};
  entries.forEach((e) => {
    const day = new Date(e.loggedAt).toISOString().split('T')[0];
    map[day] = e.value;
  });

  const data: (number | null)[] = days.map((d) => (map[d] !== undefined ? map[d] : null));
  const hasData = data.some((v) => v !== null);
  if (!hasData) return null;

  let last = 3;
  const filled = data.map((v) => {
    if (v !== null) { last = v; return v; }
    return last;
  });

  return { raw: data, filled };
}

export default function PatientMoodScreen({ navigation, route }: any) {
  const { patientId, patientName } = route.params ?? {};
  const { colors, isDark } = useTheme();

  const [range, setRange] = useState<RangeKey>('30');
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [sessionDays, setSessionDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const days = useMemo(() => getLastNDays(parseInt(range)), [range]);
  const startDate = days[0] + 'T00:00:00.000Z';

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      const [timeline, appts] = await Promise.all([
        moodService.getMoodTimeline(patientId, startDate, undefined, 300),
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
      console.error('Erro ao carregar humor do paciente:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId, startDate]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const avg = entries.reduce((sum, e) => sum + e.value, 0) / entries.length;
    const mostFreq = MOODS.reduce((best, m) => {
      const count = entries.filter((e) => e.mood === m.type).length;
      return count > best.count ? { mood: m, count } : best;
    }, { mood: MOODS[2], count: 0 });
    return { avg: avg.toFixed(1), mostFreq: mostFreq.mood };
  }, [entries]);

  const chartData = useMemo(() => buildChartData(entries, days), [entries, days]);

  const step = parseInt(range) <= 7 ? 1 : parseInt(range) <= 30 ? 7 : 14;
  const chartLabels = days.map((d, i) => {
    if (i % step === 0 || i === days.length - 1) {
      const [, m, day] = d.split('-');
      return `${day}/${m}`;
    }
    return '';
  });

  const s = styles(colors, isDark);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Humor do Paciente</Text>
          {patientName && <Text style={s.headerSub}>{patientName}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Seletor de período */}
        <View style={s.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[s.rangeBtn, range === r.key && s.rangeBtnActive]}
              onPress={() => setRange(r.key)}
            >
              <Text style={[s.rangeBtnText, range === r.key && s.rangeBtnTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Stats rápidos */}
            {stats && (
              <View style={s.statsRow}>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{entries.length}</Text>
                  <Text style={s.statLabel}>Registros</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.avg}/5</Text>
                  <Text style={s.statLabel}>Média</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.mostFreq.emoji}</Text>
                  <Text style={s.statLabel}>{stats.mostFreq.label}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{sessionDays.size}</Text>
                  <Text style={s.statLabel}>Sessões</Text>
                </View>
              </View>
            )}

            {/* Gráfico */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Evolução de Humor</Text>
              {sessionDays.size > 0 && (
                <View style={s.legendRow}>
                  <View style={[s.legendDot, { backgroundColor: '#4A90E2' }]} />
                  <Text style={s.legendText}>Sessão terapêutica</Text>
                </View>
              )}
              {chartData ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{ labels: chartLabels, datasets: [{ data: chartData.filled }] }}
                    width={Math.max(CHART_WIDTH, days.length * 14)}
                    height={180}
                    yAxisSuffix=""
                    yAxisInterval={1}
                    fromZero
                    segments={5}
                    chartConfig={{
                      backgroundColor: isDark ? '#1e1e2e' : '#fff',
                      backgroundGradientFrom: isDark ? '#1e1e2e' : '#fff',
                      backgroundGradientTo: isDark ? '#1e1e2e' : '#fff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                      labelColor: () => colors.textSecondary,
                      propsForDots: { r: '4', strokeWidth: '2', stroke: '#4A90E2' },
                      propsForBackgroundLines: { stroke: isDark ? '#333' : '#eee' },
                    }}
                    bezier
                    style={{ borderRadius: 8 }}
                    renderDotContent={({ x, y, index }) => {
                      const day = days[index];
                      if (!sessionDays.has(day)) return null;
                      return (
                        <View
                          key={`sess-${index}`}
                          style={{
                            position: 'absolute', left: x - 4, top: y + 10,
                            width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A90E2',
                          }}
                        />
                      );
                    }}
                  />
                </ScrollView>
              ) : (
                <View style={s.emptyChart}>
                  <Text style={s.emptyText}>Nenhum registro neste período</Text>
                </View>
              )}
            </View>

            {/* Legenda de emojis */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Legenda</Text>
              <View style={s.emojiLegend}>
                {MOODS.map((m) => (
                  <View key={m.type} style={s.emojiItem}>
                    <Text style={s.emojiIcon}>{m.emoji}</Text>
                    <Text style={[s.emojiLabel, { color: m.color }]}>{m.label} ({m.value})</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Histórico */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Histórico ({entries.length} registros)</Text>
              {entries.length === 0 ? (
                <Text style={s.emptyText}>Nenhum registro neste período</Text>
              ) : (
                [...entries].reverse().map((entry) => {
                  const cfg = moodService.getMoodConfig(entry.mood);
                  const date = new Date(entry.loggedAt);
                  return (
                    <View key={entry._id} style={s.historyItem}>
                      <View style={[s.historyDot, { backgroundColor: cfg.color }]} />
                      <View style={s.historyContent}>
                        <View style={s.historyRow}>
                          <Text style={s.historyEmoji}>{cfg.emoji}</Text>
                          <Text style={[s.historyMood, { color: cfg.color }]}>{cfg.label}</Text>
                          <Text style={s.historyDate}>
                            {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        {entry.note && <Text style={s.historyNote}>{entry.note}</Text>}
                        {sessionDays.has(date.toISOString().split('T')[0]) && (
                          <Text style={s.sessionTag}>📅 Dia de sessão</Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 40 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
    headerSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
    scroll: { padding: 16, gap: 12 },
    center: { paddingVertical: 40, alignItems: 'center' },
    rangeRow: { flexDirection: 'row', gap: 8 },
    rangeBtn: {
      flex: 1, paddingVertical: 8, borderRadius: 8,
      backgroundColor: isDark ? '#2a2a3a' : '#f0f0f0', alignItems: 'center',
    },
    rangeBtnActive: { backgroundColor: colors.primary },
    rangeBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    rangeBtnTextActive: { color: '#fff' },
    statsRow: { flexDirection: 'row', gap: 8 },
    statCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 12,
      alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    card: {
      backgroundColor: colors.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12 },
    legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.textSecondary },
    emptyChart: { paddingVertical: 24, alignItems: 'center' },
    emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
    emojiLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    emojiItem: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '45%' },
    emojiIcon: { fontSize: 18 },
    emojiLabel: { fontSize: 12 },
    historyItem: {
      flexDirection: 'row', alignItems: 'flex-start',
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
    },
    historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    historyContent: { flex: 1 },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    historyEmoji: { fontSize: 16 },
    historyMood: { fontWeight: '600', fontSize: 13 },
    historyDate: { fontSize: 11, color: colors.textSecondary },
    historyNote: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    sessionTag: { fontSize: 11, color: '#4A90E2', marginTop: 2 },
  });
