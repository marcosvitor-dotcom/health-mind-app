import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import * as documentRequestService from '../../services/documentRequestService';
import type {
  DocumentRequestType,
  DocumentRequestStatus,
  DocumentRequestData,
} from '../../services/documentRequestService';

interface RequestDocumentScreenProps {
  navigation: any;
}

export default function RequestDocumentScreen({ navigation }: RequestDocumentScreenProps) {
  const { colors, isDark } = useTheme();

  // Tab state
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  // New request state
  const [selectedType, setSelectedType] = useState<DocumentRequestType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History state
  const [requests, setRequests] = useState<DocumentRequestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const typeEntries = Object.entries(documentRequestService.TYPE_CONFIG) as [
    DocumentRequestType,
    (typeof documentRequestService.TYPE_CONFIG)[DocumentRequestType],
  ][];

  useEffect(() => {
    if (activeTab === 'history') {
      loadRequests();
    }
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const result = await documentRequestService.getMyRequests();
      setRequests(result.requests);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await documentRequestService.getMyRequests();
      setRequests(result.requests);
    } catch {
      // silently fail on refresh
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Atenção', 'Selecione o tipo de documento');
      return;
    }

    Alert.alert(
      'Confirmar Solicitação',
      `Deseja solicitar: ${documentRequestService.TYPE_CONFIG[selectedType].label}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            setSubmitting(true);
            try {
              await documentRequestService.createDocumentRequest(selectedType, description.trim() || undefined);
              Alert.alert('Sucesso', 'Solicitação enviada ao seu psicólogo!');
              setSelectedType(null);
              setDescription('');
              setActiveTab('history');
              loadRequests();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao enviar solicitação');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderStatusBadge = (status: DocumentRequestStatus) => {
    const config = documentRequestService.STATUS_CONFIG[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const renderNewRequest = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Selecione o tipo de documento que deseja solicitar:
      </Text>

      {typeEntries.map(([key, config]) => {
        const isSelected = selectedType === key;
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.typeCard,
              {
                backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedType(isSelected ? null : key)}
            activeOpacity={0.7}
          >
            <View style={[styles.typeIcon, { backgroundColor: isSelected ? colors.primary + '20' : (isDark ? colors.surfaceSecondary : '#F0F4F8') }]}>
              <Ionicons
                name={config.icon as any}
                size={24}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
            </View>
            <View style={styles.typeInfo}>
              <Text style={[styles.typeLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                {config.label}
              </Text>
              <Text style={[styles.typeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {config.description}
              </Text>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}

      {selectedType && (
        <View style={styles.formSection}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Motivo da solicitação (opcional)
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="Descreva o motivo ou informações adicionais..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>
            {description.length}/1000
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitText}>Enviar Solicitação</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Nenhuma solicitação
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Suas solicitações de documentos aparecerão aqui
          </Text>
        </View>
      ) : (
        requests.map((req) => {
          const typeConfig = documentRequestService.TYPE_CONFIG[req.type];
          const isExpanded = expandedId === req._id;

          return (
            <TouchableOpacity
              key={req._id}
              style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setExpandedId(isExpanded ? null : req._id)}
              activeOpacity={0.7}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestLeft}>
                  <Ionicons name={typeConfig?.icon as any || 'document'} size={20} color={colors.primary} />
                  <Text style={[styles.requestType, { color: colors.textPrimary }]}>
                    {typeConfig?.label || req.type}
                  </Text>
                </View>
                {renderStatusBadge(req.status)}
              </View>

              <Text style={[styles.requestDate, { color: colors.textTertiary }]}>
                Solicitado em {formatDate(req.createdAt)}
              </Text>

              {isExpanded && (
                <View style={[styles.requestDetails, { borderTopColor: colors.border }]}>
                  {req.description ? (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Motivo:</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{req.description}</Text>
                    </View>
                  ) : null}
                  {req.responseNote ? (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Resposta do psicólogo:</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{req.responseNote}</Text>
                    </View>
                  ) : null}
                  {req.completedAt ? (
                    <Text style={[styles.completedDate, { color: colors.textTertiary }]}>
                      Concluído em {formatDate(req.completedAt)}
                    </Text>
                  ) : null}
                </View>
              )}

              <View style={styles.expandHint}>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </TouchableOpacity>
          );
        })
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Solicitar Documento</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={activeTab === 'new' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? colors.primary : colors.textTertiary }]}>
            Nova Solicitação
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === 'history' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.primary : colors.textTertiary }]}>
            Minhas Solicitações
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'new' ? renderNewRequest() : renderHistory()}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  formSection: {
    marginTop: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // History
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  requestType: {
    fontSize: 15,
    fontWeight: '600',
  },
  requestDate: {
    fontSize: 12,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  completedDate: {
    fontSize: 12,
    marginTop: 4,
  },
  expandHint: {
    alignItems: 'center',
    marginTop: 4,
  },
});
