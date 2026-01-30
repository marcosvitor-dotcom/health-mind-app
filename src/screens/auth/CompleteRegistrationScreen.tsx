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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as authService from '../../services/authService';
import * as storage from '../../utils/storage';
import { InvitationData } from '../../types';
import PsychologistRegistrationWizard from './PsychologistRegistrationWizard';

interface CompleteRegistrationScreenProps {
  route: {
    params: {
      token: string;
    };
  };
}

export default function CompleteRegistrationScreen({ route }: CompleteRegistrationScreenProps) {
  const { token } = route.params;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Campos comuns
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Campos específicos de clínica
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Campos específicos de psicólogo
  const [bio, setBio] = useState('');

  // Campos específicos de paciente
  const [cpf, setCpf] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      setLoading(true);
      const data = await authService.validateInvitationToken(token);
      setInvitationData(data);
    } catch (error: any) {
      Alert.alert(
        'Convite Inválido',
        error.message || 'Este convite expirou ou é inválido',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha a senha');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 8 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      let response;

      if (invitationData?.role === 'clinic') {
        if (!phone || !street || !number || !city || !state || !zipCode) {
          Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
          setSubmitting(false);
          return;
        }

        response = await authService.completeClinicRegistration({
          token,
          password,
          phone,
          address: {
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zipCode,
          },
        });
      } else if (invitationData?.role === 'psychologist') {
        response = await authService.completePsychologistRegistration({
          token,
          password,
          phone,
          bio,
        });
      } else if (invitationData?.role === 'patient') {
        response = await authService.completePatientRegistration({
          token,
          password,
          cpf,
          emergencyContact: emergencyName ? {
            name: emergencyName,
            phone: emergencyPhone,
            relationship: emergencyRelationship,
          } : undefined,
        });
      }

      if (response?.success && response.data) {
        // Salvar tokens
        await storage.setToken(response.data.token);
        await storage.setRefreshToken(response.data.refreshToken);

        // Normalizar user data
        const normalizedUser = {
          ...response.data.user,
          id: response.data.user._id || response.data.user.id,
        };

        await storage.setUser(normalizedUser);

        Alert.alert(
          'Sucesso!',
          'Seu cadastro foi concluído. Bem-vindo!',
          [{ text: 'OK' }]
        );

        // Recarregar a tela para o AuthContext pegar o novo usuário
        // (O AppNavigator vai detectar automaticamente)
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao completar cadastro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Validando convite...</Text>
      </View>
    );
  }

  if (!invitationData) {
    return null;
  }

  // Psicólogo usa wizard dedicado
  if (invitationData.role === 'psychologist') {
    return (
      <PsychologistRegistrationWizard
        invitationData={invitationData}
        token={token}
      />
    );
  }

  const getRoleLabel = () => {
    switch (invitationData.role) {
      case 'clinic': return 'Clínica';
      case 'psychologist': return 'Psicólogo';
      case 'patient': return 'Paciente';
      default: return '';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="mail-open" size={64} color="#4A90E2" />
          <Text style={styles.title}>Complete seu Cadastro</Text>
          <Text style={styles.subtitle}>
            Bem-vindo, {invitationData.preFilledData.name}!
          </Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>{getRoleLabel()}</Text>
          </View>
        </View>

        <View style={styles.form}>
          {/* Email (read-only) */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputDisabled}>
            <Text style={styles.inputDisabledText}>{invitationData.email}</Text>
          </View>

          {/* Senha */}
          <Text style={styles.label}>Senha *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!submitting}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={submitting}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Confirmar Senha */}
          <Text style={styles.label}>Confirmar Senha *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Digite a senha novamente"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!submitting}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={submitting}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Campos específicos de Clínica */}
          {invitationData.role === 'clinic' && (
            <>
              <Text style={styles.sectionTitle}>Informações da Clínica</Text>

              <Text style={styles.label}>Telefone *</Text>
              <TextInput
                style={styles.input}
                placeholder="(11) 3456-7890"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!submitting}
              />

              <Text style={styles.sectionTitle}>Endereço</Text>

              <Text style={styles.label}>CEP *</Text>
              <TextInput
                style={styles.input}
                placeholder="01234-567"
                placeholderTextColor="#999"
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
                editable={!submitting}
              />

              <Text style={styles.label}>Rua *</Text>
              <TextInput
                style={styles.input}
                placeholder="Rua das Flores"
                placeholderTextColor="#999"
                value={street}
                onChangeText={setStreet}
                editable={!submitting}
              />

              <View style={styles.row}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Número *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor="#999"
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    editable={!submitting}
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
                    editable={!submitting}
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
                editable={!submitting}
              />

              <View style={styles.row}>
                <View style={[styles.inputHalf, { flex: 2 }]}>
                  <Text style={styles.label}>Cidade *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="São Paulo"
                    placeholderTextColor="#999"
                    value={city}
                    onChangeText={setCity}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Estado *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="SP"
                    placeholderTextColor="#999"
                    value={state}
                    onChangeText={setState}
                    maxLength={2}
                    autoCapitalize="characters"
                    editable={!submitting}
                  />
                </View>
              </View>
            </>
          )}

          {/* Campos específicos de Paciente */}
          {invitationData.role === 'patient' && (
            <>
              <Text style={styles.label}>CPF</Text>
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                placeholderTextColor="#999"
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
                editable={!submitting}
              />

              <Text style={styles.sectionTitle}>Contato de Emergência</Text>

              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do contato"
                placeholderTextColor="#999"
                value={emergencyName}
                onChangeText={setEmergencyName}
                editable={!submitting}
              />

              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(11) 98765-9999"
                placeholderTextColor="#999"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad"
                editable={!submitting}
              />

              <Text style={styles.label}>Relacionamento</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Irmão, Mãe, Amigo"
                placeholderTextColor="#999"
                value={emergencyRelationship}
                onChangeText={setEmergencyRelationship}
                editable={!submitting}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Finalizar Cadastro</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  roleTag: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 20,
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
    marginBottom: 8,
    color: '#333',
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#e9e9e9',
    marginBottom: 8,
  },
  inputDisabledText: {
    fontSize: 16,
    color: '#666',
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
