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
import { useTheme } from '../../contexts/ThemeContext';
import * as profileService from '../../services/profileService';
import * as clinicService from '../../services/clinicService';

interface EditProfileScreenProps {
  navigation: any;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, refreshUserData } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [clinicData, setClinicData] = useState<any>(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  useEffect(() => {
    loadClinicData();
  }, []);

  const loadClinicData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userId = user._id || user.id;
      const data = await clinicService.getClinic(userId);
      setClinicData(data);

      // Pre-fill form fields
      setName(data.name || '');
      setPhone(data.phone || '');
      if (data.address) {
        setStreet(data.address.street || '');
        setNumber(data.address.number || '');
        setComplement(data.address.complement || '');
        setNeighborhood(data.address.neighborhood || '');
        setCity(data.address.city || '');
        setState(data.address.state || '');
        setZipCode(data.address.zipCode || '');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar dados da clínica');
    } finally {
      setLoading(false);
    }
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
      await profileService.uploadClinicLogo(userId, imageUri);
      await refreshUserData();
      Alert.alert('Sucesso', 'Logo atualizada com sucesso!');
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

      const updateData: profileService.UpdateClinicRequest = {
        name: name.trim(),
        phone: phone.trim() || undefined,
      };

      if (street || city || state || zipCode) {
        updateData.address = {
          street: street.trim() || undefined,
          number: number.trim() || undefined,
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zipCode: zipCode.trim() || undefined,
        };
      }

      await profileService.updateClinic(userId, updateData);
      await refreshUserData();
      await loadClinicData();

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      setEditMode(false);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !clinicData) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Dados da Clínica</Text>
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
                <Ionicons name="business" size={50} color="#fff" />
              </View>
            )}
            <View style={[styles.editBadge, { borderColor: colors.surface }]}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>Toque para alterar a logo</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Informações Básicas</Text>

          <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Nome:</Text>
            <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData?.name || 'Não informado'}</Text>
          </View>

          <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Email:</Text>
            <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData?.email || 'Não informado'}</Text>
          </View>

          <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>CNPJ:</Text>
            <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData?.cnpj || 'Não informado'}</Text>
          </View>

          <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Telefone:</Text>
            <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData?.phone || 'Não informado'}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Endereço</Text>

          {clinicData?.address ? (
            <>
              <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Rua:</Text>
                <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData.address.street || 'Não informado'}</Text>
              </View>

              <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Número:</Text>
                <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData.address.number || 'Não informado'}</Text>
              </View>

              {clinicData.address.complement && (
                <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Complemento:</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData.address.complement}</Text>
                </View>
              )}

              <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Bairro:</Text>
                <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData.address.neighborhood || 'Não informado'}</Text>
              </View>

              <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Cidade:</Text>
                <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData.address.city || 'Não informado'}</Text>
              </View>

              <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Estado:</Text>
                <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData.address.state || 'Não informado'}</Text>
              </View>

              <View style={[styles.dataRow, { borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>CEP:</Text>
                <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{clinicData.address.zipCode || 'Não informado'}</Text>
              </View>
            </>
          ) : (
            <Text style={[styles.noData, { color: colors.textTertiary }]}>Nenhum endereço cadastrado</Text>
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

      <Modal
        visible={editMode}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditMode(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity onPress={() => setEditMode(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Editar Perfil</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <View style={[styles.form, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Informações Básicas</Text>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Nome da Clínica *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="Nome da clínica"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
              <View style={[styles.inputDisabled, { borderColor: colors.border, backgroundColor: isDark ? '#2A3A45' : '#e9e9e9' }]}>
                <Text style={[styles.inputDisabledText, { color: colors.textSecondary }]}>{user?.email}</Text>
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>CNPJ</Text>
              <View style={[styles.inputDisabled, { borderColor: colors.border, backgroundColor: isDark ? '#2A3A45' : '#e9e9e9' }]}>
                <Text style={[styles.inputDisabledText, { color: colors.textSecondary }]}>{clinicData?.cnpj || 'Não informado'}</Text>
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Telefone</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="(11) 3456-7890"
                placeholderTextColor={colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />

              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Endereço</Text>

              <Text style={[styles.label, { color: colors.textPrimary }]}>CEP</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="01234-567"
                placeholderTextColor={colors.textTertiary}
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
                editable={!loading}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Rua</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="Rua das Flores"
                placeholderTextColor={colors.textTertiary}
                value={street}
                onChangeText={setStreet}
                editable={!loading}
              />

              <View style={styles.row}>
                <View style={styles.inputHalf}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Número</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    placeholder="123"
                    placeholderTextColor={colors.textTertiary}
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputHalf}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Complemento</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    placeholder="Sala 4"
                    placeholderTextColor={colors.textTertiary}
                    value={complement}
                    onChangeText={setComplement}
                    editable={!loading}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Bairro</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="Centro"
                placeholderTextColor={colors.textTertiary}
                value={neighborhood}
                onChangeText={setNeighborhood}
                editable={!loading}
              />

              <View style={styles.row}>
                <View style={[styles.inputHalf, { flex: 2 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Cidade</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    placeholder="São Paulo"
                    placeholderTextColor={colors.textTertiary}
                    value={city}
                    onChangeText={setCity}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputHalf}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Estado</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    placeholder="SP"
                    placeholderTextColor={colors.textTertiary}
                    value={state}
                    onChangeText={setState}
                    maxLength={2}
                    autoCapitalize="characters"
                    editable={!loading}
                  />
                </View>
              </View>

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
  },
  centerContent: {
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  avatarHint: {
    fontSize: 14,
    marginTop: 8,
  },
  form: {
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
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputDisabled: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  inputDisabledText: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
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
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 120,
  },
  dataValue: {
    flex: 1,
    fontSize: 14,
  },
  noData: {
    fontSize: 14,
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
});
