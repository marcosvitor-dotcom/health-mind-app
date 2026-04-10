import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Card from '../../components/Card';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { createPatient } from '../../services/psychologistService';
import { getErrorMessage } from '../../services/api';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  cpf: string;
}

export default function AddClientScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    cpf: '',
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const formatBirthDate = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do paciente');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o email do paciente');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Converter data de DD/MM/YYYY para YYYY-MM-DD
      let formattedBirthDate: string | undefined;
      if (formData.birthDate && formData.birthDate.includes('/')) {
        const [day, month, year] = formData.birthDate.split('/');
        if (year?.length === 4) {
          formattedBirthDate = `${year}-${month}-${day}`;
        }
      }

      await createPatient({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        birthDate: formattedBirthDate,
        cpf: formData.cpf.trim() || undefined,
      });

      Alert.alert(
        'Paciente Cadastrado!',
        'Paciente cadastrado para gestão. Para convidar para o app, use o botão "Convidar" na lista de pacientes.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const message = getErrorMessage(error);
      // Erros de limite de plano já são tratados globalmente (SubscriptionBlockedScreen),
      // mas exibimos o texto da API para erros específicos como PATIENT_LIMIT_REACHED
      Alert.alert('Erro', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header
        title="Novo Paciente"
        subtitle="Cadastre para gestão interna (agenda e financeiro)"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: '#E8F4FF' }]}>
            <Ionicons name="information-circle" size={18} color="#4A90E2" />
            <Text style={styles.infoText}>
              Pacientes cadastrados aqui são para uso interno (agenda e financeiro) e não têm acesso ao app. Para convidar um paciente para o app, use o botão "Convidar" na lista de pacientes.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dados Pessoais</Text>

          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome Completo *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Digite o nome completo"
            placeholderTextColor={colors.textTertiary}
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            editable={!saving}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Email *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="exemplo@email.com"
            placeholderTextColor={colors.textTertiary}
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!saving}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Telefone</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="(00) 00000-0000"
            placeholderTextColor={colors.textTertiary}
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            keyboardType="phone-pad"
            editable={!saving}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Data de Nascimento</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.textTertiary}
            value={formData.birthDate}
            onChangeText={(text) => handleInputChange('birthDate', formatBirthDate(text))}
            keyboardType="number-pad"
            maxLength={10}
            editable={!saving}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>CPF</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="000.000.000-00"
            placeholderTextColor={colors.textTertiary}
            value={formData.cpf}
            onChangeText={(text) => handleInputChange('cpf', text)}
            keyboardType="number-pad"
            editable={!saving}
          />
        </Card>

        <Text style={[styles.requiredNote, { color: colors.textTertiary }]}>* Campos obrigatórios</Text>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Paciente</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#4A90E2', lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  requiredNote: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: 16 },
  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1 },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    marginLeft: 4,
    gap: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
