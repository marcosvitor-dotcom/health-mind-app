import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import * as authService from '../../services/authService';

type Step = 'email' | 'sent' | 'reset' | 'done';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();

  // Se vier com token via deep link, já começa no step de reset
  const initialToken = route.params?.token || '';
  const [step, setStep] = useState<Step>(initialToken ? 'reset' : 'email');

  const [email, setEmail] = useState('');
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Step 1: Enviar e-mail ─────────────────────────────────────────────────

  const handleSendEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Digite seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setStep('sent');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível processar a solicitação.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Redefinir senha ───────────────────────────────────────────────

  const handleResetPassword = async () => {
    if (!token.trim()) {
      Alert.alert('Atenção', 'Token inválido.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), password);
      setStep('done');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Token inválido ou expirado. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (step) {

      // Step 1 — Digitar e-mail
      case 'email':
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-open-outline" size={40} color="#4A90E2" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Esqueceu a senha?</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Digite o e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </Text>

            <Text style={[styles.label, { color: colors.textPrimary }]}>E-mail</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enviar link de redefinição</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={[styles.backLinkText, { color: colors.primary }]}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        );

      // Step 2 — E-mail enviado
      case 'sent':
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F8EF' }]}>
              <Ionicons name="mail-outline" size={40} color="#50C878" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>E-mail enviado!</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Se o e-mail <Text style={{ fontWeight: '700' }}>{email}</Text> estiver cadastrado, você receberá as instruções em breve.{'\n\n'}
              Verifique sua caixa de entrada (e também a pasta de spam).
            </Text>

            <View style={[styles.infoBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#FFF8DC', borderColor: '#E8D44D' }]}>
              <Ionicons name="time-outline" size={16} color="#7A6000" />
              <Text style={[styles.infoText, { color: '#7A6000' }]}>O link expira em 1 hora.</Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep('reset')}
            >
              <Text style={styles.buttonText}>Já tenho o link → Redefinir senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => { setStep('email'); setEmail(''); }}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Tentar outro e-mail</Text>
            </TouchableOpacity>
          </View>
        );

      // Step 3 — Nova senha
      case 'reset':
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={40} color="#4A90E2" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Nova senha</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Crie uma nova senha para sua conta.
            </Text>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Nova senha</Text>
            <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Confirmar nova senha</Text>
            <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                placeholder="Repita a senha"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Redefinir senha</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={[styles.backLinkText, { color: colors.primary }]}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        );

      // Step 4 — Sucesso
      case 'done':
        return (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F8EF' }]}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#50C878" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Senha redefinida!</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Sua senha foi alterada com sucesso. Faça login com a nova senha.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Ir para o login</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#1A252F' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Health Mind</Text>
        </View>

        {renderContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 90, height: 90, borderRadius: 20, overflow: 'hidden' },
  appName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 10, opacity: 0.9 },

  card: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F4FD',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  cardSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
  },
  passwordInput: { flex: 1, padding: 13, paddingRight: 48, fontSize: 16 },
  eyeButton: { position: 'absolute', right: 12, top: 12, padding: 4 },

  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '500' },

  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 4,
  },
  backLinkText: { fontSize: 14, fontWeight: '500' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  infoText: { fontSize: 13 },
});
