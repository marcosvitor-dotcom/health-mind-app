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
import * as roomService from '../../services/roomService';
import { Room, AMENITIES_MAP } from '../../services/roomService';

interface Props {
  navigation: any;
  route: { params?: { room?: Room } };
}

const ALL_AMENITIES = Object.keys(AMENITIES_MAP);

export default function RoomDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Sala' : 'Nova Sala'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Nome */}
        <View style={styles.field}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Consultorio 1"
            placeholderTextColor="#aaa"
            maxLength={100}
          />
        </View>

        {/* Numero */}
        <View style={styles.field}>
          <Text style={styles.label}>Numero</Text>
          <TextInput
            style={styles.input}
            value={number}
            onChangeText={setNumber}
            placeholder="Ex: 101"
            placeholderTextColor="#aaa"
            maxLength={20}
          />
        </View>

        {/* Descricao */}
        <View style={styles.field}>
          <Text style={styles.label}>Descricao</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descricao da sala..."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Capacidade */}
        <View style={styles.field}>
          <Text style={styles.label}>Capacidade</Text>
          <View style={styles.capacityRow}>
            <TouchableOpacity
              style={styles.capacityBtn}
              onPress={() => {
                const val = Math.max(1, parseInt(capacity) - 1);
                setCapacity(String(val));
              }}
            >
              <Ionicons name="remove" size={20} color="#4A90E2" />
            </TouchableOpacity>
            <Text style={styles.capacityValue}>{capacity}</Text>
            <TouchableOpacity
              style={styles.capacityBtn}
              onPress={() => {
                const val = Math.min(10, parseInt(capacity) + 1);
                setCapacity(String(val));
              }}
            >
              <Ionicons name="add" size={20} color="#4A90E2" />
            </TouchableOpacity>
            <Text style={styles.capacityLabel}>pessoas</Text>
          </View>
        </View>

        {/* Amenidades */}
        <View style={styles.field}>
          <Text style={styles.label}>Amenidades</Text>
          <View style={styles.amenitiesGrid}>
            {ALL_AMENITIES.map((key) => {
              const selected = amenities.includes(key);
              const info = AMENITIES_MAP[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.amenityChip, selected && styles.amenityChipSelected]}
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

        {/* Valor de Sublocação */}
        <View style={styles.field}>
          <Text style={styles.label}>Valor de Sublocacao (R$)</Text>
          <TextInput
            style={styles.input}
            value={subleasePrice}
            onChangeText={setSubleasePrice}
            placeholder="Ex: 80,00"
            placeholderTextColor="#aaa"
            keyboardType="decimal-pad"
          />
          <Text style={styles.fieldHint}>
            Cobrado quando psicologo usa a sala para pacientes externos a clinica
          </Text>
        </View>

        {/* Ativo/Inativo (somente edição) */}
        {isEditing && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Sala Ativa</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#ccc', true: '#4A90E2' }}
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

        {/* Botao Excluir (somente edição) */}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
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
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capacityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  capacityLabel: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#E8F4FD',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
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
