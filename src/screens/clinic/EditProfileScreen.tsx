import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import * as profileService from '../../services/profileService';

interface EditProfileScreenProps {
  navigation: any;
}

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar uma imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
            <View style={styles.editBadge}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toque para alterar a logo</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>

          <Text style={styles.label}>Nome da Clínica *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome da clínica"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputDisabled}>
            <Text style={styles.inputDisabledText}>{user?.email}</Text>
          </View>

          <Text style={styles.label}>CNPJ</Text>
          <View style={styles.inputDisabled}>
            <Text style={styles.inputDisabledText}>{user?.cnpj || 'Não informado'}</Text>
          </View>

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 3456-7890"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.sectionTitle}>Endereço</Text>

          <Text style={styles.label}>CEP</Text>
          <TextInput
            style={styles.input}
            placeholder="01234-567"
            placeholderTextColor="#999"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="numeric"
            editable={!loading}
          />

          <Text style={styles.label}>Rua</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua das Flores"
            placeholderTextColor="#999"
            value={street}
            onChangeText={setStreet}
            editable={!loading}
          />

          <View style={styles.row}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Número</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                placeholderTextColor="#999"
                value={number}
                onChangeText={setNumber}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            <View style={styles.inputHalf}>
              <Text style={styles.label}>Complemento</Text>
              <TextInput
                style={styles.input}
                placeholder="Sala 4"
                placeholderTextColor="#999"
                value={complement}
                onChangeText={setComplement}
                editable={!loading}
              />
            </View>
          </View>

          <Text style={styles.label}>Bairro</Text>
          <TextInput
            style={styles.input}
            placeholder="Centro"
            placeholderTextColor="#999"
            value={neighborhood}
            onChangeText={setNeighborhood}
            editable={!loading}
          />

          <View style={styles.row}>
            <View style={[styles.inputHalf, { flex: 2 }]}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                placeholder="São Paulo"
                placeholderTextColor="#999"
                value={city}
                onChangeText={setCity}
                editable={!loading}
              />
            </View>

            <View style={styles.inputHalf}>
              <Text style={styles.label}>Estado</Text>
              <TextInput
                style={styles.input}
                placeholder="SP"
                placeholderTextColor="#999"
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
});
