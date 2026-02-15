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
import { useTheme } from '../../contexts/ThemeContext';

export default function AnamneseFormScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();

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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header
        title="Ficha de Anamnese"
        subtitle={clientData?.name || 'Novo Paciente'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={[styles.infoCard, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color="#4A90E2" />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Preencha as informações abaixo para uma avaliação completa do paciente
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Queixa Principal</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Qual o motivo da consulta? Descreva os principais sintomas ou preocupações..."
            placeholderTextColor={colors.textTertiary}
            value={formData.mainComplaint}
            onChangeText={(text) => handleInputChange('mainComplaint', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Histórico Médico</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Doenças prévias, cirurgias, hospitalizações..."
            placeholderTextColor={colors.textTertiary}
            value={formData.medicalHistory}
            onChangeText={(text) => handleInputChange('medicalHistory', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Medicações em Uso</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Liste os medicamentos em uso, dosagens e frequência..."
            placeholderTextColor={colors.textTertiary}
            value={formData.medications}
            onChangeText={(text) => handleInputChange('medications', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Alergias</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Alergias a medicamentos, alimentos ou outras substâncias..."
            placeholderTextColor={colors.textTertiary}
            value={formData.allergies}
            onChangeText={(text) => handleInputChange('allergies', text)}
            multiline
            numberOfLines={2}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Histórico Familiar</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Histórico de transtornos mentais, doenças crônicas na família..."
            placeholderTextColor={colors.textTertiary}
            value={formData.familyHistory}
            onChangeText={(text) => handleInputChange('familyHistory', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Estilo de Vida</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Rotina diária, trabalho, exercícios físicos, alimentação, uso de álcool/tabaco..."
            placeholderTextColor={colors.textTertiary}
            value={formData.lifestyle}
            onChangeText={(text) => handleInputChange('lifestyle', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Padrão de Sono</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Qualidade do sono, horas dormidas, dificuldades para dormir..."
            placeholderTextColor={colors.textTertiary}
            value={formData.sleepPattern}
            onChangeText={(text) => handleInputChange('sleepPattern', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tratamentos Anteriores</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Psicoterapia anterior, outros tratamentos de saúde mental..."
            placeholderTextColor={colors.textTertiary}
            value={formData.previousTreatments}
            onChangeText={(text) => handleInputChange('previousTreatments', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expectativas com o Tratamento</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="O que espera alcançar com a terapia? Objetivos..."
            placeholderTextColor={colors.textTertiary}
            value={formData.expectations}
            onChangeText={(text) => handleInputChange('expectations', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Observações Adicionais</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            placeholder="Qualquer informação adicional relevante..."
            placeholderTextColor={colors.textTertiary}
            value={formData.additionalNotes}
            onChangeText={(text) => handleInputChange('additionalNotes', text)}
            multiline
            numberOfLines={4}
          />
        </Card>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
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
  },
  content: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
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
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
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
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
