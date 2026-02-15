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
import { useTheme } from '../../contexts/ThemeContext';
import { ABORDAGENS, PUBLICOS, TEMAS, TONS } from '../../constants/psychologistOptions';
import { TERMS_OF_USE, PRIVACY_POLICY } from '../../constants/legalDocuments';

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
  const { setAuthUser } = useAuth();
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAbordagemDropdown, setShowAbordagemDropdown] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy'>('terms');

  const [wizardData, setWizardData] = useState<PsychologistWizardData>({
    password: '',
    confirmPassword: '',
    phone: invitationData.preFilledData.phone || '',
    formacaoAcademica: '',
    posGraduacao: '',
    abordagemPrincipal: '',
    descricaoTrabalho: '',
    publicosEspecificos: [],
    temasEspecializados: [],
    tonsComunicacao: [],
    tecnicasFavoritas: '',
    restricoesTematicas: '',
    diferenciais: '',
    experienciaViolencia: '',
    situacoesLimite: '',
    linguagemPreferida: '',
    exemploAcolhimento: '',
    exemploLimiteEtico: '',
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
    if (!termsAccepted) {
      Alert.alert('Erro', 'Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar');
      return;
    }

    setSubmitting(true);
    setLoadingMessage('Gerando perfil de IA personalizado...');

    try {
      // Fase 1: Gerar system prompt via Gemini
      const formData: PsychologistFormData = {
        nomeCompleto: invitationData.preFilledData.name || '',
        crp: invitationData.preFilledData.crp || '',
        formacaoAcademica: wizardData.formacaoAcademica,
        posGraduacao: wizardData.posGraduacao,
        abordagemPrincipal: wizardData.abordagemPrincipal,
        descricaoTrabalho: wizardData.descricaoTrabalho,
        publicosEspecificos: wizardData.publicosEspecificos,
        temasEspecializados: wizardData.temasEspecializados,
        tonsComunicacao: wizardData.tonsComunicacao,
        tecnicasFavoritas: wizardData.tecnicasFavoritas.split('\n').filter(t => t.trim()),
        restricoesTematicas: wizardData.restricoesTematicas,
        diferenciais: wizardData.diferenciais,
        experienciaViolencia: wizardData.experienciaViolencia,
        situacoesLimite: wizardData.situacoesLimite,
        linguagemPreferida: wizardData.linguagemPreferida,
        exemploAcolhimento: wizardData.exemploAcolhimento,
        exemploLimiteEtico: wizardData.exemploLimiteEtico,
      };

      const systemPrompt = await gerarSystemPromptComGemini(formData);
      const truncatedPrompt = systemPrompt.substring(0, 20000);

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
        posGraduacao: wizardData.posGraduacao,
        abordagemPrincipal: wizardData.abordagemPrincipal,
        descricaoTrabalho: wizardData.descricaoTrabalho,
        publicosEspecificos: wizardData.publicosEspecificos,
        temasEspecializados: wizardData.temasEspecializados,
        tonsComunicacao: wizardData.tonsComunicacao,
        tecnicasFavoritas: wizardData.tecnicasFavoritas.split('\n').filter(t => t.trim()),
        restricoesTematicas: wizardData.restricoesTematicas,
        diferenciais: wizardData.diferenciais,
        experienciaViolencia: wizardData.experienciaViolencia,
        situacoesLimite: wizardData.situacoesLimite,
        linguagemPreferida: wizardData.linguagemPreferida,
        exemploAcolhimento: wizardData.exemploAcolhimento,
        exemploLimiteEtico: wizardData.exemploLimiteEtico,
        systemPrompt,
        termsAcceptedAt: new Date().toISOString(),
      });

      // Auto-login
      await storage.setToken(response.token);
      await storage.setRefreshToken(response.refreshToken);
      const normalizedUser = {
        ...response.user,
        id: response.user._id || response.user.id,
      };
      await storage.setUser(normalizedUser);

      // Atualizar estado de autenticação para navegar automaticamente
      setAuthUser(normalizedUser);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao completar cadastro.');
    } finally {
      setSubmitting(false);
      setLoadingMessage('');
    }
  };

  // --- Progress Indicator ---
  const renderProgressIndicator = () => (
    <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
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
                { borderColor: colors.border, backgroundColor: colors.surface },
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
                    { color: colors.textTertiary },
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
                { backgroundColor: colors.border },
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
    <View style={[styles.stepContent, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Nome</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textTertiary }]}
        value={invitationData.preFilledData.name || ''}
        editable={false}
      />

      <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textTertiary }]}
        value={invitationData.email}
        editable={false}
      />

      <Text style={[styles.label, { color: colors.textPrimary }]}>CRP</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textTertiary }]}
        value={invitationData.preFilledData.crp || ''}
        editable={false}
      />

      <Text style={[styles.label, { color: colors.textPrimary }]}>Senha *</Text>
      <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
        <TextInput
          style={[styles.passwordInput, { color: colors.textPrimary }]}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor={colors.textTertiary}
          value={wizardData.password}
          onChangeText={v => updateField('password', v)}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.textPrimary }]}>Confirmar Senha *</Text>
      <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
        <TextInput
          style={[styles.passwordInput, { color: colors.textPrimary }]}
          placeholder="Repita a senha"
          placeholderTextColor={colors.textTertiary}
          value={wizardData.confirmPassword}
          onChangeText={v => updateField('confirmPassword', v)}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.textPrimary }]}>Telefone</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="(00) 00000-0000"
        placeholderTextColor={colors.textTertiary}
        value={wizardData.phone}
        onChangeText={v => updateField('phone', v)}
        keyboardType="phone-pad"
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={[styles.stepContent, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Formação Acadêmica (Instituição) *</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Ex: Universidade de São Paulo"
        placeholderTextColor={colors.textTertiary}
        value={wizardData.formacaoAcademica}
        onChangeText={v => updateField('formacaoAcademica', v)}
      />

      <Text style={[styles.label, { color: colors.textPrimary }]}>Pós-graduação / Especialização</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Ex: Pós-graduada em Gestalt-terapia pelo Instituto X"
        placeholderTextColor={colors.textTertiary}
        value={wizardData.posGraduacao}
        onChangeText={v => updateField('posGraduacao', v)}
      />

      <Text style={[styles.label, { color: colors.textPrimary }]}>Abordagem Principal *</Text>
      <TouchableOpacity
        style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
        onPress={() => setShowAbordagemDropdown(!showAbordagemDropdown)}
      >
        <Text style={wizardData.abordagemPrincipal ? [styles.dropdownText, { color: colors.textPrimary }] : [styles.dropdownPlaceholder, { color: colors.textTertiary }]}>
          {wizardData.abordagemPrincipal || 'Selecione a abordagem'}
        </Text>
        <Ionicons
          name={showAbordagemDropdown ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {showAbordagemDropdown && (
        <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
            {ABORDAGENS.map(abordagem => (
              <TouchableOpacity
                key={abordagem}
                style={[styles.dropdownItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => {
                  updateField('abordagemPrincipal', abordagem);
                  setShowAbordagemDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]}>{abordagem}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={[styles.label, { color: colors.textPrimary }]}>Breve descrição da sua forma de trabalhar *</Text>
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Descreva brevemente como você trabalha com seus pacientes"
        placeholderTextColor={colors.textTertiary}
        value={wizardData.descricaoTrabalho}
        onChangeText={v => updateField('descricaoTrabalho', v)}
        multiline
        maxLength={200}
      />
      <Text style={[styles.charCounter, { color: colors.textTertiary }]}>{wizardData.descricaoTrabalho.length}/200</Text>
    </View>
  );

  const renderStep2 = () => (
    <View style={[styles.stepContent, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Públicos Específicos</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Selecione os públicos com os quais você trabalha</Text>
      <View style={styles.chipGroup}>
        {PUBLICOS.map(publico => (
          <TouchableOpacity
            key={publico}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              wizardData.publicosEspecificos.includes(publico) && styles.chipSelected,
            ]}
            onPress={() => toggleArrayItem('publicosEspecificos', publico)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.textPrimary },
                wizardData.publicosEspecificos.includes(publico) && styles.chipTextSelected,
              ]}
            >
              {publico}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 20, color: colors.textPrimary }]}>Temas Especializados</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Selecione os temas com os quais você mais trabalha</Text>
      <View style={styles.chipGroup}>
        {TEMAS.map(tema => (
          <TouchableOpacity
            key={tema}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              wizardData.temasEspecializados.includes(tema) && styles.chipSelected,
            ]}
            onPress={() => toggleArrayItem('temasEspecializados', tema)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.textPrimary },
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
    <View style={[styles.stepContent, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Como você se comunica? *</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Selecione os tons que melhor descrevem sua comunicação</Text>
      <View style={styles.chipGroup}>
        {TONS.map(tom => (
          <TouchableOpacity
            key={tom}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              wizardData.tonsComunicacao.includes(tom) && styles.chipSelected,
            ]}
            onPress={() => toggleArrayItem('tonsComunicacao', tom)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.textPrimary },
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
    <View style={[styles.stepContent, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Técnicas/Perguntas Favoritas</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Liste 3-5 perguntas ou técnicas que você mais usa (uma por linha)</Text>
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder={'"O que você está sentindo agora?"\n"Como isso reverbera no seu corpo?"\n"O que faz sentido para você nesse momento?"'}
        placeholderTextColor={colors.textTertiary}
        value={wizardData.tecnicasFavoritas}
        onChangeText={v => updateField('tecnicasFavoritas', v)}
        multiline
        numberOfLines={5}
      />

      <Text style={[styles.label, { marginTop: 16, color: colors.textPrimary }]}>Restrições Temáticas</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Algum tema que você prefere não abordar?</Text>
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Descreva se há algum tema que você prefere não atender"
        placeholderTextColor={colors.textTertiary}
        value={wizardData.restricoesTematicas}
        onChangeText={v => updateField('restricoesTematicas', v)}
        multiline
      />

      <Text style={[styles.label, { marginTop: 16, color: colors.textPrimary }]}>Diferenciais</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>O que seus pacientes mais valorizam no seu atendimento?</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Máximo 100 caracteres"
        placeholderTextColor={colors.textTertiary}
        value={wizardData.diferenciais}
        onChangeText={v => updateField('diferenciais', v)}
        maxLength={100}
      />
      <Text style={[styles.charCounter, { color: colors.textTertiary }]}>{wizardData.diferenciais.length}/100</Text>

      <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionSubtitle, { color: colors.primary }]}>Perguntas Clínicas Aprofundadas</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Estas perguntas ajudam a gerar um assistente mais personalizado e preciso</Text>

      <Text style={[styles.label, { marginTop: 12, color: colors.textPrimary }]}>Experiência com violência de gênero/doméstica</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Você tem experiência atendendo vítimas de violência? Descreva brevemente.</Text>
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Ex: Atuo há 5 anos com mulheres em situação de violência doméstica..."
        placeholderTextColor={colors.textTertiary}
        value={wizardData.experienciaViolencia}
        onChangeText={v => updateField('experienciaViolencia', v)}
        multiline
      />

      <Text style={[styles.label, { marginTop: 12, color: colors.textPrimary }]}>Como você lida com situações-limite?</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Quando um paciente está em crise ou risco, como você age?</Text>
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Ex: Priorizo a segurança, aciono o protocolo de emergência..."
        placeholderTextColor={colors.textTertiary}
        value={wizardData.situacoesLimite}
        onChangeText={v => updateField('situacoesLimite', v)}
        multiline
      />

      <Text style={[styles.label, { marginTop: 12, color: colors.textPrimary }]}>Linguagem/pronomes preferidos</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Como sua assistente deve se comunicar? Linguagem neutra, inclusiva?</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Ex: Linguagem neutra e inclusiva, evitar pressuposições"
        placeholderTextColor={colors.textTertiary}
        value={wizardData.linguagemPreferida}
        onChangeText={v => updateField('linguagemPreferida', v)}
      />

      <Text style={[styles.label, { marginTop: 12, color: colors.textPrimary }]}>Exemplo: como você acolhe um paciente?</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Escreva como você responderia a um paciente que diz "hoje foi um dia horrível"</Text>
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Ex: Sinto que foi um dia pesado. Estou aqui para te ouvir..."
        placeholderTextColor={colors.textTertiary}
        value={wizardData.exemploAcolhimento}
        onChangeText={v => updateField('exemploAcolhimento', v)}
        multiline
      />

      <Text style={[styles.label, { marginTop: 12, color: colors.textPrimary }]}>Exemplo: como você responde a pedido de diagnóstico?</Text>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>Quando um paciente pergunta "você acha que eu tenho depressão?", como responde?</Text>
      <TextInput
        style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
        placeholder="Ex: Essa é uma avaliação que apenas eu posso fazer nas sessões..."
        placeholderTextColor={colors.textTertiary}
        value={wizardData.exemploLimiteEtico}
        onChangeText={v => updateField('exemploLimiteEtico', v)}
        multiline
      />
    </View>
  );

  const renderStep5 = () => (
    <View style={[styles.stepContent, { backgroundColor: colors.surface }]}>
      {/* Dados Básicos */}
      <View style={[styles.reviewSection, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.reviewSectionHeader}>
          <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Dados Básicos</Text>
          <TouchableOpacity onPress={() => goToStep(0)}>
            <Text style={[styles.reviewEditLink, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
          <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Nome: </Text>
          {invitationData.preFilledData.name}
        </Text>
        <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
          <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Email: </Text>
          {invitationData.email}
        </Text>
        <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
          <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>CRP: </Text>
          {invitationData.preFilledData.crp}
        </Text>
        {wizardData.phone ? (
          <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
            <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Telefone: </Text>
            {wizardData.phone}
          </Text>
        ) : null}
      </View>

      {/* Abordagem */}
      <View style={[styles.reviewSection, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.reviewSectionHeader}>
          <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Abordagem Terapêutica</Text>
          <TouchableOpacity onPress={() => goToStep(1)}>
            <Text style={[styles.reviewEditLink, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
          <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Formação: </Text>
          {wizardData.formacaoAcademica}
        </Text>
        {wizardData.posGraduacao ? (
          <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
            <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Pós-graduação: </Text>
            {wizardData.posGraduacao}
          </Text>
        ) : null}
        <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
          <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Abordagem: </Text>
          {wizardData.abordagemPrincipal}
        </Text>
        <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>
          <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Descrição: </Text>
          {wizardData.descricaoTrabalho}
        </Text>
      </View>

      {/* Especializações */}
      <View style={[styles.reviewSection, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.reviewSectionHeader}>
          <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Especializações</Text>
          <TouchableOpacity onPress={() => goToStep(2)}>
            <Text style={[styles.reviewEditLink, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>
        {wizardData.publicosEspecificos.length > 0 && (
          <>
            <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Públicos:</Text>
            <View style={styles.reviewChipGroup}>
              {wizardData.publicosEspecificos.map(p => (
                <View key={p} style={[styles.reviewChip, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FF' }]}>
                  <Text style={[styles.reviewChipText, { color: colors.primary }]}>{p}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {wizardData.temasEspecializados.length > 0 && (
          <>
            <Text style={[styles.reviewLabel, { marginTop: 8, color: colors.textPrimary }]}>Temas:</Text>
            <View style={styles.reviewChipGroup}>
              {wizardData.temasEspecializados.map(t => (
                <View key={t} style={[styles.reviewChip, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FF' }]}>
                  <Text style={[styles.reviewChipText, { color: colors.primary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {wizardData.publicosEspecificos.length === 0 && wizardData.temasEspecializados.length === 0 && (
          <Text style={[styles.reviewItemLight, { color: colors.textTertiary }]}>Nenhuma especialização selecionada</Text>
        )}
      </View>

      {/* Comunicação */}
      <View style={[styles.reviewSection, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.reviewSectionHeader}>
          <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Estilo de Comunicação</Text>
          <TouchableOpacity onPress={() => goToStep(3)}>
            <Text style={[styles.reviewEditLink, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.reviewChipGroup}>
          {wizardData.tonsComunicacao.map(t => (
            <View key={t} style={[styles.reviewChip, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FF' }]}>
              <Text style={[styles.reviewChipText, { color: colors.primary }]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Técnicas */}
      <View style={[styles.reviewSection, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.reviewSectionHeader}>
          <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Técnicas e Diferenciais</Text>
          <TouchableOpacity onPress={() => goToStep(4)}>
            <Text style={[styles.reviewEditLink, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
        </View>
        {wizardData.tecnicasFavoritas.trim() ? (
          <>
            <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Técnicas:</Text>
            <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.tecnicasFavoritas}</Text>
          </>
        ) : null}
        {wizardData.restricoesTematicas.trim() ? (
          <>
            <Text style={[styles.reviewLabel, { marginTop: 8, color: colors.textPrimary }]}>Restrições:</Text>
            <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.restricoesTematicas}</Text>
          </>
        ) : null}
        {wizardData.diferenciais.trim() ? (
          <>
            <Text style={[styles.reviewLabel, { marginTop: 8, color: colors.textPrimary }]}>Diferenciais:</Text>
            <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.diferenciais}</Text>
          </>
        ) : null}
        {!wizardData.tecnicasFavoritas.trim() && !wizardData.restricoesTematicas.trim() && !wizardData.diferenciais.trim() && (
          <Text style={[styles.reviewItemLight, { color: colors.textTertiary }]}>Nenhuma informação adicional</Text>
        )}
      </View>

      {/* Perguntas Clínicas */}
      {(wizardData.experienciaViolencia || wizardData.situacoesLimite || wizardData.linguagemPreferida || wizardData.exemploAcolhimento || wizardData.exemploLimiteEtico) ? (
        <View style={[styles.reviewSection, { borderBottomColor: colors.borderLight }]}>
          <View style={styles.reviewSectionHeader}>
            <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>Perguntas Clínicas</Text>
            <TouchableOpacity onPress={() => goToStep(4)}>
              <Text style={[styles.reviewEditLink, { color: colors.primary }]}>Editar</Text>
            </TouchableOpacity>
          </View>
          {wizardData.experienciaViolencia ? (
            <>
              <Text style={[styles.reviewLabel, { color: colors.textPrimary }]}>Experiência com violência:</Text>
              <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.experienciaViolencia}</Text>
            </>
          ) : null}
          {wizardData.situacoesLimite ? (
            <>
              <Text style={[styles.reviewLabel, { marginTop: 6, color: colors.textPrimary }]}>Situações-limite:</Text>
              <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.situacoesLimite}</Text>
            </>
          ) : null}
          {wizardData.linguagemPreferida ? (
            <>
              <Text style={[styles.reviewLabel, { marginTop: 6, color: colors.textPrimary }]}>Linguagem preferida:</Text>
              <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.linguagemPreferida}</Text>
            </>
          ) : null}
          {wizardData.exemploAcolhimento ? (
            <>
              <Text style={[styles.reviewLabel, { marginTop: 6, color: colors.textPrimary }]}>Exemplo de acolhimento:</Text>
              <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.exemploAcolhimento}</Text>
            </>
          ) : null}
          {wizardData.exemploLimiteEtico ? (
            <>
              <Text style={[styles.reviewLabel, { marginTop: 6, color: colors.textPrimary }]}>Exemplo de limite ético:</Text>
              <Text style={[styles.reviewItem, { color: colors.textSecondary }]}>{wizardData.exemploLimiteEtico}</Text>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Termos de Uso */}
      <View style={styles.termsContainer}>
        <TouchableOpacity
          style={styles.termsCheckbox}
          onPress={() => setTermsAccepted(!termsAccepted)}
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

      <View style={[styles.aiNote, { backgroundColor: isDark ? colors.surfaceSecondary : '#F0F7FF' }]}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={[styles.aiNoteText, { color: colors.textSecondary }]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Complete seu Cadastro</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Bem-vindo, {invitationData.preFilledData.name}!
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FF' }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Psicólogo</Text>
          </View>
        </View>

        {/* Progress */}
        {renderProgressIndicator()}
        <Text style={[styles.stepTitle, { color: colors.textSecondary, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          Etapa {currentStep + 1} de {TOTAL_STEPS} — {STEP_TITLES[currentStep]}
        </Text>

        {/* Step Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {renderCurrentStep()}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Navigation Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {currentStep > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={[styles.backButtonText, { color: colors.primary }]}>Voltar</Text>
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
              style={[styles.submitButton, (submitting || !termsAccepted) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !termsAccepted}
            >
              <Text style={styles.submitButtonText}>Finalizar Cadastro</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>{loadingMessage}</Text>
            <Text style={[styles.loadingHint, { color: colors.textTertiary }]}>Isso pode levar alguns segundos...</Text>
          </View>
        </View>
      </Modal>

      {/* Modal de documento legal */}
      <Modal
        visible={legalModalVisible}
        animationType="slide"
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={[styles.legalModalContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.legalModalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setLegalModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.legalModalTitle, { color: colors.textPrimary }]}>
              {legalModalType === 'terms' ? 'Termos de Uso' : 'Politica de Privacidade'}
            </Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            <Text style={[styles.legalModalText, { color: colors.textSecondary }]}>
              {legalModalType === 'terms' ? TERMS_OF_USE : PRIVACY_POLICY}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLine: {
    width: 20,
    height: 2,
  },
  progressLineCompleted: {
    backgroundColor: '#50C878',
  },
  stepTitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },

  // Content
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  stepContent: {
    borderRadius: 12,
    padding: 16,
  },

  // Form
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionDivider: {
    height: 1,
    marginVertical: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  charCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
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
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    fontSize: 15,
  },
  dropdownPlaceholder: {
    fontSize: 15,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 15,
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
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },

  // Review
  reviewSection: {
    borderBottomWidth: 1,
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
  },
  reviewEditLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  reviewItem: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  reviewItemLight: {
    fontSize: 13,
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
    marginRight: 6,
    marginBottom: 6,
  },
  reviewChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  aiNoteText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
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
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 10,
    paddingHorizontal: 4,
  },
  termsCheckbox: {
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
  legalModalContainer: {
    flex: 1,
  },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : 14,
  },
  legalModalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  legalModalText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
