import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Card from '../../components/Card';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export default function AddClientScreen({ navigation }: any) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const [anamneseAttached, setAnamneseAttached] = useState(false);

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAttachAnamnese = () => {
    // Simulação de anexar ficha de anamnese
    Alert.alert(
      'Anexar Ficha de Anamnese',
      'Escolha uma opção:',
      [
        {
          text: 'Preencher agora',
          onPress: () => {
            setAnamneseAttached(true);
            navigation.navigate('AnamneseForm', { clientData: formData });
          },
        },
        {
          text: 'Enviar arquivo',
          onPress: () => {
            // Aqui seria implementado o picker de documentos
            setAnamneseAttached(true);
            Alert.alert('Sucesso', 'Arquivo anexado com sucesso!');
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do paciente');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o email do paciente');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o telefone do paciente');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Aqui você salvaria os dados no backend
    Alert.alert(
      'Sucesso!',
      'Paciente cadastrado com sucesso!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header
        title="Novo Paciente"
        subtitle="Cadastre um novo paciente"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>

          <Text style={styles.label}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome completo"
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="exemplo@email.com"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Telefone *</Text>
          <TextInput
            style={styles.input}
            placeholder="(00) 00000-0000"
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={formData.birthDate}
            onChangeText={(text) => handleInputChange('birthDate', text)}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Endereço</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Rua, número, complemento, bairro, cidade - UF"
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Contato de Emergência</Text>

          <Text style={styles.label}>Nome do Contato</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            value={formData.emergencyContact}
            onChangeText={(text) => handleInputChange('emergencyContact', text)}
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="(00) 00000-0000"
            value={formData.emergencyPhone}
            onChangeText={(text) => handleInputChange('emergencyPhone', text)}
            keyboardType="phone-pad"
          />
        </Card>

        <Card style={styles.section}>
          <View style={styles.anamneseHeader}>
            <View style={styles.anamneseTitleContainer}>
              <Ionicons name="document-text" size={24} color="#4A90E2" />
              <View style={styles.anamneseTextContainer}>
                <Text style={styles.sectionTitle}>Ficha de Anamnese</Text>
                <Text style={styles.anamneseSubtitle}>
                  {anamneseAttached ? 'Anexada' : 'Opcional'}
                </Text>
              </View>
            </View>
            {anamneseAttached && (
              <Ionicons name="checkmark-circle" size={28} color="#50C878" />
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.anamneseButton,
              anamneseAttached && styles.anamneseButtonAttached,
            ]}
            onPress={handleAttachAnamnese}
          >
            <Ionicons
              name={anamneseAttached ? 'create' : 'add-circle'}
              size={20}
              color={anamneseAttached ? '#4A90E2' : '#fff'}
            />
            <Text
              style={[
                styles.anamneseButtonText,
                anamneseAttached && styles.anamneseButtonTextAttached,
              ]}
            >
              {anamneseAttached ? 'Editar Anamnese' : 'Anexar Anamnese'}
            </Text>
          </TouchableOpacity>

          {anamneseAttached && (
            <View style={styles.anamneseInfo}>
              <Ionicons name="information-circle" size={16} color="#666" />
              <Text style={styles.anamneseInfoText}>
                A ficha de anamnese pode ser preenchida ou modificada após o
                cadastro
              </Text>
            </View>
          )}
        </Card>

        <Text style={styles.requiredNote}>* Campos obrigatórios</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>Salvar Paciente</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
    color: '#333',
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  anamneseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  anamneseTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anamneseTextContainer: {
    marginLeft: 12,
  },
  anamneseSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  anamneseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 14,
    borderRadius: 8,
  },
  anamneseButtonAttached: {
    backgroundColor: '#E8F4FD',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  anamneseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  anamneseButtonTextAttached: {
    color: '#4A90E2',
  },
  anamneseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  anamneseInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  requiredNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    marginLeft: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
