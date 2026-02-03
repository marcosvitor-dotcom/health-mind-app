import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTherapeuticReport, TherapeuticReport } from '../../services/reportService';

interface SectionConfig {
  key: keyof TherapeuticReport['sections'];
  title: string;
  icon: string;
  bgColor: string;
  iconColor: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'temasAbordados',
    title: 'Temas Abordados',
    icon: 'chatbubbles',
    bgColor: '#E8F4FD',
    iconColor: '#4A90E2',
  },
  {
    key: 'sentimentosIdentificados',
    title: 'Sentimentos Identificados',
    icon: 'heart',
    bgColor: '#FCE4EC',
    iconColor: '#E91E63',
  },
  {
    key: 'padroesComportamentais',
    title: 'Padrões Comportamentais',
    icon: 'repeat',
    bgColor: '#FFF4E6',
    iconColor: '#FF9800',
  },
  {
    key: 'pontosDeAtencao',
    title: 'Pontos de Atenção',
    icon: 'warning',
    bgColor: '#FFEBEE',
    iconColor: '#E74C3C',
  },
  {
    key: 'evolucaoObservada',
    title: 'Evolução Observada',
    icon: 'trending-up',
    bgColor: '#E8FFF0',
    iconColor: '#50C878',
  },
  {
    key: 'sugestoesParaSessao',
    title: 'Sugestões para Sessão',
    icon: 'bulb',
    bgColor: '#F3E5F5',
    iconColor: '#9C27B0',
  },
];

export default function TherapeuticReportDetailScreen({ route, navigation }: any) {
  const { reportId, patientName } = route.params;

  const [report, setReport] = useState<TherapeuticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTherapeuticReport(reportId);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Início dos registros';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Relatório Terapêutico</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Relatório Terapêutico</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error || 'Relatório não encontrado'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReport}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Relatório Terapêutico</Text>
          <Text style={styles.headerSubtitle}>{patientName}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Período e Metadados */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={18} color="#9C27B0" />
            <Text style={styles.metaLabel}>Período:</Text>
            <Text style={styles.metaValue}>
              {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="chatbubbles-outline" size={18} color="#9C27B0" />
            <Text style={styles.metaLabel}>Mensagens analisadas:</Text>
            <Text style={styles.metaValue}>{report.messagesAnalyzed}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={18} color="#9C27B0" />
            <Text style={styles.metaLabel}>Gerado em:</Text>
            <Text style={styles.metaValue}>
              {new Date(report.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Resumo */}
        {report.summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="sparkles" size={20} color="#9C27B0" />
              <Text style={styles.summaryTitle}>Resumo Geral</Text>
            </View>
            <Text style={styles.summaryText}>{report.summary}</Text>
          </View>
        ) : null}

        {/* Seções do Relatório */}
        {SECTIONS.map((section) => {
          const content = report.sections?.[section.key];
          if (!content) return null;

          return (
            <View key={section.key} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIconContainer,
                    { backgroundColor: section.bgColor },
                  ]}
                >
                  <Ionicons
                    name={section.icon as any}
                    size={22}
                    color={section.iconColor}
                  />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionContent}>{content}</Text>
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color="#999" />
          <Text style={styles.footerText}>
            Este relatório foi gerado por IA e criptografado. Ele não contém
            citações diretas das conversas do paciente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9C27B0',
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    lineHeight: 17,
  },
});
