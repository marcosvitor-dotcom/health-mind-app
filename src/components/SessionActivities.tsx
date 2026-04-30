import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import {
  AppointmentActivity,
  ActivityType,
  CreateActivityRequest,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  submitActivity,
  uploadActivityFile,
  SubmitChecklistRequest,
} from '../services/activityService';
import ActivityForm from './ActivityForm';

interface SessionActivitiesProps {
  appointmentId: string;
  userRole: 'psychologist' | 'patient' | 'clinic';
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  checklist: 'Checklist',
  reflection: 'Reflexão',
  mood_tracking: 'Registro de Humor',
  document_upload: 'Envio de Arquivo',
};

const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  checklist: 'checkbox-outline',
  reflection: 'journal-outline',
  mood_tracking: 'happy-outline',
  document_upload: 'document-attach-outline',
};

export default function SessionActivities({ appointmentId, userRole }: SessionActivitiesProps) {
  const { colors, isDark } = useTheme();
  const [activities, setActivities] = useState<AppointmentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AppointmentActivity | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Estado local para respostas do paciente
  const [reflectionDraft, setReflectionDraft] = useState<Record<string, string>>({});
  const [moodDraft, setMoodDraft] = useState<Record<string, { value: number; note: string }>>({});
  const [checklistDraft, setChecklistDraft] = useState<Record<string, Record<string, boolean>>>({});

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getActivities(appointmentId);
      setActivities(data);
    } catch (err: any) {
      console.error('Erro ao carregar atividades:', err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleCreate = async (data: CreateActivityRequest) => {
    try {
      setFormLoading(true);
      const created = await createActivity(appointmentId, data);
      setActivities((prev) => [...prev, created]);
      setFormVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível criar a atividade');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data: CreateActivityRequest) => {
    if (!editingActivity) return;
    try {
      setFormLoading(true);
      const updated = await updateActivity(appointmentId, editingActivity._id, data);
      setActivities((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      setEditingActivity(null);
      setFormVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível atualizar a atividade');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (activity: AppointmentActivity) => {
    Alert.alert('Remover atividade', `Deseja remover "${activity.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteActivity(appointmentId, activity._id);
            setActivities((prev) => prev.filter((a) => a._id !== activity._id));
          } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível remover a atividade');
          }
        },
      },
    ]);
  };

  const handleSubmitReflection = async (activity: AppointmentActivity) => {
    const answer = reflectionDraft[activity._id] || '';
    if (!answer.trim()) {
      Alert.alert('Atenção', 'Escreva sua resposta antes de enviar');
      return;
    }
    try {
      setSubmittingId(activity._id);
      const updated = await submitActivity(appointmentId, activity._id, { reflectionAnswer: answer });
      setActivities((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível enviar a resposta');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSubmitMood = async (activity: AppointmentActivity) => {
    const draft = moodDraft[activity._id];
    if (!draft || !draft.value) {
      Alert.alert('Atenção', 'Selecione um valor de humor');
      return;
    }
    try {
      setSubmittingId(activity._id);
      const updated = await submitActivity(appointmentId, activity._id, {
        moodValue: draft.value,
        moodNote: draft.note || undefined,
      });
      setActivities((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível enviar o registro');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSubmitChecklist = async (activity: AppointmentActivity) => {
    const draft = checklistDraft[activity._id] || {};
    const items = (activity.checklistItems || []).map((item) => ({
      _id: item._id,
      checked: draft[item._id] !== undefined ? draft[item._id] : item.checked,
    }));
    try {
      setSubmittingId(activity._id);
      const updated = await submitActivity(appointmentId, activity._id, { checklistItems: items } as SubmitChecklistRequest);
      setActivities((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível enviar o checklist');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleUploadFile = async (activity: AppointmentActivity) => {
    Alert.alert('Enviar arquivo', 'Escolha o tipo de arquivo', [
      {
        text: 'Imagem (câmera)',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permissão negada', 'Permissão de câmera necessária');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            await sendFile(activity, asset.uri, asset.fileName || 'foto.jpg', asset.mimeType || 'image/jpeg');
          }
        },
      },
      {
        text: 'Imagem (galeria)',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permissão negada', 'Permissão de galeria necessária');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            await sendFile(activity, asset.uri, asset.fileName || 'imagem.jpg', asset.mimeType || 'image/jpeg');
          }
        },
      },
      {
        text: 'PDF',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
          if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.size && asset.size > 10 * 1024 * 1024) {
              Alert.alert('Arquivo muito grande', 'O PDF deve ter no máximo 10MB');
              return;
            }
            await sendFile(activity, asset.uri, asset.name, 'application/pdf');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const sendFile = async (activity: AppointmentActivity, uri: string, name: string, mimeType: string) => {
    try {
      setSubmittingId(activity._id);
      const updated = await uploadActivityFile(appointmentId, activity._id, uri, name, mimeType);
      setActivities((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível enviar o arquivo');
    } finally {
      setSubmittingId(null);
    }
  };

  const styles = createStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header da seção */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="clipboard-outline" size={18} color="#4A90E2" />
          <Text style={styles.sectionTitle}>Atividades</Text>
          {activities.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activities.length}</Text>
            </View>
          )}
        </View>
        {userRole === 'psychologist' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { setEditingActivity(null); setFormVisible(true); }}
          >
            <Ionicons name="add" size={16} color="#4A90E2" />
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>

      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {userRole === 'psychologist'
              ? 'Nenhuma atividade adicionada. Clique em "+ Adicionar" para criar uma.'
              : 'Nenhuma atividade para esta sessão.'}
          </Text>
        </View>
      ) : (
        activities.map((activity) => (
          <ActivityCard
            key={activity._id}
            activity={activity}
            userRole={userRole}
            expanded={expandedId === activity._id}
            onToggleExpand={() => setExpandedId(expandedId === activity._id ? null : activity._id)}
            onEdit={() => { setEditingActivity(activity); setFormVisible(true); }}
            onDelete={() => handleDelete(activity)}
            onSubmitReflection={() => handleSubmitReflection(activity)}
            onSubmitMood={() => handleSubmitMood(activity)}
            onSubmitChecklist={() => handleSubmitChecklist(activity)}
            onUploadFile={() => handleUploadFile(activity)}
            submitting={submittingId === activity._id}
            reflectionDraft={reflectionDraft[activity._id] || activity.reflectionAnswer || ''}
            onReflectionChange={(val) => setReflectionDraft((prev) => ({ ...prev, [activity._id]: val }))}
            moodDraft={moodDraft[activity._id] || (activity.moodValue ? { value: activity.moodValue, note: activity.moodNote || '' } : { value: 0, note: '' })}
            onMoodChange={(val) => setMoodDraft((prev) => ({ ...prev, [activity._id]: val }))}
            checklistDraft={checklistDraft[activity._id] || {}}
            onChecklistChange={(itemId, checked) =>
              setChecklistDraft((prev) => ({
                ...prev,
                [activity._id]: { ...(prev[activity._id] || {}), [itemId]: checked },
              }))
            }
            colors={colors}
            isDark={isDark}
            styles={styles}
          />
        ))
      )}

      {/* Form modal */}
      <ActivityForm
        visible={formVisible}
        onClose={() => { setFormVisible(false); setEditingActivity(null); }}
        onSave={editingActivity ? handleUpdate : handleCreate}
        initialData={editingActivity}
        loading={formLoading}
      />
    </View>
  );
}

// ─────────────────────────────────────────
// Sub-componente ActivityCard
// ─────────────────────────────────────────

interface ActivityCardProps {
  activity: AppointmentActivity;
  userRole: 'psychologist' | 'patient' | 'clinic';
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSubmitReflection: () => void;
  onSubmitMood: () => void;
  onSubmitChecklist: () => void;
  onUploadFile: () => void;
  submitting: boolean;
  reflectionDraft: string;
  onReflectionChange: (val: string) => void;
  moodDraft: { value: number; note: string };
  onMoodChange: (val: { value: number; note: string }) => void;
  checklistDraft: Record<string, boolean>;
  onChecklistChange: (itemId: string, checked: boolean) => void;
  colors: any;
  isDark: boolean;
  styles: any;
}

function ActivityCard({
  activity,
  userRole,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onSubmitReflection,
  onSubmitMood,
  onSubmitChecklist,
  onUploadFile,
  submitting,
  reflectionDraft,
  onReflectionChange,
  moodDraft,
  onMoodChange,
  checklistDraft,
  onChecklistChange,
  colors,
  isDark,
  styles,
}: ActivityCardProps) {
  const isCompleted = activity.status === 'completed';
  const isPsychologist = userRole === 'psychologist';

  const statusColor = isCompleted ? '#50C878' : '#FFB347';
  const statusLabel = isCompleted ? 'Concluída' : 'Pendente';

  return (
    <View style={styles.activityCard}>
      {/* Cabeçalho do card */}
      <TouchableOpacity style={styles.cardHeader} onPress={onToggleExpand} activeOpacity={0.7}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons
            name={ACTIVITY_TYPE_ICONS[activity.type] as any}
            size={18}
            color="#4A90E2"
          />
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>{activity.title}</Text>
            <Text style={styles.cardType}>{ACTIVITY_TYPE_LABELS[activity.type]}</Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          {isPsychologist && (
            <>
              <TouchableOpacity onPress={onEdit} style={styles.iconButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={styles.iconButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </>
          )}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Conteúdo expandido */}
      {expanded && (
        <View style={styles.cardBody}>
          {activity.description ? (
            <Text style={styles.description}>{activity.description}</Text>
          ) : null}

          {/* CHECKLIST */}
          {activity.type === 'checklist' && (
            <View>
              {(activity.checklistItems || []).map((item) => {
                const checkedVal = checklistDraft[item._id] !== undefined ? checklistDraft[item._id] : item.checked;
                return (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.checkItem}
                    onPress={() => !isPsychologist && !isCompleted && onChecklistChange(item._id, !checkedVal)}
                    activeOpacity={isPsychologist || isCompleted ? 1 : 0.6}
                  >
                    <Ionicons
                      name={checkedVal ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={checkedVal ? '#50C878' : colors.textSecondary}
                    />
                    <Text style={[styles.checkItemText, checkedVal && styles.checkItemChecked]}>
                      {item.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {!isPsychologist && !isCompleted && (
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={onSubmitChecklist}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={16} color="#fff" />
                  )}
                  <Text style={styles.submitButtonText}>Enviar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* REFLECTION */}
          {activity.type === 'reflection' && (
            <View>
              {isCompleted && activity.reflectionAnswer ? (
                <View style={styles.answerBox}>
                  <Text style={styles.answerLabel}>Resposta enviada:</Text>
                  <Text style={styles.answerText}>{activity.reflectionAnswer}</Text>
                </View>
              ) : !isPsychologist ? (
                <>
                  <TextInput
                    style={[styles.reflectionInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={reflectionDraft}
                    onChangeText={onReflectionChange}
                    placeholder="Escreva sua resposta aqui..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={4}
                    maxLength={3000}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={onSubmitReflection}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={16} color="#fff" />
                    )}
                    <Text style={styles.submitButtonText}>Enviar resposta</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.pendingText}>Aguardando resposta do paciente...</Text>
              )}
            </View>
          )}

          {/* MOOD TRACKING */}
          {activity.type === 'mood_tracking' && (
            <View>
              {isCompleted && activity.moodValue ? (
                <View style={styles.answerBox}>
                  <Text style={styles.answerLabel}>Humor registrado:</Text>
                  <View style={styles.moodResultRow}>
                    <Text style={styles.moodValueLarge}>{activity.moodValue}/10</Text>
                    <View style={[styles.moodBar, { backgroundColor: getMoodColor(activity.moodValue) + '33' }]}>
                      <View style={[styles.moodBarFill, { width: `${activity.moodValue * 10}%`, backgroundColor: getMoodColor(activity.moodValue) }]} />
                    </View>
                  </View>
                  {activity.moodNote ? <Text style={styles.answerText}>{activity.moodNote}</Text> : null}
                </View>
              ) : !isPsychologist ? (
                <>
                  <Text style={styles.moodLabel}>Como você está? (1 = muito mal, 10 = muito bem)</Text>
                  <View style={styles.moodScale}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.moodButton,
                          moodDraft.value === val && { backgroundColor: getMoodColor(val) },
                        ]}
                        onPress={() => onMoodChange({ ...moodDraft, value: val })}
                      >
                        <Text style={[styles.moodButtonText, moodDraft.value === val && styles.moodButtonTextSelected]}>
                          {val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.reflectionInput, { color: colors.textPrimary, borderColor: colors.border, marginTop: 10 }]}
                    value={moodDraft.note}
                    onChangeText={(val) => onMoodChange({ ...moodDraft, note: val })}
                    placeholder="Adicione uma nota (opcional)..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={2}
                    maxLength={1000}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={onSubmitMood}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={16} color="#fff" />
                    )}
                    <Text style={styles.submitButtonText}>Registrar humor</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.pendingText}>Aguardando registro do paciente...</Text>
              )}
            </View>
          )}

          {/* DOCUMENT UPLOAD */}
          {activity.type === 'document_upload' && (
            <View>
              {isCompleted && activity.fileUrl ? (
                <View style={styles.answerBox}>
                  <Ionicons name="document-attach" size={18} color="#4A90E2" />
                  <Text style={styles.fileNameText} numberOfLines={1}>{activity.fileName || 'Arquivo enviado'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#50C87822' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#50C878" />
                    <Text style={[styles.statusText, { color: '#50C878' }]}>Enviado</Text>
                  </View>
                </View>
              ) : !isPsychologist ? (
                <TouchableOpacity
                  style={[styles.uploadButton, submitting && styles.submitButtonDisabled]}
                  onPress={onUploadFile}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#4A90E2" />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={20} color="#4A90E2" />
                  )}
                  <Text style={styles.uploadButtonText}>
                    {submitting ? 'Enviando...' : 'Selecionar arquivo (Imagem ou PDF)'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.pendingText}>Aguardando envio do paciente...</Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function getMoodColor(value: number): string {
  if (value <= 3) return '#FF6B6B';
  if (value <= 6) return '#FFB347';
  return '#50C878';
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginTop: 4,
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    countBadge: {
      backgroundColor: '#4A90E2',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: '#4A90E2',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    addButtonText: {
      fontSize: 13,
      color: '#4A90E2',
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textTertiary,
      textAlign: 'center',
      maxWidth: 260,
      lineHeight: 18,
    },
    activityCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    cardTitleBlock: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    cardType: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      gap: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    iconButton: {
      padding: 4,
    },
    cardBody: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    checkItemText: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
    },
    checkItemChecked: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    reflectionInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      minHeight: 90,
    },
    answerBox: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
    },
    answerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      width: '100%',
      marginBottom: 2,
    },
    answerText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      flex: 1,
    },
    fileNameText: {
      fontSize: 13,
      color: '#4A90E2',
      flex: 1,
    },
    moodLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    moodScale: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    moodButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moodButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    moodButtonTextSelected: {
      color: '#fff',
    },
    moodResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      width: '100%',
    },
    moodValueLarge: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    moodBar: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    moodBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    pendingText: {
      fontSize: 13,
      color: colors.textTertiary,
      fontStyle: 'italic',
      paddingVertical: 8,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#50C878',
      borderRadius: 10,
      paddingVertical: 12,
      marginTop: 12,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: '#4A90E2',
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 16,
      marginTop: 4,
    },
    uploadButtonText: {
      fontSize: 14,
      color: '#4A90E2',
      fontWeight: '600',
    },
  });
