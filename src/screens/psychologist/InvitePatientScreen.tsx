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
import * as authService from '../../services/authService';

interface InvitePatientScreenProps {
  navigation: any;
}

export default function InvitePatientScreen({ navigation }: InvitePatientScreenProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const formatBirthDate = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');

    // Aplica a máscara DD/MM/YYYY
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
      // Converter data de DD/MM/YYYY para YYYY-MM-DD
      let formattedBirthDate = birthDate;
      if (birthDate && birthDate.includes('/')) {
        const [day, month, year] = birthDate.split('/');
        formattedBirthDate = `${year}-${month}-${day}`;
      }

      const invitation = await authService.invitePatient({
        email,
        name,
        phone: phone || undefined,
        birthDate: formattedBirthDate || undefined,
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
});
