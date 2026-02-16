import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import * as medicalRecordService from '../../services/medicalRecordService';
import * as DocumentPicker from 'expo-document-picker';
import Card from '../../components/Card';

export default function MedicalRecordScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { patient } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<medicalRecordService.MedicalRecord[]>([]);
  const [stats, setStats] = useState<medicalRecordService.MedicalRecordStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<medicalRecordService.MedicalRecordCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newRecord, setNewRecord] = useState<{
    category: medicalRecordService.MedicalRecordCategory;
    title: string;
    description: string;
    content: string;
    file: any;
  }>({
    category: 'session_report',
    title: '',
    description: '',
    content: '',
    file: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [selectedCategory]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const filters = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const data = await medicalRecordService.getPatientMedicalRecords(patient._id || patient.id, filters);
      setRecords(data.records);
      setStats(data.stats);
    } catch (error: any) {
      console.error('Erro ao carregar prontuário:', error);
      Alert.alert('Erro', error.message || 'Não foi possível carregar o prontuário');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets[0]) {
        const file = result.assets[0];

        // Validar tamanho (10MB)
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('Erro', 'O arquivo deve ter no máximo 10MB');
          return;
        }

        setNewRecord({ ...newRecord, file });
      }
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo');
    }
  };

  const handleSaveRecord = async () => {
    if (!newRecord.title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título do registro');
      return;
    }

    if (!newRecord.content.trim() && !newRecord.file) {
      Alert.alert('Erro', 'Por favor, adicione um conteúdo ou anexe um arquivo');
      return;
    }

    setSaving(true);
    try {
      let fileData = undefined;
      let fileName = undefined;
      let fileType = undefined;

      // Converter arquivo para base64 se foi selecionado
      if (newRecord.file) {
        const response = await fetch(newRecord.file.uri);
        const blob = await response.blob();
        fileData = await blobToBase64(blob);
        fileName = newRecord.file.name;
        fileType = medicalRecordService.getFileType(fileName);
      }

      await medicalRecordService.createMedicalRecord({
        patientId: patient._id || patient.id,
        category: newRecord.category,
        title: newRecord.title.trim(),
        description: newRecord.description.trim() || undefined,
        content: newRecord.content.trim() || undefined,
        fileName,
        fileType,
        fileData,
      });

      Alert.alert('Sucesso', 'Registro adicionado ao prontuário com sucesso!');
      setShowAddModal(false);
      setNewRecord({
        category: 'session_report',
        title: '',
        description: '',
        content: '',
        file: null,
      });
      loadRecords();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar o registro');
    } finally {
      setSaving(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleViewRecord = (record: medicalRecordService.MedicalRecord) => {
    // Navegar para tela de detalhes
    // TODO: Criar tela de detalhes do registro
    Alert.alert('Visualizar Registro', record.title);
  };

  const categories: { value: medicalRecordService.MedicalRecordCategory | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'Todos', icon: 'apps' },
    { value: 'anamnesis', label: 'Anamnese', icon: 'clipboard' },
    { value: 'session_report', label: 'Relatos', icon: 'document-text' },
    { value: 'declaration', label: 'Declarações', icon: 'document' },
    { value: 'report', label: 'Relatórios', icon: 'stats-chart' },
    { value: 'evaluation', label: 'Laudos', icon: 'ribbon' },
    { value: 'prescription', label: 'Prescrições', icon: 'medical' },
    { value: 'other', label: 'Outros', icon: 'folder' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando prontuário...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Prontuário</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patient.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Estatísticas */}
      {stats && (
        <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total de Registros</Text>
          </View>
        </View>
      )}

      {/* Filtro de categorias */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        <View style={styles.categoriesContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surface },
                selectedCategory === cat.value && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.value ? '#fff' : '#4A90E2'}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.value && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
              {stats && stats.byCategory[cat.value as medicalRecordService.MedicalRecordCategory] ? (
                <View style={[styles.categoryBadge, selectedCategory === cat.value && { backgroundColor: '#fff' }]}>
                  <Text style={[styles.categoryBadgeText, selectedCategory === cat.value && { color: '#4A90E2' }]}>
                    {stats.byCategory[cat.value as medicalRecordService.MedicalRecordCategory]}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Lista de registros */}
      <ScrollView
        style={styles.recordsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum registro encontrado
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Adicionar Registro</Text>
            </TouchableOpacity>
          </View>
        ) : (
          records.map((record) => (
            <Card key={record._id} style={styles.recordCard}>
              <TouchableOpacity onPress={() => handleViewRecord(record)}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordIcon}>
                    <Ionicons
                      name={medicalRecordService.getCategoryIcon(record.category) as any}
                      size={24}
                      color="#4A90E2"
                    />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={[styles.recordTitle, { color: colors.textPrimary }]}>
                      {record.title}
                    </Text>
                    <Text style={[styles.recordCategory, { color: colors.textSecondary }]}>
                      {medicalRecordService.getCategoryLabel(record.category)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </View>

                {record.description && (
                  <Text
                    style={[styles.recordDescription, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {record.description}
                  </Text>
                )}

                <View style={styles.recordFooter}>
                  <Text style={[styles.recordDate, { color: colors.textTertiary }]}>
                    {new Date(record.date).toLocaleDateString('pt-BR')}
                  </Text>
                  {record.hasFile && (
                    <View style={styles.recordFileIndicator}>
                      <Ionicons name="attach" size={14} color={colors.textTertiary} />
                      <Text style={[styles.recordFileText, { color: colors.textTertiary }]}>
                        Anexo
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Modal Adicionar Registro */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Novo Registro</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.textPrimary }]}>Categoria</Text>
              <View style={styles.categorySelector}>
                {categories.filter(c => c.value !== 'all').map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categorySelectorButton,
                      { backgroundColor: colors.background },
                      newRecord.category === cat.value && styles.categorySelectorButtonActive,
                    ]}
                    onPress={() => setNewRecord({ ...newRecord, category: cat.value as medicalRecordService.MedicalRecordCategory })}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={newRecord.category === cat.value ? '#fff' : '#4A90E2'}
                    />
                    <Text
                      style={[
                        styles.categorySelectorText,
                        newRecord.category === cat.value && styles.categorySelectorTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Título *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Ex: Primeira sessão"
                placeholderTextColor={colors.textTertiary}
                value={newRecord.title}
                onChangeText={(text) => setNewRecord({ ...newRecord, title: text })}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Descrição</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Breve descrição do registro"
                placeholderTextColor={colors.textTertiary}
                value={newRecord.description}
                onChangeText={(text) => setNewRecord({ ...newRecord, description: text })}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Conteúdo</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Escreva o conteúdo do registro..."
                placeholderTextColor={colors.textTertiary}
                value={newRecord.content}
                onChangeText={(text) => setNewRecord({ ...newRecord, content: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Anexar Arquivo (opcional)</Text>
              <TouchableOpacity
                style={[styles.fileButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handlePickDocument}
              >
                <Ionicons name={newRecord.file ? 'checkmark-circle' : 'attach'} size={20} color={newRecord.file ? '#50C878' : '#4A90E2'} />
                <Text style={[styles.fileButtonText, { color: newRecord.file ? '#50C878' : '#4A90E2' }]}>
                  {newRecord.file ? newRecord.file.name : 'Selecionar arquivo (PDF, DOC, DOCX)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveRecord}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Salvar Registro</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    padding: 4,
  },
  statsContainer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  categoriesScroll: {
    maxHeight: 50,
  },
  categoriesContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#4A90E2',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  categoryBadge: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  recordsList: {
    flex: 1,
    padding: 16,
  },
  recordCard: {
    marginBottom: 12,
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordCategory: {
    fontSize: 13,
    marginTop: 2,
  },
  recordDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordDate: {
    fontSize: 12,
  },
  recordFileIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordFileText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categorySelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 6,
  },
  categorySelectorButtonActive: {
    backgroundColor: '#4A90E2',
  },
  categorySelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  categorySelectorTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#50C878',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
