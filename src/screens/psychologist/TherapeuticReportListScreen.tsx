import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useTheme } from '../../contexts/ThemeContext';
import {
  generateTherapeuticReport,
  getTherapeuticReports,
  TherapeuticReportListItem,
} from '../../services/reportService';

export default function TherapeuticReportListScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;
  const { colors, isDark } = useTheme();

  const [reports, setReports] = useState<TherapeuticReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const data = await getTherapeuticReports(patientId);
      setReports(data.reports || []);
    } catch (error: any) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports();
  }, [loadReports]);

  const handleGenerateReport = async () => {
    Alert.alert(
      'Gerar Relatório',
      `Deseja gerar um relatório terapêutico com base nas conversas recentes de ${patientName}?\n\nIsso pode levar alguns instantes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar',
          onPress: async () => {
            setGenerating(true);
            try {
              const report = await generateTherapeuticReport(patientId);
              setGenerating(false);
              Alert.alert('Sucesso', 'Relatório gerado com sucesso!');
              // Navegar para o detalhe do relatório recém-gerado
              navigation.navigate('TherapeuticReportDetail', {
                reportId: report._id,
                patientName,
              });
              // Recarregar lista
              loadReports();
            } catch (error: any) {
              setGenerating(false);
              Alert.alert(
                'Erro',
                error.message || 'Não foi possível gerar o relatório'
              );
            }
          },
        },
      ]
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: '#50C878', label: 'Concluído', icon: 'checkmark-circle' as const };
      case 'generating':
        return { color: '#FF9800', label: 'Gerando...', icon: 'time' as const };
      case 'failed':
        return { color: '#E74C3C', label: 'Falhou', icon: 'close-circle' as const };
      default:
        return { color: '#999', label: status, icon: 'help-circle' as const };
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Início';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Relatórios Terapêuticos</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patientName}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Relatórios Terapêuticos</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patientName}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Botão Gerar Relatório */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateReport}
          disabled={generating}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
          <Text style={styles.generateButtonText}>
            Gerar Novo Relatório com IA
          </Text>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
          <Ionicons name="information-circle" size={20} color="#4A90E2" />
          <Text style={[styles.infoText, { color: isDark ? colors.textSecondary : '#4A90E2' }]}>
            Cada relatório analisa apenas as conversas desde o último relatório gerado,
            garantindo que não haja duplicação de análises.
          </Text>
        </View>

        {/* Lista de Relatórios */}
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>Nenhum relatório gerado</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              Gere o primeiro relatório terapêutico para ter um resumo das conversas
              do paciente com a IA.
            </Text>
          </View>
        ) : (
          reports.map((report) => {
            const status = getStatusConfig(report.status);
            return (
              <TouchableOpacity
                key={report._id}
                onPress={() => {
                  if (report.status === 'completed') {
                    navigation.navigate('TherapeuticReportDetail', {
                      reportId: report._id,
                      patientName,
                    });
                  }
                }}
                disabled={report.status !== 'completed'}
              >
                <Card>
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportIconContainer, { backgroundColor: isDark ? '#2D1F3D' : '#F3E5F5' }]}>
                      <Ionicons name="document-text" size={24} color="#9C27B0" />
                    </View>
                    <View style={styles.reportInfo}>
                      <View style={styles.reportTitleRow}>
                        <Text style={[styles.reportPeriod, { color: colors.textPrimary }]}>
                          {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: status.color + '20' },
                          ]}
                        >
                          <Ionicons
                            name={status.icon}
                            size={12}
                            color={status.color}
                          />
                          <Text style={[styles.statusText, { color: status.color }]}>
                            {status.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.reportDate, { color: colors.textTertiary }]}>
                        Gerado em {formatFullDate(report.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reportMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="chatbubbles-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {report.messagesAnalyzed} mensagens analisadas
                      </Text>
                    </View>
                  </View>

                  {report.summary ? (
                    <Text style={[styles.reportSummary, { color: colors.textPrimary }]} numberOfLines={3}>
                      {report.summary}
                    </Text>
                  ) : null}

                  {report.status === 'completed' && (
                    <View style={[styles.viewAction, { borderTopColor: colors.borderLight }]}>
                      <Text style={styles.viewActionText}>Ver relatório completo</Text>
                      <Ionicons name="chevron-forward" size={16} color="#4A90E2" />
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal de Geração */}
      <Modal visible={generating} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color="#9C27B0" />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Gerando Relatório</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Analisando conversas com IA...{'\n'}Isso pode levar alguns instantes.
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reportIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportPeriod: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  reportDate: {
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  reportSummary: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  viewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  viewActionText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
