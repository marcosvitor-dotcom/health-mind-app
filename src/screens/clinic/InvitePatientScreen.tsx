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
      style={styles.psychologistOption}
      onPress={() => {
        setSelectedPsychologist(item);
        setShowPsychologistModal(false);
      }}
    >
      <View style={styles.psychologistAvatar}>
        <Ionicons name="person" size={24} color="#4A90E2" />
      </View>
      <View style={styles.psychologistInfo}>
        <Text style={styles.psychologistName}>{item.name}</Text>
        <Text style={styles.psychologistEmail}>{item.email}</Text>
        {item.crp && <Text style={styles.psychologistCrp}>CRP: {item.crp}</Text>}
      </View>
      {selectedPsychologist && (selectedPsychologist._id || selectedPsychologist.id) === (item._id || item.id) && (
        <Ionicons name="checkmark-circle" size={24} color="#50C878" />
      )}
    </TouchableOpacity>
  );

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
          <Ionicons name="person-add" size={64} color="#50C878" />
          <Text style={styles.title}>Convidar Paciente</Text>
          <Text style={styles.subtitle}>
            Envie um convite para um novo paciente iniciar o tratamento
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="paciente@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.label}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Maria Santos"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

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

          <Text style={styles.label}>Psicólogo Responsável</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowPsychologistModal(true)}
            disabled={loading || loadingPsychologists}
          >
            {loadingPsychologists ? (
              <ActivityIndicator size="small" color="#666" />
            ) : selectedPsychologist ? (
              <View style={styles.selectedPsychologist}>
                <Text style={styles.selectedPsychologistName}>
                  {selectedPsychologist.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedPsychologist(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.selectButtonPlaceholder}>
                Selecionar psicólogo (opcional)
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.infoBox}>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Psicólogo</Text>
              <TouchableOpacity onPress={() => setShowPsychologistModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {psychologists.length === 0 ? (
              <View style={styles.emptyPsychologists}>
                <Text style={styles.emptyText}>Nenhum psicólogo cadastrado</Text>
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
    backgroundColor: '#f5f5f5',
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
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: '#999',
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
    color: '#333',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FF',
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  psychologistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  psychologistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4FF',
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
    color: '#333',
  },
  psychologistEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  psychologistCrp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyPsychologists: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
