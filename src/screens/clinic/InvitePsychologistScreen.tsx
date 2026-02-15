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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import * as authService from '../../services/authService';

interface InvitePsychologistScreenProps {
  navigation: any;
}

export default function InvitePsychologistScreen({ navigation }: InvitePsychologistScreenProps) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [crp, setCrp] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);

  const addSpecialty = () => {
    if (specialty.trim()) {
      setSpecialties([...specialties, specialty.trim()]);
      setSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!email || !name || !crp) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const invitation = await authService.invitePsychologist({
        email,
        name,
        crp,
        specialties: specialties.length > 0 ? specialties : undefined,
        phone: phone || undefined,
      });

      Alert.alert(
        'Convite Enviado!',
        `Um e-mail foi enviado para ${email} com instruções para completar o cadastro.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao enviar convite');
    } finally {
      setLoading(false);
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
          <Ionicons name="mail" size={64} color="#4A90E2" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Convidar Psicólogo</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Envie um convite para um novo psicólogo se juntar à clínica
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Email *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
            placeholder="psicologo@email.com"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Nome Completo *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
            placeholder="Dr. João Silva"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>CRP *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
            placeholder="06/123456"
            placeholderTextColor={colors.textTertiary}
            value={crp}
            onChangeText={setCrp}
            editable={!loading}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Telefone</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
            placeholder="(11) 98765-4321"
            placeholderTextColor={colors.textTertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Especialidades</Text>
          <View style={styles.specialtyContainer}>
            <TextInput
              style={[styles.input, styles.specialtyInput, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
              placeholder="Ex: TCC, Ansiedade"
              placeholderTextColor={colors.textTertiary}
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
                <View key={index} style={[styles.chip, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}>
                  <Text style={styles.chipText}>{spec}</Text>
                  <TouchableOpacity
                    onPress={() => removeSpecialty(index)}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Enviar Convite</Text>
              </>
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
  specialtyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  specialtyInput: {
    flex: 1,
    marginBottom: 0,
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
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
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
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
