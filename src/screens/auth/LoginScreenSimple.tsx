import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { UserRole } from '../../types';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await login(email, password, selectedRole);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Health Mind</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Cuidando da sua mente</Text>
      </View>

      <View style={[styles.form, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Tipo de Acesso</Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={selectedRole === 'client'
              ? [styles.roleButtonActive]
              : [styles.roleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setSelectedRole('client')}
          >
            <Text style={selectedRole === 'client'
              ? styles.roleButtonTextActive
              : [styles.roleButtonText, { color: colors.textSecondary }]}>
              Cliente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={selectedRole === 'psychologist'
              ? [styles.roleButtonActive]
              : [styles.roleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setSelectedRole('psychologist')}
          >
            <Text style={selectedRole === 'psychologist'
              ? styles.roleButtonTextActive
              : [styles.roleButtonText, { color: colors.textSecondary }]}>
              Psicólogo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={selectedRole === 'clinic'
              ? [styles.roleButtonActive]
              : [styles.roleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setSelectedRole('clinic')}
          >
            <Text style={selectedRole === 'clinic'
              ? styles.roleButtonTextActive
              : [styles.roleButtonText, { color: colors.textSecondary }]}>
              Clínica
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
          placeholder="seu@email.com"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[styles.label, { color: colors.textPrimary }]}>Senha</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
          placeholder="********"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>Versão 1.0.0 - Demo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  roleButtonActive: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleButtonTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
});
