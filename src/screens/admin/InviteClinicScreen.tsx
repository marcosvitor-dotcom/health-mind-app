import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as adminService from '../../services/adminService';
import { getPlans, Plan } from '../../services/subscriptionService';

const PLAN_NAMES: Record<string, string> = {
  clinic_essencia: 'Essência',
  clinic_amplitude: 'Amplitude',
};

export default function InviteClinicScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    getPlans()
      .then(({ plans: allPlans }) => {
        setPlans(allPlans.filter((p) => p.userType === 'clinic'));
      })
      .catch(() => {});
  }, []);

  const selectedPlan = plans.find((p) => p.key === selectedPlanKey);

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 14) {
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cnpj;
  };

  const handleCNPJChange = (value: string) => {
    setCnpj(formatCNPJ(value));
  };

  const validateEmail = (email: string) => {
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Erro', 'Nome da clínica é obrigatório');
      return;
    }

    setLoading(true);

    try {
      await adminService.inviteClinic({
        email: email.trim(),
        name: name.trim(),
        cnpj: cnpj.replace(/\D/g, '') || undefined,
        planKey: selectedPlanKey || undefined,
      });

      Alert.alert('Sucesso', 'Convite enviado com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Convidar Clínica</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3498DB" />
            <Text style={styles.infoText}>
              Um email será enviado para a clínica com um link para completar o cadastro.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="email@clinica.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nome da Clínica <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome da clínica"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CNPJ (opcional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChangeText={handleCNPJChange}
                  keyboardType="numeric"
                  maxLength={18}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plano (opcional)</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowPlanModal(true)}
                disabled={loading}
              >
                <Ionicons name="ribbon" size={20} color="#666" style={styles.inputIcon} />
                <Text style={[styles.input, { color: selectedPlan ? '#333' : '#aaa' }]}>
                  {selectedPlan
                    ? `${PLAN_NAMES[selectedPlan.key] ?? selectedPlan.key} — R$ ${selectedPlan.pricing.monthly}/mês`
                    : 'Sem plano (enviar sem assinatura)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" style={{ paddingRight: 12 }} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Enviar Convite</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPlanModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Plano</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ key: '', name: 'Sem plano', pricing: { monthly: 0, setupFee: 0 }, limits: { invitedPatients: 0 } } as any, ...plans]}
              keyExtractor={(item) => item.key ?? 'none'}
              renderItem={({ item }) => {
                const isNone = item.key === '';
                const isSelected = isNone ? selectedPlanKey === null : selectedPlanKey === item.key;
                return (
                  <TouchableOpacity
                    style={[styles.planItem, isSelected && styles.planItemSelected]}
                    onPress={() => {
                      setSelectedPlanKey(isNone ? null : item.key);
                      setShowPlanModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planItemName, isSelected && styles.planItemNameSelected]}>
                        {isNone ? 'Sem plano (enviar sem assinatura)' : PLAN_NAMES[item.key] ?? item.key}
                      </Text>
                      {!isNone && (
                        <Text style={styles.planItemDetail}>
                          R$ {item.pricing.monthly}/mês
                          {item.pricing.setupFee > 0 ? ` + R$ ${item.pricing.setupFee} setup` : ''}
                          {'  •  '}
                          {item.limits.invitedPatients === 0
                            ? 'Sem convites para app'
                            : `${item.limits.invitedPatients} pacientes no app`}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color="#3498DB" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#3498DB',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  required: {
    color: '#E74C3C',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  planItemSelected: { borderColor: '#3498DB', backgroundColor: '#EBF5FB' },
  planItemName: { fontSize: 15, fontWeight: '600', color: '#333' },
  planItemNameSelected: { color: '#3498DB' },
  planItemDetail: { fontSize: 13, color: '#666', marginTop: 2 },
});
