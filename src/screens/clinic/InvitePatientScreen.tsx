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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import * as authService from '../../services/authService';

interface InvitePatientScreenProps {
  navigation: any;
}

interface PsychologistOption {
  id: string;
  _id: string;
  name: string;
  email: string;
  crp?: string;
}

export default function InvitePatientScreen({ navigation }: InvitePatientScreenProps) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingPsychologists, setLoadingPsychologists] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [psychologists, setPsychologists] = useState<PsychologistOption[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<PsychologistOption | null>(null);
  const [showPsychologistModal, setShowPsychologistModal] = useState(false);

  useEffect(() => {
    loadPsychologists();
  }, []);

  const loadPsychologists = async () => {
    try {
      const response = await api.get('/psychologists');
      if (response.data.success && response.data.data) {
        setPsychologists(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar psicólogos:', error);
    } finally {
      setLoadingPsychologists(false);
    }
  };

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

  const handleSubmit = async () => {
    if (!email || !name) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      let formattedBirthDate = birthDate;
      if (birthDate && birthDate.includes('/')) {
        const [day, month, year] = birthDate.split('/');
        formattedBirthDate = `${year}-${month}-${day}`;
      }

      await authService.invitePatient({
        email,
        name,
        phone: phone || undefined,
        birthDate: formattedBirthDate || undefined,
        psychologistId: selectedPsychologist ? (selectedPsychologist._id || selectedPsychologist.id) : undefined,
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

  const renderPsychologistOption = ({ item }: { item: PsychologistOption }) => (
    <TouchableOpacity
      style={[styles.psychologistOption, { borderBottomColor: colors.borderLight }]}
      onPress={() => {
        setSelectedPsychologist(item);
        setShowPsychologistModal(false);
      }}
    >
      <View style={[styles.psychologistAvatar, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}>
        <Ionicons name="person" size={24} color="#4A90E2" />
      </View>
      <View style={styles.psychologistInfo}>
        <Text style={[styles.psychologistName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.psychologistEmail, { color: colors.textSecondary }]}>{item.email}</Text>
        {item.crp && <Text style={[styles.psychologistCrp, { color: colors.textTertiary }]}>CRP: {item.crp}</Text>}
      </View>
      {selectedPsychologist && (selectedPsychologist._id || selectedPsychologist.id) === (item._id || item.id) && (
        <Ionicons name="checkmark-circle" size={24} color="#50C878" />
      )}
    </TouchableOpacity>
  );

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
          <Ionicons name="person-add" size={64} color="#50C878" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Convidar Paciente</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Envie um convite para um novo paciente iniciar o tratamento
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Email *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
            placeholder="paciente@email.com"
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
            placeholder="Maria Santos"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
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

          <Text style={[styles.label, { color: colors.textPrimary }]}>Data de Nascimento</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.textTertiary}
            value={birthDate}
            onChangeText={formatBirthDate}
            keyboardType="numeric"
            maxLength={10}
            editable={!loading}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>Psicólogo Responsável</Text>
          <TouchableOpacity
            style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setShowPsychologistModal(true)}
            disabled={loading || loadingPsychologists}
          >
            {loadingPsychologists ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : selectedPsychologist ? (
              <View style={styles.selectedPsychologist}>
                <Text style={[styles.selectedPsychologistName, { color: colors.textPrimary }]}>
                  {selectedPsychologist.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedPsychologist(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.selectButtonPlaceholder, { color: colors.textTertiary }]}>
                Selecionar psicólogo (opcional)
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}>
            <Ionicons name="information-circle" size={20} color="#4A90E2" />
            <Text style={styles.infoText}>
              O paciente receberá um e-mail com um link para completar o cadastro e definir sua senha.
            </Text>
          </View>

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

      <Modal
        visible={showPsychologistModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPsychologistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Selecionar Psicólogo</Text>
              <TouchableOpacity onPress={() => setShowPsychologistModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {psychologists.length === 0 ? (
              <View style={styles.emptyPsychologists}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhum psicólogo cadastrado</Text>
              </View>
            ) : (
              <FlatList
                data={psychologists}
                renderItem={renderPsychologistOption}
                keyExtractor={(item) => item._id || item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    flex: 1,
  },
  selectedPsychologist: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  selectedPsychologistName: {
    fontSize: 16,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4A90E2',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#50C878',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  psychologistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  psychologistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  psychologistInfo: {
    flex: 1,
  },
  psychologistName: {
    fontSize: 16,
    fontWeight: '500',
  },
  psychologistEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  psychologistCrp: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyPsychologists: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
