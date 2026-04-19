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
import * as authService from '../../services/authService';
import { getPlans, Plan } from '../../services/subscriptionService';
import { useAuth } from '../../contexts/AuthContext';

const PLAN_NAMES: Record<string, string> = {
  psico_avaliacao: 'Avaliação (Trial)',
  psico_basico: 'Básico',
  psico_consciencia: 'Consciência',
  psico_equilibrio: 'Equilíbrio',
  psico_plenitude: 'Plenitude',
};

export default function InvitePsychologistScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [crp, setCrp] = useState('');
  const [phone, setPhone] = useState('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const isPromoteAdmin = (user as any)?.permissions?.promoteAdmin === true;

  useEffect(() => {
    getPlans()
      .then(({ plans: allPlans }) => {
        let filtered = allPlans.filter((p) => p.userType === 'psychologist');
        if (!isPromoteAdmin) {
          filtered = filtered.filter((p) => p.key !== 'psico_avaliacao');
        }
        setPlans(filtered);
      })
      .catch(() => {});
  }, []);

  const selectedPlan = plans.find((p) => p.key === selectedPlanKey);

  const validateEmail = (value: string) =>
    /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value);

  const handleSubmit = async () => {
    if (!email.trim()) { Alert.alert('Erro', 'Email é obrigatório'); return; }
    if (!validateEmail(email)) { Alert.alert('Erro', 'Email inválido'); return; }
    if (!name.trim()) { Alert.alert('Erro', 'Nome é obrigatório'); return; }
    if (!crp.trim()) { Alert.alert('Erro', 'CRP é obrigatório'); return; }

    setLoading(true);
    try {
      await authService.invitePsychologist({
        email: email.trim(),
        name: name.trim(),
        crp: crp.trim(),
        phone: phone.trim() || undefined,
        planKey: selectedPlanKey || undefined,
      });

      Alert.alert('Sucesso', 'Convite enviado! O psicólogo receberá um e-mail para completar o cadastro.', [
        { text: 'OK', onPress: () => navigation.goBack() },
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
          <Text style={styles.title}>Convidar Psicólogo</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#9B59B6" />
            <Text style={styles.infoText}>
              Apenas administradores podem convidar psicólogos para a plataforma. Um e-mail será enviado com link de acesso.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="psicologo@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Dr. João Silva"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CRP <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="card" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="06/123456"
                  value={crp}
                  onChangeText={setCrp}
                  autoCapitalize="characters"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone (opcional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
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
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color="#9B59B6" />}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  content: { padding: 16 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EEF8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, color: '#9B59B6', lineHeight: 20 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  required: { color: '#E74C3C' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, padding: 16, fontSize: 16, color: '#333' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9B59B6',
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  submitButtonDisabled: { backgroundColor: '#999' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
  planItemSelected: { borderColor: '#9B59B6', backgroundColor: '#F5EEF8' },
  planItemName: { fontSize: 15, fontWeight: '600', color: '#333' },
  planItemNameSelected: { color: '#9B59B6' },
  planItemDetail: { fontSize: 13, color: '#666', marginTop: 2 },
});
