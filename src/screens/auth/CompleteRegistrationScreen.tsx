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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as authService from '../../services/authService';
import * as storage from '../../utils/storage';
import { InvitationData, User } from '../../types';
import { TERMS_OF_USE, PRIVACY_POLICY } from '../../constants/legalDocuments';
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
  const { setAuthUser } = useAuth();
  const { colors } = useTheme();
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

  // Termos de uso
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy'>('terms');

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

    if (!termsAccepted) {
      Alert.alert('Erro', 'Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar');
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
          termsAcceptedAt: new Date().toISOString(),
        });
      } else if (invitationData?.role === 'psychologist') {
        response = await authService.completePsychologistRegistration({
          token,
          password,
          phone,
          bio,
          termsAcceptedAt: new Date().toISOString(),
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
          termsAcceptedAt: new Date().toISOString(),
        });
      }

      if (response) {
        // Salvar tokens
        await storage.setToken(response.token);
        await storage.setRefreshToken(response.refreshToken);

        // Normalizar user data
        const normalizedUser: User = {
          ...response.user,
          id: (response.user as any)._id || response.user.id,
        };

        await storage.setUser(normalizedUser);

        // Atualizar estado de autenticação para navegar automaticamente
        setAuthUser(normalizedUser);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao completar cadastro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Validando convite...</Text>
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="mail-open" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Complete seu Cadastro</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Bem-vindo, {invitationData.preFilledData.name}!
          </Text>
          <View style={[styles.roleTag, { backgroundColor: colors.primary }]}>
            <Text style={styles.roleText}>{getRoleLabel()}</Text>
          </View>
        </View>

        <View style={[styles.form, { backgroundColor: colors.surface }]}>
          {/* Email (read-only) */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
          <View style={[styles.inputDisabled, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.inputDisabledText, { color: colors.textSecondary }]}>{invitationData.email}</Text>
          </View>

          {/* Senha */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>Senha *</Text>
          <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.textPrimary }]}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={colors.textTertiary}
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
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Confirmar Senha */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>Confirmar Senha *</Text>
          <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.textPrimary }]}
              placeholder="Digite a senha novamente"
              placeholderTextColor={colors.textTertiary}
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
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Campos específicos de Clínica */}
          {invitationData.role === 'clinic' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Informações da Clínica</Text>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Telefone *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="(11) 3456-7890"
                placeholderTextColor={colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!submitting}
              />

              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Endereço</Text>

              <Text style={[styles.label, { color: colors.textPrimary }]}>CEP *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="01234-567"
                placeholderTextColor={colors.textTertiary}
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
                editable={!submitting}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Rua *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="Rua das Flores"
                placeholderTextColor={colors.textTertiary}
                value={street}
                onChangeText={setStreet}
                editable={!submitting}
              />

              <View style={styles.row}>
                <View style={styles.inputHalf}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Número *</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    placeholder="123"
                    placeholderTextColor={colors.textTertiary}
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    editable={!submitting}
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
                    editable={!submitting}
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
                editable={!submitting}
              />

              <View style={styles.row}>
                <View style={[styles.inputHalf, { flex: 2 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Cidade *</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    placeholder="São Paulo"
                    placeholderTextColor={colors.textTertiary}
                    value={city}
                    onChangeText={setCity}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.inputHalf}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Estado *</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                    placeholder="SP"
                    placeholderTextColor={colors.textTertiary}
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
              <Text style={[styles.label, { color: colors.textPrimary }]}>CPF</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="000.000.000-00"
                placeholderTextColor={colors.textTertiary}
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
                editable={!submitting}
              />

              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contato de Emergência</Text>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Nome</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="Nome do contato"
                placeholderTextColor={colors.textTertiary}
                value={emergencyName}
                onChangeText={setEmergencyName}
                editable={!submitting}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Telefone</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="(11) 98765-9999"
                placeholderTextColor={colors.textTertiary}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad"
                editable={!submitting}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>Relacionamento</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                placeholder="Ex: Irmão, Mãe, Amigo"
                placeholderTextColor={colors.textTertiary}
                value={emergencyRelationship}
                onChangeText={setEmergencyRelationship}
                editable={!submitting}
              />
            </>
          )}

          {/* Termos de Uso */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setTermsAccepted(!termsAccepted)}
              disabled={submitting}
            >
              <Ionicons
                name={termsAccepted ? 'checkbox' : 'square-outline'}
                size={24}
                color={termsAccepted ? colors.primary : colors.textTertiary}
              />
            </TouchableOpacity>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              Li e aceito os{' '}
              <Text
                style={[styles.termsLink, { color: colors.primary }]}
                onPress={() => {
                  setLegalModalType('terms');
                  setLegalModalVisible(true);
                }}
              >
                Termos de Uso
              </Text>
              {' '}e a{' '}
              <Text
                style={[styles.termsLink, { color: colors.primary }]}
                onPress={() => {
                  setLegalModalType('privacy');
                  setLegalModalVisible(true);
                }}
              >
                Politica de Privacidade
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, (submitting || !termsAccepted) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !termsAccepted}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Finalizar Cadastro</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de documento legal */}
      <Modal
        visible={legalModalVisible}
        animationType="slide"
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setLegalModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {legalModalType === 'terms' ? 'Termos de Uso' : 'Politica de Privacidade'}
            </Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              {legalModalType === 'terms' ? TERMS_OF_USE : PRIVACY_POLICY}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    marginTop: 16,
    fontSize: 16,
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
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  roleTag: {
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
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputDisabled: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  inputDisabledText: {
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 10,
  },
  checkbox: {
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
