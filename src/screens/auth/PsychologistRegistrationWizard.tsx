import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { InvitationData, PsychologistWizardData } from '../../types';
import { PsychologistFormData } from '../../utils/systemPromptGenerator';
import { gerarSystemPromptComGemini } from '../../services/geminiService';
import * as authService from '../../services/authService';
import * as storage from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import { ABORDAGENS, PUBLICOS, TEMAS, TONS } from '../../constants/psychologistOptions';

const TOTAL_STEPS = 6;
const STEP_TITLES = [
  'Dados Básicos',
  'Abordagem Terapêutica',
  'Especializações',
  'Estilo de Comunicação',
  'Técnicas e Diferenciais',
  'Revisão',
];

interface Props {
  invitationData: InvitationData;
  token: string;
}

export default function PsychologistRegistrationWizard({ invitationData, token }: Props) {
  const { refreshUserData } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAbordagemDropdown, setShowAbordagemDropdown] = useState(false);

  const [wizardData, setWizardData] = useState<PsychologistWizardData>({
    password: '',
    confirmPassword: '',
    phone: invitationData.preFilledData.phone || '',
    formacaoAcademica: '',
    abordagemPrincipal: '',
    descricaoTrabalho: '',
    publicosEspecificos: [],
    temasEspecializados: [],
    tonsComunicacao: [],
    tecnicasFavoritas: '',
    restricoesTematicas: '',
    diferenciais: '',
  });

  const updateField = <K extends keyof PsychologistWizardData>(
    field: K,
    value: PsychologistWizardData[K]
  ) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (
    field: 'publicosEspecificos' | 'temasEspecializados' | 'tonsComunicacao',
    item: string
  ) => {
    setWizardData(prev => {
      const current = prev[field];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  // --- Validação por step ---
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (!wizardData.password || !wizardData.confirmPassword) {
          Alert.alert('Erro', 'Por favor, preencha a senha.');
          return false;
        }
        if (wizardData.password !== wizardData.confirmPassword) {
          Alert.alert('Erro', 'As senhas não coincidem.');
          return false;
        }
        if (wizardData.password.length < 8) {
          Alert.alert('Erro', 'A senha deve ter no mínimo 8 caracteres.');
          return false;
        }
        return true;
      case 1:
        if (!wizardData.formacaoAcademica.trim()) {
          Alert.alert('Erro', 'Por favor, informe sua formação acadêmica.');
          return false;
        }
        if (!wizardData.abordagemPrincipal) {
          Alert.alert('Erro', 'Por favor, selecione sua abordagem principal.');
          return false;
        }
        if (!wizardData.descricaoTrabalho.trim()) {
          Alert.alert('Erro', 'Por favor, descreva brevemente sua forma de trabalhar.');
          return false;
        }
        return true;
      case 3:
        if (wizardData.tonsComunicacao.length === 0) {
          Alert.alert('Erro', 'Selecione pelo menos um tom de comunicação.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (validateCurrentStep()) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
    }
  };

  const goBack = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const goToStep = (step: number) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setCurrentStep(step);
  };

  // --- Submit ---
  const handleSubmit = async () => {
    setSubmitting(true);
    setLoadingMessage('Gerando perfil de IA personalizado...');

    try {
      // Fase 1: Gerar system prompt via Gemini
      const formData: PsychologistFormData = {
        nomeCompleto: invitationData.preFilledData.name || '',
        crp: invitationData.preFilledData.crp || '',
        formacaoAcademica: wizardData.formacaoAcademica,
        abordagemPrincipal: wizardData.abordagemPrincipal,
        descricaoTrabalho: wizardData.descricaoTrabalho,
        publicosEspecificos: wizardData.publicosEspecificos,
        temasEspecializados: wizardData.temasEspecializados,
        tonsComunicacao: wizardData.tonsComunicacao,
        tecnicasFavoritas: wizardData.tecnicasFavoritas.split('\n').filter(t => t.trim()),
        restricoesTematicas: wizardData.restricoesTematicas,
        diferenciais: wizardData.diferenciais,
      };

      const systemPrompt = await gerarSystemPromptComGemini(formData);
      const truncatedPrompt = systemPrompt.substring(0, 10000);

      // Fase 2: Completar cadastro
      await completeRegistration(truncatedPrompt);
    } catch (error: any) {
      const msg = error?.message || String(error) || 'Erro desconhecido';
      Alert.alert(
        'Erro ao gerar IA',
        `Não foi possível gerar o perfil de IA. Deseja continuar sem ele?\n\n${msg}`,
        [
          { text: 'Tentar Novamente', onPress: () => handleSubmit() },
          { text: 'Continuar Sem IA', onPress: () => completeRegistration(undefined) },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } finally {
      setSubmitting(false);
      setLoadingMessage('');
    }
  };

  const completeRegistration = async (systemPrompt?: string) => {
    setSubmitting(true);
    setLoadingMessage('Finalizando cadastro...');

    try {
      const response = await authService.completePsychologistRegistration({
        token,
        password: wizardData.password,
        phone: wizardData.phone || undefined,
        formacaoAcademica: wizardData.formacaoAcademica,
        abordagemPrincipal: wizardData.abordagemPrincipal,
        descricaoTrabalho: wizardData.descricaoTrabalho,
        publicosEspecificos: wizardData.publicosEspecificos,
        temasEspecializados: wizardData.temasEspecializados,
        tonsComunicacao: wizardData.tonsComunicacao,
        tecnicasFavoritas: wizardData.tecnicasFavoritas.split('\n').filter(t => t.trim()),
        restricoesTematicas: wizardData.restricoesTematicas,
        diferenciais: wizardData.diferenciais,
        systemPrompt,
      });

      // Auto-login
      await storage.setToken(response.token);
      await storage.setRefreshToken(response.refreshToken);
      const normalizedUser = {
        ...response.user,
        id: response.user._id || response.user.id,
      };
      await storage.setUser(normalizedUser);

      Alert.alert('Sucesso!', 'Seu cadastro foi concluído. Bem-vindo!', [
        { text: 'OK', onPress: () => refreshUserData() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao completar cadastro.');
    } finally {
      setSubmitting(false);
      setLoadingMessage('');
    }
  };

  // --- Progress Indicator ---
  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <React.Fragment key={i}>
          <TouchableOpacity
            onPress={() => {
              if (i < currentStep) goToStep(i);
            }}
            disabled={i >= currentStep}
          >
            <View
              style={[
                styles.progressDot,
                i < currentStep && styles.progressDotCompleted,
                i === currentStep && styles.progressDotActive,
              ]}
            >
              {i < currentStep ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.progressDotText,
                    i === currentStep && styles.progressDotTextActive,
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          {i < TOTAL_STEPS - 1 && (
            <View
              style={[
                styles.progressLine,
                i < currentStep && styles.progressLineCompleted,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  // --- Steps ---
  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled]}
        value={invitationData.preFilledData.name || ''}
        editable={false}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled]}
        value={invitationData.email}
        editable={false}
      />

      <Text style={styles.label}>CRP</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled]}
        value={invitationData.preFilledData.crp || ''}
        editable={false}
      />

      <Text style={styles.label}>Senha *</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#999"
          value={wizardData.password}
          onChangeText={v => updateField('password', v)}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirmar Senha *</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Repita a senha"
          placeholderTextColor="#999"
          value={wizardData.confirmPassword}
          onChangeText={v => updateField('confirmPassword', v)}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Telefone</Text>
      <TextInput
        style={styles.input}
        placeholder="(00) 00000-0000"
        placeholderTextColor="#999"
        value={wizardData.phone}
        onChangeText={v => updateField('phone', v)}
        keyboardType="phone-pad"
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.label}>Formação Acadêmica (Instituição) *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Universidade de São Paulo"
        placeholderTextColor="#999"
        value={wizardData.formacaoAcademica}
        onChangeText={v => updateField('formacaoAcademica', v)}
      />

      <Text style={styles.label}>Abordagem Principal *</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowAbordagemDropdown(!showAbordagemDropdown)}
      >
        <Text style={wizardData.abordagemPrincipal ? styles.dropdownText : styles.dropdownPlaceholder}>
          {wizardData.abordagemPrincipal || 'Selecione a abordagem'}
        </Text>
        <Ionicons
          name={showAbordagemDropdown ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {showAbordagemDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
            {ABORDAGENS.map(abordagem => (
              <TouchableOpacity
                key={abordagem}
                style={styles.dropdownItem}
                onPress={() => {
                  updateField('abordagemPrincipal', abordagem);
                  setShowAbordagemDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{abordagem}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.label}>Breve descrição da sua forma de trabalhar *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Descreva brevemente como você trabalha com seus pacientes"
        placeholderTextColor="#999"
        value={wizardData.descricaoTrabalho}
        onChangeText={v => updateField('descricaoTrabalho', v)}
        multiline
        maxLength={200}
      />
      <Text style={styles.charCounter}>{wizardData.descricaoTrabalho.length}/200</Text>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.label}>Públicos Específicos</Text>
      <Text style={styles.hint}>Selecione os públicos com os quais você trabalha</Text>
      <View style={styles.chipGroup}>
        {PUBLICOS.map(publico => (
          <TouchableOpacity
            key={publico}
            style={[
              styles.chip,
              wizardData.publicosEspecificos.includes(publico) && styles.chipSelected,
            ]}
            onPress={() => toggleArrayItem('publicosEspecificos', publico)}
          >
            <Text
              style={[
                styles.chipText,
                wizardData.publicosEspecificos.includes(publico) && styles.chipTextSelected,
              ]}
            >
              {publico}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 20 }]}>Temas Especializados</Text>
      <Text style={styles.hint}>Selecione os temas com os quais você mais trabalha</Text>
      <View style={styles.chipGroup}>
        {TEMAS.map(tema => (
          <TouchableOpacity
            key={tema}
            style={[
              styles.chip,
              wizardData.temasEspecializados.includes(tema) && styles.chipSelected,
            ]}
            onPress={() => toggleArrayItem('temasEspecializados', tema)}
          >
            <Text
              style={[
                styles.chipText,
                wizardData.temasEspecializados.includes(tema) && styles.chipTextSelected,
              ]}
            >
              {tema}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.label}>Como você se comunica? *</Text>
      <Text style={styles.hint}>Selecione os tons que melhor descrevem sua comunicação</Text>
      <View style={styles.chipGroup}>
        {TONS.map(tom => (
          <TouchableOpacity
            key={tom}
            style={[
              styles.chip,
              wizardData.tonsComunicacao.includes(tom) && styles.chipSelected,
            ]}
            onPress={() => toggleArrayItem('tonsComunicacao', tom)}
          >
            <Text
              style={[
                styles.chipText,
                wizardData.tonsComunicacao.includes(tom) && styles.chipTextSelected,
              ]}
            >
              {tom}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.label}>Técnicas/Perguntas Favoritas</Text>
      <Text style={styles.hint}>Liste 3-5 perguntas ou técnicas que você mais usa (uma por linha)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={'"O que você está sentindo agora?"\n"Como isso reverbera no seu corpo?"\n"O que faz sentido para você nesse momento?"'}
        placeholderTextColor="#999"
        value={wizardData.tecnicasFavoritas}
        onChangeText={v => updateField('tecnicasFavoritas', v)}
        multiline
        numberOfLines={5}
      />

      <Text style={[styles.label, { marginTop: 16 }]}>Restrições Temáticas</Text>
      <Text style={styles.hint}>Algum tema que você prefere não abordar?</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Descreva se há algum tema que você prefere não atender"
        placeholderTextColor="#999"
        value={wizardData.restricoesTematicas}
        onChangeText={v => updateField('restricoesTematicas', v)}
        multiline
      />

      <Text style={[styles.label, { marginTop: 16 }]}>Diferenciais</Text>
      <Text style={styles.hint}>O que seus pacientes mais valorizam no seu atendimento?</Text>
      <TextInput
        style={styles.input}
        placeholder="Máximo 100 caracteres"
        placeholderTextColor="#999"
        value={wizardData.diferenciais}
        onChangeText={v => updateField('diferenciais', v)}
        maxLength={100}
      />
      <Text style={styles.charCounter}>{wizardData.diferenciais.length}/100</Text>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      {/* Dados Básicos */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Dados Básicos</Text>
          <TouchableOpacity onPress={() => goToStep(0)}>
            <Text style={styles.reviewEditLink}>Editar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Nome: </Text>
          {invitationData.preFilledData.name}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Email: </Text>
          {invitationData.email}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>CRP: </Text>
          {invitationData.preFilledData.crp}
        </Text>
        {wizardData.phone ? (
          <Text style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Telefone: </Text>
            {wizardData.phone}
          </Text>
        ) : null}
      </View>

      {/* Abordagem */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Abordagem Terapêutica</Text>
          <TouchableOpacity onPress={() => goToStep(1)}>
            <Text style={styles.reviewEditLink}>Editar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Formação: </Text>
          {wizardData.formacaoAcademica}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Abordagem: </Text>
          {wizardData.abordagemPrincipal}
        </Text>
        <Text style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Descrição: </Text>
          {wizardData.descricaoTrabalho}
        </Text>
      </View>

      {/* Especializações */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Especializações</Text>
          <TouchableOpacity onPress={() => goToStep(2)}>
            <Text style={styles.reviewEditLink}>Editar</Text>
          </TouchableOpacity>
        </View>
        {wizardData.publicosEspecificos.length > 0 && (
          <>
            <Text style={styles.reviewLabel}>Públicos:</Text>
            <View style={styles.reviewChipGroup}>
              {wizardData.publicosEspecificos.map(p => (
                <View key={p} style={styles.reviewChip}>
                  <Text style={styles.reviewChipText}>{p}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {wizardData.temasEspecializados.length > 0 && (
          <>
            <Text style={[styles.reviewLabel, { marginTop: 8 }]}>Temas:</Text>
            <View style={styles.reviewChipGroup}>
              {wizardData.temasEspecializados.map(t => (
                <View key={t} style={styles.reviewChip}>
                  <Text style={styles.reviewChipText}>{t}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {wizardData.publicosEspecificos.length === 0 && wizardData.temasEspecializados.length === 0 && (
          <Text style={styles.reviewItemLight}>Nenhuma especialização selecionada</Text>
        )}
      </View>

      {/* Comunicação */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Estilo de Comunicação</Text>
          <TouchableOpacity onPress={() => goToStep(3)}>
            <Text style={styles.reviewEditLink}>Editar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewChipGroup}>
          {wizardData.tonsComunicacao.map(t => (
            <View key={t} style={styles.reviewChip}>
              <Text style={styles.reviewChipText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Técnicas */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewSectionHeader}>
          <Text style={styles.reviewSectionTitle}>Técnicas e Diferenciais</Text>
          <TouchableOpacity onPress={() => goToStep(4)}>
            <Text style={styles.reviewEditLink}>Editar</Text>
          </TouchableOpacity>
        </View>
        {wizardData.tecnicasFavoritas.trim() ? (
          <>
            <Text style={styles.reviewLabel}>Técnicas:</Text>
            <Text style={styles.reviewItem}>{wizardData.tecnicasFavoritas}</Text>
          </>
        ) : null}
        {wizardData.restricoesTematicas.trim() ? (
          <>
            <Text style={[styles.reviewLabel, { marginTop: 8 }]}>Restrições:</Text>
            <Text style={styles.reviewItem}>{wizardData.restricoesTematicas}</Text>
          </>
        ) : null}
        {wizardData.diferenciais.trim() ? (
          <>
            <Text style={[styles.reviewLabel, { marginTop: 8 }]}>Diferenciais:</Text>
            <Text style={styles.reviewItem}>{wizardData.diferenciais}</Text>
          </>
        ) : null}
        {!wizardData.tecnicasFavoritas.trim() && !wizardData.restricoesTematicas.trim() && !wizardData.diferenciais.trim() && (
          <Text style={styles.reviewItemLight}>Nenhuma informação adicional</Text>
        )}
      </View>

      <View style={styles.aiNote}>
        <Ionicons name="sparkles" size={18} color="#4A90E2" />
        <Text style={styles.aiNoteText}>
          Ao finalizar, uma IA irá gerar automaticamente o perfil da sua assistente terapêutica digital com base nas informações acima.
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete seu Cadastro</Text>
          <Text style={styles.headerSubtitle}>
            Bem-vindo, {invitationData.preFilledData.name}!
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Psicólogo</Text>
          </View>
        </View>

        {/* Progress */}
        {renderProgressIndicator()}
        <Text style={styles.stepTitle}>
          Etapa {currentStep + 1} de {TOTAL_STEPS} — {STEP_TITLES[currentStep]}
        </Text>

        {/* Step Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Navigation Footer */}
        <View style={styles.footer}>
          {currentStep > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Ionicons name="arrow-back" size={18} color="#4A90E2" />
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {currentStep < TOTAL_STEPS - 1 ? (
            <TouchableOpacity style={styles.nextButton} onPress={goNext}>
              <Text style={styles.nextButtonText}>Próximo</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>Finalizar Cadastro</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingTitle}>{loadingMessage}</Text>
            <Text style={styles.loadingHint}>Isso pode levar alguns segundos...</Text>
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
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  progressDotActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  progressDotCompleted: {
    borderColor: '#50C878',
    backgroundColor: '#50C878',
  },
  progressDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLine: {
    width: 20,
    height: 2,
    backgroundColor: '#ddd',
  },
  progressLineCompleted: {
    backgroundColor: '#50C878',
  },
  stepTitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  // Content
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  stepContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },

  // Form
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },

  // Dropdown
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#fff',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },

  // Chips
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },

  // Review
  reviewSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  reviewEditLink: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  reviewItem: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
    lineHeight: 20,
  },
  reviewItemLight: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  reviewChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  reviewChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F4FF',
    marginRight: 6,
    marginBottom: 6,
  },
  reviewChipText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  aiNoteText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
    lineHeight: 18,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 15,
    color: '#4A90E2',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Loading
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  loadingHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
});
