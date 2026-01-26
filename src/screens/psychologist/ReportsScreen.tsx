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
import * as psychologistService from '../../services/psychologistService';

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

export default function ReportsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');

  useEffect(() => {
    loadFinancialData();
  }, []);

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
    await loadFinancialData();
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando relatórios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatórios Financeiros</Text>
        {user?.clinicId && (
          <View style={styles.clinicBadge}>
            <Ionicons name="business" size={14} color="#50C878" />
            <Text style={styles.clinicBadgeText}>Vinculado</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text
              style={[
                styles.periodButtonText,
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
                <Text style={styles.revenueLabel}>
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
                <Text style={styles.revenueLabel}>A Receber</Text>
                <Text style={[styles.revenueValue, { color: '#FF9800' }]}>
                  {formatCurrency(financialData?.pendingRevenue || 0)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Sessions Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.cardTitle}>Estatísticas de Sessões</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#E8F4FD' }]}>
                <Ionicons name="checkmark-circle" size={28} color="#4A90E2" />
              </View>
              <Text style={styles.statNumber}>{financialData?.completedSessions || 0}</Text>
              <Text style={styles.statLabel}>Concluídas</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FFF4E6' }]}>
                <Ionicons name="hourglass-outline" size={28} color="#FF9800" />
              </View>
              <Text style={styles.statNumber}>{financialData?.pendingSessions || 0}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="close-circle" size={28} color="#E74C3C" />
              </View>
              <Text style={styles.statNumber}>{financialData?.cancelledSessions || 0}</Text>
              <Text style={styles.statLabel}>Canceladas</Text>
            </View>
          </View>

          <View style={styles.averageSection}>
            <Ionicons name="calculator-outline" size={20} color="#666" />
            <Text style={styles.averageText}>
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
            <Text style={styles.cardTitle}>Principais Pacientes</Text>
            {financialData.topPatients.slice(0, 5).map((patient, index) => (
              <View key={index} style={styles.patientItem}>
                <View style={styles.patientRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientSessions}>{patient.sessionsCount} sessões</Text>
                </View>
                <Text style={styles.patientValue}>{formatCurrency(patient.totalPaid)}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#4A90E2" />
            <Text style={styles.infoTitle}>Sobre os Relatórios</Text>
          </View>
          <Text style={styles.infoText}>
            {user?.clinicId
              ? 'Como você está vinculado a uma clínica, os valores podem incluir taxas ou comissões. Verifique com a administração da clínica para mais detalhes.'
              : 'Estes são seus relatórios financeiros individuais. Os valores mostram suas receitas de sessões com pacientes.'}
          </Text>
        </Card>

        {/* Export Options */}
        <Card style={styles.exportCard}>
          <Text style={styles.cardTitle}>Exportar Relatório</Text>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="document-text-outline" size={20} color="#4A90E2" />
            <Text style={styles.exportButtonText}>Exportar como PDF</Text>
            <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download-outline" size={20} color="#50C878" />
            <Text style={styles.exportButtonText}>Exportar como Excel</Text>
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  clinicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FFF0',
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
    backgroundColor: '#fff',
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
    color: '#666',
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
    color: '#666',
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
    color: '#333',
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
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  averageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  averageText: {
    fontSize: 14,
    color: '#666',
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
    borderBottomColor: '#f0f0f0',
  },
  patientRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F4FD',
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
    color: '#333',
    marginBottom: 2,
  },
  patientSessions: {
    fontSize: 12,
    color: '#666',
  },
  patientValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#50C878',
  },
  infoCard: {
    backgroundColor: '#E8F4FD',
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
    color: '#333',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  exportCard: {
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  exportButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
});
