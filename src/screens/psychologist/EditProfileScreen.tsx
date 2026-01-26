import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import * as profileService from '../../services/profileService';
import * as psychologistService from '../../services/psychologistService';

interface EditProfileScreenProps {
  navigation: any;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [psychologistData, setPsychologistData] = useState<any>(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [specialty, setSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<string[]>(user?.specialties || []);

  useEffect(() => {
    loadPsychologistData();
  }, []);

  const loadPsychologistData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userId = user._id || user.id;
      const data = await psychologistService.getPsychologist(userId);
      setPsychologistData(data);

      // Pre-fill form fields
      setName(data.name || '');
      setPhone(data.phone || '');
      setSpecialties(data.specialties || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados do psicólogo:', error);
      Alert.alert('Erro', error.message || 'Erro ao carregar dados do perfil');
    } finally {
      setLoading(false);
    }
  };

  const addSpecialty = () => {
    if (specialty.trim() && !specialties.includes(specialty.trim())) {
      setSpecialties([...specialties, specialty.trim()]);
      setSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar uma imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!user) return;

    setUploadingImage(true);
    try {
      const userId = user._id || user.id;
      await profileService.uploadPsychologistAvatar(userId, imageUri);
      await refreshUserData();
      await loadPsychologistData();
      Alert.alert('Sucesso', 'Avatar atualizado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao fazer upload da imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Erro', 'O nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const userId = user._id || user.id;

      const updateData: profileService.UpdatePsychologistRequest = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        specialties: specialties.length > 0 ? specialties : undefined,
      };

      await profileService.updatePsychologist(userId, updateData);
      await refreshUserData();
      await loadPsychologistData();

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      setEditMode(false);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !psychologistData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploadingImage}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#fff" />
              </View>
            )}
            <View style={styles.editBadge}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toque para alterar a foto</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Nome:</Text>
            <Text style={styles.dataValue}>{psychologistData?.name || 'Não informado'}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Email:</Text>
            <Text style={styles.dataValue}>{psychologistData?.email || 'Não informado'}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>CRP:</Text>
            <Text style={styles.dataValue}>{psychologistData?.crp || 'Não informado'}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Telefone:</Text>
            <Text style={styles.dataValue}>{psychologistData?.phone || 'Não informado'}</Text>
          </View>

          {user?.clinicId && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Status:</Text>
              <View style={styles.clinicBadge}>
                <Ionicons name="business" size={16} color="#50C878" />
                <Text style={styles.clinicBadgeText}>Vinculado a Clínica</Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Especialidades</Text>

          {psychologistData?.specialties && psychologistData.specialties.length > 0 ? (
            <View style={styles.specialtiesDisplay}>
              {psychologistData.specialties.map((spec: string, index: number) => (
                <View key={index} style={styles.chipDisplay}>
                  <Text style={styles.chipDisplayText}>{spec}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>Nenhuma especialidade cadastrada</Text>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(true)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Editar Dados</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Edição */}
      <Modal
        visible={editMode}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditMode(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditMode(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Editar Perfil</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>Informações Pessoais</Text>

              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome completo"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputDisabled}>
                <Text style={styles.inputDisabledText}>{user?.email}</Text>
              </View>

              <Text style={styles.label}>CRP</Text>
              <View style={styles.inputDisabled}>
                <Text style={styles.inputDisabledText}>{psychologistData?.crp || 'Não informado'}</Text>
              </View>

              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(11) 98765-4321"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />

              <Text style={styles.sectionTitle}>Especialidades</Text>

              <View style={styles.specialtyContainer}>
                <TextInput
                  style={[styles.input, styles.specialtyInput]}
                  placeholder="Ex: TCC, Ansiedade"
                  placeholderTextColor="#999"
                  value={specialty}
                  onChangeText={setSpecialty}
                  editable={!loading}
                  onSubmitEditing={addSpecialty}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addSpecialty}
                  disabled={!specialty.trim() || loading}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {specialties.length > 0 && (
                <View style={styles.specialtiesChips}>
                  {specialties.map((spec, index) => (
                    <View key={index} style={styles.chip}>
                      <Text style={styles.chipText}>{spec}</Text>
                      <TouchableOpacity
                        onPress={() => removeSpecialty(index)}
                        disabled={loading}
                      >
                        <Ionicons name="close-circle" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  dataValue: {
    flex: 1,
    fontSize: 14,
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
    fontSize: 12,
    color: '#50C878',
    marginLeft: 6,
    fontWeight: '600',
  },
  specialtiesDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chipDisplay: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipDisplayText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#e9e9e9',
  },
  inputDisabledText: {
    fontSize: 16,
    color: '#666',
  },
  specialtyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  specialtyInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialtiesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
