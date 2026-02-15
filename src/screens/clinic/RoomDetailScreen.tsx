import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as roomService from '../../services/roomService';
import { Room, AMENITIES_MAP } from '../../services/roomService';

interface Props {
  navigation: any;
  route: { params?: { room?: Room } };
}

const ALL_AMENITIES = Object.keys(AMENITIES_MAP);

export default function RoomDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const clinicId = user?._id || user?.id || '';
  const editRoom = route.params?.room;
  const isEditing = !!editRoom;

  const [name, setName] = useState(editRoom?.name || '');
  const [number, setNumber] = useState(editRoom?.number || '');
  const [description, setDescription] = useState(editRoom?.description || '');
  const [capacity, setCapacity] = useState(String(editRoom?.capacity || 2));
  const [amenities, setAmenities] = useState<string[]>(editRoom?.amenities || []);
  const [subleasePrice, setSubleasePrice] = useState(
    editRoom?.subleasePrice != null ? String(editRoom.subleasePrice) : ''
  );
  const [isActive, setIsActive] = useState(editRoom?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome da sala e obrigatorio');
      return;
    }

    const cap = parseInt(capacity);
    if (isNaN(cap) || cap < 1 || cap > 10) {
      Alert.alert('Erro', 'Capacidade deve ser entre 1 e 10');
      return;
    }

    const parsedSubleasePrice = subleasePrice.trim()
      ? parseFloat(subleasePrice.replace(',', '.'))
      : null;
    if (parsedSubleasePrice !== null && (isNaN(parsedSubleasePrice) || parsedSubleasePrice < 0)) {
      Alert.alert('Erro', 'Valor de sublocacao deve ser um numero positivo');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await roomService.updateRoom(clinicId, editRoom!._id, {
          name: name.trim(),
          number: number.trim() || undefined,
          description: description.trim() || undefined,
          capacity: cap,
          amenities,
          subleasePrice: parsedSubleasePrice,
          isActive,
        });
        Alert.alert('Sucesso', 'Sala atualizada', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await roomService.createRoom(clinicId, {
          name: name.trim(),
          number: number.trim() || undefined,
          description: description.trim() || undefined,
          capacity: cap,
          amenities,
          subleasePrice: parsedSubleasePrice,
        });
        Alert.alert('Sucesso', 'Sala criada', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Sala',
      `Deseja excluir "${editRoom?.name}"? Esta acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await roomService.deleteRoom(clinicId, editRoom!._id);
              Alert.alert('Sucesso', 'Sala excluida', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isEditing ? 'Editar Sala' : 'Nova Sala'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Nome */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Consultorio 1"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
          />
        </View>

        {/* Numero */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Numero</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={number}
            onChangeText={setNumber}
            placeholder="Ex: 101"
            placeholderTextColor={colors.textTertiary}
            maxLength={20}
          />
        </View>

        {/* Descricao */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Descricao</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descricao da sala..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Capacidade */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Capacidade</Text>
          <View style={styles.capacityRow}>
            <TouchableOpacity
              style={[styles.capacityBtn, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}
              onPress={() => {
                const val = Math.max(1, parseInt(capacity) - 1);
                setCapacity(String(val));
              }}
            >
              <Ionicons name="remove" size={20} color="#4A90E2" />
            </TouchableOpacity>
            <Text style={[styles.capacityValue, { color: colors.textPrimary }]}>{capacity}</Text>
            <TouchableOpacity
              style={[styles.capacityBtn, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD' }]}
              onPress={() => {
                const val = Math.min(10, parseInt(capacity) + 1);
                setCapacity(String(val));
              }}
            >
              <Ionicons name="add" size={20} color="#4A90E2" />
            </TouchableOpacity>
            <Text style={[styles.capacityLabel, { color: colors.textSecondary }]}>pessoas</Text>
          </View>
        </View>

        {/* Amenidades */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Amenidades</Text>
          <View style={styles.amenitiesGrid}>
            {ALL_AMENITIES.map((key) => {
              const selected = amenities.includes(key);
              const info = AMENITIES_MAP[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.amenityChip, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FD', borderColor: isDark ? '#1A2E3D' : '#E8F4FD' }, selected && styles.amenityChipSelected]}
                  onPress={() => toggleAmenity(key)}
                >
                  <Ionicons
                    name={info.icon as any}
                    size={16}
                    color={selected ? '#fff' : '#4A90E2'}
                  />
                  <Text style={[styles.amenityText, selected && styles.amenityTextSelected]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Valor de Sublocacao */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Valor de Sublocacao (R$)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={subleasePrice}
            onChangeText={setSubleasePrice}
            placeholder="Ex: 80,00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
            Cobrado quando psicologo usa a sala para pacientes externos a clinica
          </Text>
        </View>

        {/* Ativo/Inativo (somente edicao) */}
        {isEditing && (
          <View style={[styles.switchRow, { backgroundColor: colors.surface }]}>
            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Sala Ativa</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: isDark ? '#555' : '#ccc', true: '#4A90E2' }}
              thumbColor="#fff"
            />
          </View>
        )}

        {/* Botao Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Salvar Alteracoes' : 'Criar Sala'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Botao Excluir (somente edicao) */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#FF6B6B" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                <Text style={styles.deleteButtonText}>Excluir Sala</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  capacityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capacityValue: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  capacityLabel: {
    fontSize: 14,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  amenityChipSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  amenityText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  amenityTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
