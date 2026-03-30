import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoginError } from '../../services/authService';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Digite seu e-mail');
      return;
    }
    if (!password) {
      setPasswordError('Digite sua senha');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      if (error instanceof LoginError) {
        if (error.errorCode === 'EMAIL_NOT_FOUND') {
          setEmailError('E-mail não cadastrado');
        } else if (error.errorCode === 'WRONG_PASSWORD') {
          setPasswordError('Senha incorreta');
        } else if (error.errorCode === 'INCOMPLETE_REGISTRATION') {
          Alert.alert(
            'Cadastro não finalizado',
            'Você foi convidado mas ainda não finalizou seu cadastro. Deseja completar agora?',
            [
              { text: 'Agora não', style: 'cancel' },
              { text: 'Completar cadastro', onPress: () => navigation.navigate('FirstAccess') },
            ]
          );
        } else {
          setEmailError(error.message || 'Erro ao fazer login');
        }
      } else {
        setEmailError(error.message || 'Erro ao conectar com o servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#1A252F' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Plataforma de Saúde Mental</Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: emailError ? '#E53935' : colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={(v) => { setEmail(v); setEmailError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <Text style={[styles.label, { color: colors.textPrimary }]}>Senha</Text>
          <View style={[styles.passwordContainer, { borderColor: passwordError ? '#E53935' : colors.border, backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              style={[styles.passwordInput, { color: colors.textPrimary }]}
              placeholder="********"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={(v) => { setPassword(v); setPasswordError(''); }}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Esqueceu a senha?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.firstAccessButton, { borderColor: isDark ? colors.border : 'rgba(74, 144, 226, 0.3)' }]}
          onPress={() => navigation.navigate('FirstAccess')}
          disabled={loading}
        >
          <Ionicons name="key-outline" size={18} color={colors.primary} />
          <Text style={[styles.firstAccessText, { color: colors.primary }]}>Primeiro acesso? Completar cadastro</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>Health Mind App - Versão 1.0.0</Text>
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
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    opacity: 0.8,
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
  fieldError: {
    color: '#E53935',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
    marginLeft: 2,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  firstAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  firstAccessText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
});
