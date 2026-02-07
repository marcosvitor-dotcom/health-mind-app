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

export default function AnamneseFormScreen({ navigation, route }: any) {
  const { clientData } = route.params || {};

  const [formData, setFormData] = useState({
    mainComplaint: '',
    medicalHistory: '',
    medications: '',
    allergies: '',
    familyHistory: '',
    lifestyle: '',
    sleepPattern: '',
    previousTreatments: '',
    expectations: '',
    additionalNotes: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = () => {
    Alert.alert(
      'Sucesso!',
      'Ficha de anamnese salva com sucesso!',
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
        title="Ficha de Anamnese"
        subtitle={clientData?.name || 'Novo Paciente'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color="#4A90E2" />
            <Text style={styles.infoText}>
              Preencha as informações abaixo para uma avaliação completa do paciente
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Queixa Principal</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Qual o motivo da consulta? Descreva os principais sintomas ou preocupações..."
            value={formData.mainComplaint}
            onChangeText={(text) => handleInputChange('mainComplaint', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico Médico</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Doenças prévias, cirurgias, hospitalizações..."
            value={formData.medicalHistory}
            onChangeText={(text) => handleInputChange('medicalHistory', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Medicações em Uso</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Liste os medicamentos em uso, dosagens e frequência..."
            value={formData.medications}
            onChangeText={(text) => handleInputChange('medications', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Alergias</Text>
          <TextInput
            style={styles.input}
            placeholder="Alergias a medicamentos, alimentos ou outras substâncias..."
            value={formData.allergies}
            onChangeText={(text) => handleInputChange('allergies', text)}
            multiline
            numberOfLines={2}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico Familiar</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Histórico de transtornos mentais, doenças crônicas na família..."
            value={formData.familyHistory}
            onChangeText={(text) => handleInputChange('familyHistory', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Estilo de Vida</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Rotina diária, trabalho, exercícios físicos, alimentação, uso de álcool/tabaco..."
            value={formData.lifestyle}
            onChangeText={(text) => handleInputChange('lifestyle', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Padrão de Sono</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Qualidade do sono, horas dormidas, dificuldades para dormir..."
            value={formData.sleepPattern}
            onChangeText={(text) => handleInputChange('sleepPattern', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Tratamentos Anteriores</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Psicoterapia anterior, outros tratamentos de saúde mental..."
            value={formData.previousTreatments}
            onChangeText={(text) => handleInputChange('previousTreatments', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Expectativas com o Tratamento</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="O que espera alcançar com a terapia? Objetivos..."
            value={formData.expectations}
            onChangeText={(text) => handleInputChange('expectations', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Observações Adicionais</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Qualquer informação adicional relevante..."
            value={formData.additionalNotes}
            onChangeText={(text) => handleInputChange('additionalNotes', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="save" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>Salvar Anamnese</Text>
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
  infoCard: {
    margin: 16,
    backgroundColor: '#E8F4FD',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  spacer: {
    height: 20,
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
