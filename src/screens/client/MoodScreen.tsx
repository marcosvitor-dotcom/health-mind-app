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
const CHART_WIDTH = SCREEN_WIDTH - 32;
const MOOD_LABELS: Record<string, string> = {
  euforico: 'Eufórico', feliz: 'Feliz', normal: 'Normal',
  ansioso: 'Ansioso', triste: 'Triste', raiva: 'Raiva',
};

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

function buildChartData(entries: MoodEntry[], days: string[]) {
  // Para cada dia, pega o último registro
  const map: Record<string, number> = {};
  entries.forEach((e) => {
    const day = new Date(e.loggedAt).toISOString().split('T')[0];
    map[day] = e.value;
  });

  const data: (number | null)[] = days.map((d) => (map[d] !== undefined ? map[d] : null));

  // react-native-chart-kit não aceita null — substitui por NaN que será ignorado
  // Mas precisa de pelo menos um valor numérico para renderizar
  const hasData = data.some((v) => v !== null);
  if (!hasData) return null;

  // Preenche nulls com o valor anterior (forward-fill) para linha contínua,
  // mantendo o dado real para exibição
  let last = 3;
  const filled = data.map((v) => {
    if (v !== null) { last = v; return v; }
    return last;
  });

  return { raw: data, filled };
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

  const days30 = useMemo(() => getLastNDays(30), []);
  const startDate = days30[0] + 'T00:00:00.000Z';

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      const [timeline, appts] = await Promise.all([
        moodService.getMoodTimeline(patientId, startDate, undefined, 200),
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
        text: 'Remover',
        style: 'destructive',
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

  // ── Chart ────────────────────────────────────────────────────────────────

  const chartData = useMemo(() => buildChartData(entries, days30), [entries, days30]);

  // Labels a cada 7 dias
  const chartLabels = days30.map((d, i) => {
    if (i % 7 === 0 || i === days30.length - 1) {
      const [, m, day] = d.split('-');
      return `${day}/${m}`;
    }
    return '';
  });

  // ── Render ───────────────────────────────────────────────────────────────

  const s = styles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Meu Humor</Text>
          <NotificationBell navigation={navigation} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Meu Humor</Text>
        <NotificationBell navigation={navigation} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* ── Seletor de humor ── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Como você está agora?</Text>
          <View style={s.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.type}
                style={[s.moodBtn, selectedMood === m.type && { borderColor: m.color, borderWidth: 2 }]}
                onPress={() => setSelectedMood(m.type)}
              >
                <Text style={s.moodEmoji}>{m.emoji}</Text>
                <Text style={[s.moodLabel, selectedMood === m.type && { color: m.color, fontWeight: '600' }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedMood && (
            <>
              <TextInput
                style={s.noteInput}
                placeholder="Adicionar nota (opcional)..."
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[s.logBtn, saving && s.logBtnDisabled]}
                onPress={handleLog}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.logBtnText}>Registrar</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Gráfico ── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Evolução dos últimos 30 dias</Text>

          {/* Legenda de sessão */}
          {sessionDays.size > 0 && (
            <View style={s.legendRow}>
              <View style={[s.legendDot, { backgroundColor: '#4A90E2' }]} />
              <Text style={s.legendText}>Dia de sessão terapêutica</Text>
            </View>
          )}

          {chartData ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <LineChart
                  data={{
                    labels: chartLabels,
                    datasets: [{ data: chartData.filled }],
                  }}
                  width={Math.max(CHART_WIDTH, days30.length * 14)}
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
                    color: (opacity = 1) => `rgba(80, 200, 120, ${opacity})`,
                    labelColor: () => colors.textSecondary,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#50C878' },
                    propsForBackgroundLines: { stroke: isDark ? '#333' : '#eee' },
                  }}
                  bezier
                  style={{ borderRadius: 8 }}
                  renderDotContent={({ x, y, index }) => {
                    const day = days30[index];
                    if (!sessionDays.has(day)) return null;
                    return (
                      <View
                        key={`sess-${index}`}
                        style={{
                          position: 'absolute',
                          left: x - 4,
                          top: y + 10,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#4A90E2',
                        }}
                      />
                    );
                  }}
                />
                {/* Y axis labels */}
                <View style={s.yLabels}>
                  {[5, 4, 3, 2, 1, 0].map((v) => {
                    const m = MOODS.find((m) => m.value === v);
                    return (
                      <Text key={v} style={[s.yLabel, { color: m?.color }]}>
                        {m?.emoji}
                      </Text>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          ) : (
            <View style={s.emptyChart}>
              <Text style={s.emptyText}>Nenhum registro nos últimos 30 dias</Text>
            </View>
          )}
        </View>

        {/* ── Histórico ── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Histórico</Text>
          {entries.length === 0 ? (
            <Text style={s.emptyText}>Nenhum registro ainda. Comece registrando como você está!</Text>
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
                  <TouchableOpacity onPress={() => handleDelete(entry)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
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

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, gap: 16 },
    card: {
      backgroundColor: colors.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
    moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
    moodBtn: {
      alignItems: 'center', padding: 10, borderRadius: 12,
      backgroundColor: isDark ? '#2a2a3a' : '#f5f5f5',
      borderWidth: 2, borderColor: 'transparent', width: '30%',
    },
    moodEmoji: { fontSize: 28 },
    moodLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    noteInput: {
      marginTop: 12, borderWidth: 1, borderColor: colors.border,
      borderRadius: 8, padding: 10, color: colors.text,
      backgroundColor: isDark ? '#2a2a3a' : '#fafafa', minHeight: 60,
    },
    logBtn: {
      marginTop: 10, backgroundColor: '#50C878', borderRadius: 8,
      paddingVertical: 12, alignItems: 'center',
    },
    logBtnDisabled: { opacity: 0.6 },
    logBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.textSecondary },
    emptyChart: { paddingVertical: 24, alignItems: 'center' },
    emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
    yLabels: {
      position: 'absolute', right: 4, top: 16,
      justifyContent: 'space-between', height: 148,
    },
    yLabel: { fontSize: 12 },
    historyItem: {
      flexDirection: 'row', alignItems: 'flex-start',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
      gap: 8,
    },
    historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    historyContent: { flex: 1 },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    historyEmoji: { fontSize: 18 },
    historyMood: { fontWeight: '600', fontSize: 14 },
    historyDate: { fontSize: 12, color: colors.textSecondary },
    historyNote: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    sessionTag: { fontSize: 11, color: '#4A90E2', marginTop: 2 },
    deleteBtn: { padding: 4 },
  });
