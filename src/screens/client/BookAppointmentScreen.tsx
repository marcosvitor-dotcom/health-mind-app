import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as appointmentService from '../../services/appointmentService';
import { getPatient } from '../../services/profileService';

export default function BookAppointmentScreen({ navigation }: any) {
  const { user } = useAuth();
  const patientId = user?._id || user?.id || '';

  const [step, setStep] = useState<'date' | 'confirm'>('date');
  const [psychologistId, setPsychologistId] = useState<string>('');
  const [psychologistName, setPsychologistName] = useState<string>('');
  const [loadingPsychologist, setLoadingPsychologist] = useState(true);

  // Date/time
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<appointmentService.TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Details
  const [appointmentType, setAppointmentType] = useState<'online' | 'in_person'>('in_person');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPsychologistInfo();
  }, []);

  useEffect(() => {
    if (psychologistId && selectedDate) {
      loadSlots(selectedDate);
    }
  }, [psychologistId, selectedDate]);

  const loadPsychologistInfo = async () => {
    try {
      setLoadingPsychologist(true);
      const patientData = await getPatient(patientId);
      if (patientData.psychologistId && typeof patientData.psychologistId === 'object') {
        setPsychologistId(patientData.psychologistId._id);
        setPsychologistName(patientData.psychologistId.name);
      }
    } catch (error) {
      console.error('Erro ao carregar psicólogo:', error);
    } finally {
      setLoadingPsychologist(false);
    }
  };

  const loadSlots = async (date: string) => {
    if (!psychologistId) return;
    try {
      setLoadingSlots(true);
      setSelectedSlot(null);
      const data = await appointmentService.getAvailableSlots(psychologistId, date);
      setSlots(data.slots || []);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      const defaultSlots: appointmentService.TimeSlot[] = [];
      for (let h = 8; h <= 18; h++) {
        defaultSlots.push({ time: `${h.toString().padStart(2, '0')}:00`, available: true });
      }
      setSlots(defaultSlots);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !psychologistId) return;

    setCreating(true);
    try {
      // Use local timezone offset to ensure the selected time matches what's displayed
      const localDate = new Date(`${selectedDate}T${selectedSlot}:00`);
      const dateTime = localDate.toISOString();

      await appointmentService.createAppointment({
        patientId,
        psychologistId,
        date: dateTime,
        type: appointmentType,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Sucesso', 'Consulta agendada com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível agendar a consulta');
    } finally {
      setCreating(false);
    }
  };

  const markedDates: any = {};
  if (selectedDate) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: '#4A90E2',
    };
  }

  if (loadingPsychologist) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!psychologistId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agendar Consulta</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Psicólogo não encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Você precisa estar vinculado a um psicólogo para agendar consultas.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderDateSelection = () => (
    <ScrollView style={styles.content}>
      <View style={styles.psychologistBanner}>
        <Ionicons name="medical" size={20} color="#50C878" />
        <Text style={styles.psychologistText}>{psychologistName}</Text>
      </View>

      <Text style={styles.sectionTitle}>Selecione a Data</Text>

      <Calendar
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        minDate={new Date().toISOString().split('T')[0]}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          selectedDayBackgroundColor: '#4A90E2',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#4A90E2',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          arrowColor: '#4A90E2',
          monthTextColor: '#2d4150',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
      />

      <Text style={styles.slotsTitle}>
        Horários - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
      </Text>

      {loadingSlots ? (
        <ActivityIndicator size="small" color="#4A90E2" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.slotsGrid}>
          {slots.filter((s) => s.available).length > 0 ? (
            slots
              .filter((s) => s.available)
              .map((slot) => (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.slotButton,
                    selectedSlot === slot.time && styles.slotButtonSelected,
                  ]}
                  onPress={() => setSelectedSlot(slot.time)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      selectedSlot === slot.time && styles.slotTextSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              ))
          ) : (
            <Text style={styles.noSlotsText}>Nenhum horário disponível nesta data</Text>
          )}
        </View>
      )}

      {selectedSlot && (
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep('confirm')}>
          <Text style={styles.nextButtonText}>Próximo</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderConfirmation = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Confirmar Agendamento</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="medical-outline" size={22} color="#4A90E2" />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Psicólogo</Text>
            <Text style={styles.summaryValue}>{psychologistName}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Ionicons name="calendar-outline" size={22} color="#4A90E2" />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Data</Text>
            <Text style={styles.summaryValue}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Ionicons name="time-outline" size={22} color="#4A90E2" />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Horário</Text>
            <Text style={styles.summaryValue}>{selectedSlot}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.fieldLabel}>Tipo de Consulta</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            appointmentType === 'in_person' && styles.typeOptionSelected,
          ]}
          onPress={() => setAppointmentType('in_person')}
        >
          <Ionicons
            name="business"
            size={20}
            color={appointmentType === 'in_person' ? '#fff' : '#4A90E2'}
          />
          <Text
            style={[
              styles.typeOptionText,
              appointmentType === 'in_person' && styles.typeOptionTextSelected,
            ]}
          >
            Presencial
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeOption,
            appointmentType === 'online' && styles.typeOptionSelected,
          ]}
          onPress={() => setAppointmentType('online')}
        >
          <Ionicons
            name="videocam"
            size={20}
            color={appointmentType === 'online' ? '#fff' : '#4A90E2'}
          />
          <Text
            style={[
              styles.typeOptionText,
              appointmentType === 'online' && styles.typeOptionTextSelected,
            ]}
          >
            Online
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>Observações (opcional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Adicione observações..."
        placeholderTextColor="#999"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={styles.confirmActions}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('date')}>
          <Ionicons name="arrow-back" size={20} color="#4A90E2" />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, creating && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agendar Consulta</Text>
        <View style={{ width: 24 }} />
      </View>

      {step === 'date' && renderDateSelection()}
      {step === 'confirm' && renderConfirmation()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  psychologistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FFF0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  psychologistText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  slotButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    backgroundColor: '#fff',
  },
  slotButtonSelected: {
    backgroundColor: '#4A90E2',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  slotTextSelected: {
    color: '#fff',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    backgroundColor: '#fff',
    gap: 8,
  },
  typeOptionSelected: {
    backgroundColor: '#4A90E2',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#50C878',
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
