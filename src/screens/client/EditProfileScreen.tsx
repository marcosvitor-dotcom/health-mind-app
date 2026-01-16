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
  const [birthDate, setBirthDate] = useState(user?.birthDate ? formatDateForDisplay(user.birthDate) : '');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  function formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const formatBirthDate = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) {
      setBirthDate(numbers);
    } else if (numbers.length <= 4) {
      setBirthDate(`${numbers.slice(0, 2)}/${numbers.slice(2)}`);
    } else {
      setBirthDate(`${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`);
    }
  };

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
      await profileService.uploadPatientAvatar(userId, imageUri);
      await refreshUserData();
      Alert.alert('Sucesso', 'Foto atualizada com sucesso!');
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

      let formattedBirthDate: string | undefined;
      if (birthDate && birthDate.includes('/')) {
        const [day, month, year] = birthDate.split('/');
        formattedBirthDate = `${year}-${month}-${day}`;
      }

      const updateData: profileService.UpdatePatientRequest = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        birthDate: formattedBirthDate,
      };

      if (emergencyName.trim()) {
        updateData.emergencyContact = {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim() || undefined,
          relationship: emergencyRelationship.trim() || undefined,
        };
      }

      await profileService.updatePatient(userId, updateData);
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

  const getInitials = () => {
    if (!user?.name) return '';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
                <Text style={styles.avatarText}>{getInitials()}</Text>
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

          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#999"
            value={birthDate}
            onChangeText={formatBirthDate}
            keyboardType="numeric"
            maxLength={10}
            editable={!loading}
          />

          <Text style={styles.sectionTitle}>Contato de Emergência</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do contato"
            placeholderTextColor="#999"
            value={emergencyName}
            onChangeText={setEmergencyName}
            editable={!loading}
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 98765-9999"
            placeholderTextColor="#999"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Relacionamento</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Irmão, Mãe, Amigo"
            placeholderTextColor="#999"
            value={emergencyRelationship}
            onChangeText={setEmergencyRelationship}
            editable={!loading}
          />

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
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#50C878',
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
  saveButton: {
    backgroundColor: '#50C878',
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
