import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ActivityType, AppointmentActivity, CreateActivityRequest } from '../services/activityService';

interface ActivityFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CreateActivityRequest) => Promise<void>;
  initialData?: AppointmentActivity | null;
  loading?: boolean;
}

const ACTIVITY_TYPES: Array<{ type: ActivityType; label: string; icon: string; description: string }> = [
  { type: 'checklist', label: 'Checklist', icon: 'checkbox-outline', description: 'Lista de itens para marcar' },
  { type: 'reflection', label: 'Reflexão', icon: 'journal-outline', description: 'Resposta a uma pergunta' },
  { type: 'mood_tracking', label: 'Registro de Humor', icon: 'happy-outline', description: 'Escala de 1 a 10 + nota' },
  { type: 'document_upload', label: 'Envio de Arquivo', icon: 'document-attach-outline', description: 'Imagem ou PDF' },
];

export default function ActivityForm({ visible, onClose, onSave, initialData, loading = false }: ActivityFormProps) {
  const { colors, isDark } = useTheme();

  const [type, setType] = useState<ActivityType>(initialData?.type || 'checklist');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [checklistItems, setChecklistItems] = useState<string[]>(
    initialData?.checklistItems?.map((i) => i.text) || ['']
  );

  const resetForm = () => {
    setType('checklist');
    setTitle('');
    setDescription('');
    setChecklistItems(['']);
  };

  const handleClose = () => {
    if (!initialData) resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Atenção', 'O título é obrigatório');
      return;
    }

    if (type === 'checklist') {
      const validItems = checklistItems.filter((i) => i.trim().length > 0);
      if (validItems.length === 0) {
        Alert.alert('Atenção', 'Adicione ao menos um item ao checklist');
        return;
      }
    }

    const data: CreateActivityRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
    };

    if (type === 'checklist') {
      data.checklistItems = checklistItems.filter((i) => i.trim().length > 0);
    }

    await onSave(data);
    if (!initialData) resetForm();
  };

  const addChecklistItem = () => setChecklistItems((prev) => [...prev, '']);
  const updateChecklistItem = (index: number, value: string) =>
    setChecklistItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  const removeChecklistItem = (index: number) =>
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));

  const styles = createStyles(colors, isDark);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialData ? 'Editar Atividade' : 'Nova Atividade'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Seletor de tipo */}
            {!initialData && (
              <View style={styles.section}>
                <Text style={styles.label}>Tipo de atividade</Text>
                <View style={styles.typeGrid}>
                  {ACTIVITY_TYPES.map((item) => (
                    <TouchableOpacity
                      key={item.type}
                      style={[styles.typeCard, type === item.type && styles.typeCardSelected]}
                      onPress={() => setType(item.type)}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={type === item.type ? '#fff' : colors.textSecondary}
                      />
                      <Text style={[styles.typeLabel, type === item.type && styles.typeLabelSelected]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.typeDesc, type === item.type && styles.typeDescSelected]}>
                        {item.description}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Título */}
            <View style={styles.section}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Diário de emoções da semana"
                placeholderTextColor={colors.textTertiary}
                maxLength={200}
              />
            </View>

            {/* Descrição / instrução */}
            <View style={styles.section}>
              <Text style={styles.label}>Instrução (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descreva o que o paciente deve fazer..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>

            {/* Itens do checklist */}
            {type === 'checklist' && (
              <View style={styles.section}>
                <Text style={styles.label}>Itens do checklist *</Text>
                {checklistItems.map((item, index) => (
                  <View key={index} style={styles.checklistRow}>
                    <TextInput
                      style={[styles.input, styles.checklistInput]}
                      value={item}
                      onChangeText={(val) => updateChecklistItem(index, val)}
                      placeholder={`Item ${index + 1}`}
                      placeholderTextColor={colors.textTertiary}
                      maxLength={500}
                    />
                    {checklistItems.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeChecklistItem(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addItemButton} onPress={addChecklistItem}>
                  <Ionicons name="add-circle-outline" size={18} color="#4A90E2" />
                  <Text style={styles.addItemText}>Adicionar item</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Botões */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <Ionicons name="hourglass-outline" size={18} color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={18} color="#fff" />
              )}
              <Text style={styles.saveButtonText}>
                {initialData ? 'Salvar' : 'Adicionar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      paddingHorizontal: 20,
    },
    section: {
      marginTop: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    typeCard: {
      width: '47%',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 12,
      alignItems: 'flex-start',
      gap: 4,
    },
    typeCardSelected: {
      backgroundColor: '#4A90E2',
      borderColor: '#4A90E2',
    },
    typeLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    typeLabelSelected: {
      color: '#fff',
    },
    typeDesc: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    typeDescSelected: {
      color: 'rgba(255,255,255,0.85)',
    },
    input: {
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    textArea: {
      minHeight: 80,
      paddingTop: 12,
    },
    checklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    checklistInput: {
      flex: 1,
    },
    removeButton: {
      padding: 8,
    },
    addItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    addItemText: {
      fontSize: 14,
      color: '#4A90E2',
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: '#4A90E2',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      color: '#4A90E2',
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      backgroundColor: '#50C878',
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 15,
      color: '#fff',
      fontWeight: '700',
    },
  });
