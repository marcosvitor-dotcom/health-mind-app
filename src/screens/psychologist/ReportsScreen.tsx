import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as psychologistService from '../../services/psychologistService';
import * as subleaseService from '../../services/subleaseService';
import NotificationBell from '../../components/NotificationBell';
import { SubleaseSummary, RoomSublease } from '../../services/subleaseService';

interface FinancialData {
  monthRevenue: number;
  yearRevenue: number;
  pendingRevenue: number;
  completedSessions: number;
  pendingSessions: number;
  cancelledSessions: number;
  averageSessionValue: number;
  topPatients: Array<{
    name: string;
    totalPaid: number;
    sessionsCount: number;
  }>;
}

export default function ReportsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');
  const [patients, setPatients] = useState<psychologistService.Patient[]>([]);
  const [subleaseSummary, setSubleaseSummary] = useState<SubleaseSummary | null>(null);
  const [recentSubleases, setRecentSubleases] = useState<RoomSublease[]>([]);

  useEffect(() => {
    loadFinancialData();
    loadPatients();
    loadSubleaseData();
  }, []);

  const loadPatients = async () => {
    try {
      const psychologistId = user?._id || user?.id;
      if (!psychologistId) return;
      const data = await psychologistService.getMyPatients(psychologistId);
      setPatients(data);
    } catch (error) {
      console.log('Erro ao carregar pacientes para relatórios:', error);
    }
  };

  const loadSubleaseData = async () => {
    try {
      const psychologistId = user?._id || user?.id;
      if (!psychologistId || !user?.clinicId) return;

      try {
        const summary = await subleaseService.getPsychologistSubleaseSummary(psychologistId);
        setSubleaseSummary(summary);
      } catch (summaryErr) {
        console.log('Erro ao carregar resumo de sublocações:', summaryErr);
      }

      try {
        const subleasesResponse = await subleaseService.getSubleases(1, 5);
        setRecentSubleases(subleasesResponse.subleases || []);
      } catch (subleasesErr) {
        console.log('Erro ao carregar sublocações recentes:', subleasesErr);
      }
    } catch (error) {
      console.log('Erro ao carregar dados de sublocações:', error);
    }
  };

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      const psychologistId = user?._id || user?.id;
      if (!psychologistId) {
        setLoading(false);
        return;
      }

      // Buscar dados financeiros
      let paymentData: any = {};
      try {
        const paymentResponse = await psychologistService.api.get(`/payments/summary/psychologist/${psychologistId}`);
        paymentData = paymentResponse.data?.data || {};
      } catch (paymentErr) {
        console.log('Dados financeiros não disponíveis:', paymentErr);
      }

      // Buscar agendamentos
      const appointments = await psychologistService.getMyAppointments(psychologistId);

      const completedSessions = appointments.filter((apt) => apt.status === 'completed').length;
      const pendingSessions = appointments.filter((apt) =>
        ['scheduled', 'confirmed'].includes(apt.status)
      ).length;
      const cancelledSessions = appointments.filter((apt) => apt.status === 'cancelled').length;

      const monthRevenue = paymentData.monthRevenue || paymentData.totalReceived || 0;
      const yearRevenue = paymentData.yearRevenue || monthRevenue * 12;
      const pendingRevenue = paymentData.totalPending || paymentData.pendingRevenue || 0;
      const averageSessionValue = completedSessions > 0 ? monthRevenue / completedSessions : 0;

      // Top pacientes (mock - pode ser implementado no backend)
      const topPatients = paymentData.topPatients || [];

      setFinancialData({
        monthRevenue,
        yearRevenue,
        pendingRevenue,
        completedSessions,
        pendingSessions,
        cancelledSessions,
        averageSessionValue,
        topPatients,
      });
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      // Dados padrão em caso de erro
      setFinancialData({
        monthRevenue: 0,
        yearRevenue: 0,
        pendingRevenue: 0,
        completedSessions: 0,
        pendingSessions: 0,
        cancelledSessions: 0,
        averageSessionValue: 0,
        topPatients: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFinancialData(), loadSubleaseData()]);
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando relatórios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Relatórios Financeiros</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {user?.clinicId && (
            <View style={[styles.clinicBadge, { backgroundColor: isDark ? '#1F3D1F' : '#E8FFF0' }]}>
              <Ionicons name="business" size={14} color="#50C878" />
              <Text style={styles.clinicBadgeText}>Vinculado</Text>
            </View>
          )}
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Selector */}
        <View style={[styles.periodSelector, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text
              style={[
                styles.periodButtonText,
                { color: colors.textSecondary },
                selectedPeriod === 'month' && styles.periodButtonTextActive,
              ]}
            >
              Mês Atual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text
              style={[
                styles.periodButtonText,
                { color: colors.textSecondary },
                selectedPeriod === 'year' && styles.periodButtonTextActive,
              ]}
            >
              Ano Atual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Revenue Cards */}
        <View style={styles.revenueSection}>
          <Card style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Ionicons name="trending-up" size={32} color="#50C878" />
              <View style={styles.revenueInfo}>
                <Text style={[styles.revenueLabel, { color: colors.textSecondary }]}>
                  {selectedPeriod === 'month' ? 'Recebido (Mês)' : 'Recebido (Ano)'}
                </Text>
                <Text style={styles.revenueValue}>
                  {formatCurrency(
                    selectedPeriod === 'month'
                      ? financialData?.monthRevenue || 0
                      : financialData?.yearRevenue || 0
                  )}
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Ionicons name="time-outline" size={32} color="#FF9800" />
              <View style={styles.revenueInfo}>
                <Text style={[styles.revenueLabel, { color: colors.textSecondary }]}>A Receber</Text>
                <Text style={[styles.revenueValue, { color: '#FF9800' }]}>
                  {formatCurrency(financialData?.pendingRevenue || 0)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Sessions Stats */}
        <Card style={styles.statsCard}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Estatísticas de Sessões</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
                <Ionicons name="checkmark-circle" size={28} color="#4A90E2" />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{financialData?.completedSessions || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Concluídas</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? '#3D3020' : '#FFF4E6' }]}>
                <Ionicons name="hourglass-outline" size={28} color="#FF9800" />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{financialData?.pendingSessions || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendentes</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? '#3D1F1F' : '#FFEBEE' }]}>
                <Ionicons name="close-circle" size={28} color="#E74C3C" />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{financialData?.cancelledSessions || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Canceladas</Text>
            </View>
          </View>

          <View style={[styles.averageSection, { borderTopColor: colors.borderLight }]}>
            <Ionicons name="calculator-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.averageText, { color: colors.textSecondary }]}>
              Valor médio por sessão:{' '}
              <Text style={styles.averageValue}>
                {formatCurrency(financialData?.averageSessionValue || 0)}
              </Text>
            </Text>
          </View>
        </Card>

        {/* Top Patients */}
        {financialData?.topPatients && financialData.topPatients.length > 0 && (
          <Card style={styles.topPatientsCard}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Principais Pacientes</Text>
            {financialData.topPatients.slice(0, 5).map((patient, index) => (
              <View key={index} style={[styles.patientItem, { borderBottomColor: colors.borderLight }]}>
                <View style={[styles.patientRank, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={[styles.patientName, { color: colors.textPrimary }]}>{patient.name}</Text>
                  <Text style={[styles.patientSessions, { color: colors.textSecondary }]}>{patient.sessionsCount} sessões</Text>
                </View>
                <Text style={styles.patientValue}>{formatCurrency(patient.totalPaid)}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Info Card */}
        <Card style={[styles.infoCard, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#4A90E2" />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Sobre os Relatórios</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {user?.clinicId
              ? 'Como você está vinculado a uma clínica, os valores podem incluir taxas ou comissões. Verifique com a administração da clínica para mais detalhes.'
              : 'Estes são seus relatórios financeiros individuais. Os valores mostram suas receitas de sessões com pacientes.'}
          </Text>
        </Card>

        {/* Sublease Section */}
        {user?.clinicId && (
          <Card style={styles.subleaseCard}>
            <View style={styles.subleaseTitleRow}>
              <Ionicons name="key-outline" size={22} color="#4A90E2" />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sublocacoes do Mes</Text>
            </View>

            <View style={styles.subleaseSummaryRow}>
              <View style={styles.subleaseSummaryItem}>
                <Text style={[styles.subleaseSummaryLabel, { color: colors.textSecondary }]}>Pendente</Text>
                <Text style={[styles.subleaseSummaryValue, { color: '#E8A317' }]}>
                  {formatCurrency(subleaseSummary?.pendingValue || 0)}
                </Text>
              </View>
              <View style={styles.subleaseSummaryItem}>
                <Text style={[styles.subleaseSummaryLabel, { color: colors.textSecondary }]}>Pago</Text>
                <Text style={[styles.subleaseSummaryValue, { color: '#50C878' }]}>
                  {formatCurrency(subleaseSummary?.paidValue || 0)}
                </Text>
              </View>
            </View>

            {recentSubleases.length > 0 ? (
              recentSubleases.map((sublease) => (
                <View key={sublease._id} style={[styles.subleaseItem, { borderTopColor: colors.borderLight }]}>
                  <View style={styles.subleaseItemInfo}>
                    <Text style={[styles.subleaseRoomName, { color: colors.textPrimary }]}>
                      {typeof sublease.roomId === 'object' ? sublease.roomId.name : 'Sala'}
                    </Text>
                    <Text style={[styles.subleaseDate, { color: colors.textSecondary }]}>
                      {new Date(sublease.appointmentDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[styles.subleaseValue, { color: colors.textPrimary }]}>
                    {formatCurrency(sublease.value)}
                  </Text>
                  <View
                    style={[
                      styles.subleaseStatusBadge,
                      {
                        backgroundColor: sublease.status === 'paid'
                          ? (isDark ? '#1F3D1F' : '#E8FFF0')
                          : (isDark ? '#3D3020' : '#FFF8E1'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subleaseStatusText,
                        {
                          color: sublease.status === 'paid' ? '#50C878' : '#E8A317',
                        },
                      ]}
                    >
                      {sublease.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.subleaseEmpty, { color: colors.textTertiary }]}>Nenhuma sublocacao este mes</Text>
            )}
          </Card>
        )}

        {/* Relatórios Terapêuticos */}
        <Card style={styles.therapeuticCard}>
          <View style={styles.therapeuticHeader}>
            <View style={styles.therapeuticTitleRow}>
              <Ionicons name="sparkles" size={22} color="#9C27B0" />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Relatórios Terapêuticos</Text>
            </View>
            <Text style={[styles.therapeuticSubtitle, { color: colors.textSecondary }]}>
              Gere relatórios com IA a partir das conversas dos pacientes
            </Text>
          </View>
          {patients.length > 0 ? (
            patients.map((patient) => (
              <TouchableOpacity
                key={patient._id || patient.id}
                style={[styles.therapeuticPatientItem, { borderTopColor: colors.borderLight }]}
                onPress={() =>
                  navigation.navigate('TherapeuticReportList', {
                    patientId: patient._id || patient.id,
                    patientName: patient.name,
                  })
                }
              >
                <View style={[styles.therapeuticPatientAvatar, { backgroundColor: isDark ? '#2D1F3D' : '#F3E5F5' }]}>
                  <Text style={styles.therapeuticPatientInitials}>
                    {patient.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
                <Text style={[styles.therapeuticPatientName, { color: colors.textPrimary }]}>{patient.name}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9C27B0" />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.therapeuticEmpty, { color: colors.textTertiary }]}>Nenhum paciente cadastrado</Text>
          )}
        </Card>

        {/* Export Options */}
        <Card style={styles.exportCard}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Exportar Relatório</Text>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="document-text-outline" size={20} color="#4A90E2" />
            <Text style={[styles.exportButtonText, { color: colors.textPrimary }]}>Exportar como PDF</Text>
            <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="download-outline" size={20} color="#50C878" />
            <Text style={[styles.exportButtonText, { color: colors.textPrimary }]}>Exportar como Excel</Text>
            <Ionicons name="chevron-forward" size={20} color="#50C878" />
          </TouchableOpacity>
        </Card>
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
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  clinicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clinicBadgeText: {
    fontSize: 11,
    color: '#50C878',
    marginLeft: 4,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#4A90E2',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  revenueSection: {
    marginBottom: 16,
  },
  revenueCard: {
    marginBottom: 12,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueInfo: {
    marginLeft: 16,
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#50C878',
  },
  statsCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  averageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  averageText: {
    fontSize: 14,
    marginLeft: 8,
  },
  averageValue: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  topPatientsCard: {
    marginBottom: 16,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  patientRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  patientSessions: {
    fontSize: 12,
  },
  patientValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#50C878',
  },
  infoCard: {
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  therapeuticCard: {
    marginBottom: 16,
  },
  therapeuticHeader: {
    marginBottom: 12,
  },
  therapeuticTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  therapeuticSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  therapeuticPatientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  therapeuticPatientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  therapeuticPatientInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
  therapeuticPatientName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  therapeuticEmpty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  exportCard: {
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  exportButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  subleaseCard: {
    marginBottom: 16,
  },
  subleaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  subleaseSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    marginTop: 8,
  },
  subleaseSummaryItem: {
    alignItems: 'center',
  },
  subleaseSummaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  subleaseSummaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subleaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  subleaseItemInfo: {
    flex: 1,
  },
  subleaseRoomName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subleaseDate: {
    fontSize: 12,
  },
  subleaseValue: {
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 10,
  },
  subleaseStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subleaseStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subleaseEmpty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
