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
import * as psychologistService from '../../services/psychologistService';
import * as appointmentService from '../../services/appointmentService';

export default function AppointmentBookingScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const preSelectedPatient = route?.params?.patient || null;
  const preSelectedDate = route?.params?.date || null;

  const psychologistId = user?._id || user?.id || '';

  // Steps: 1 = select patient, 2 = select date/time, 3 = confirm
  const [step, setStep] = useState(preSelectedPatient ? 2 : 1);

  // Patient selection
  const [patients, setPatients] = useState<psychologistService.Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(!preSelectedPatient);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<psychologistService.Patient | null>(
    preSelectedPatient
  );

  // Date/time selection
  const [selectedDate, setSelectedDate] = useState(
    preSelectedDate || new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<appointmentService.TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Appointment details
  const [appointmentType, setAppointmentType] = useState<'online' | 'in_person'>('in_person');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!preSelectedPatient) {
      loadPatients();
    }
  }, []);

  useEffect(() => {
    if (step === 2 && selectedDate && psychologistId) {
      loadSlots(selectedDate);
    }
  }, [step, selectedDate]);

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const data = await psychologistService.getMyPatients(psychologistId);
      setPatients(data);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadSlots = async (date: string) => {
    try {
      setLoadingSlots(true);
      setSelectedSlot(null);
      const data = await appointmentService.getAvailableSlots(psychologistId, date);
      setSlots(data.slots || []);
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      // If API doesn't have availability configured, show default slots
      const defaultSlots: appointmentService.TimeSlot[] = [];
      for (let h = 8; h <= 18; h++) {
        defaultSlots.push({ time: `${h.toString().padStart(2, '0')}:00`, available: true });
      }
      setSlots(defaultSlots);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectPatient = (patient: psychologistService.Patient) => {
    setSelectedPatient(patient);
    setStep(2);
  };

  const handleDateSelect = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const handleConfirm = async () => {
    if (!selectedPatient || !selectedSlot) return;

    const patientId = selectedPatient._id || selectedPatient.id;
    if (!patientId) return;

    setCreating(true);
    try {
      const dateTime = `${selectedDate}T${selectedSlot}:00.000Z`;

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

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markedDates: any = {};
  if (selectedDate) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: '#4A90E2',
    };
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
      </View>
      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
      </View>
      <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}>3</Text>
      </View>
    </View>
  );

  const renderPatientSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Selecione o Paciente</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar paciente..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loadingPatients ? (
        <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.patientList}>
          {filteredPatients.map((patient) => (
            <TouchableOpacity
              key={patient._id || patient.id}
              style={styles.patientItem}
              onPress={() => handleSelectPatient(patient)}
            >
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {patient.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientEmail}>{patient.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
          {filteredPatients.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum paciente encontrado</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderDateTimeSelection = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Selecione Data e Horário</Text>

      {selectedPatient && (
        <View style={styles.selectedPatientBanner}>
          <Ionicons name="person" size={18} color="#4A90E2" />
          <Text style={styles.selectedPatientText}>{selectedPatient.name}</Text>
          {!preSelectedPatient && (
            <TouchableOpacity onPress={() => { setStep(1); setSelectedPatient(null); }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <Calendar
        current={selectedDate}
        onDayPress={handleDateSelect}
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
        Horários disponíveis - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
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
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
          <Text style={styles.nextButtonText}>Próximo</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderConfirmation = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Confirmar Agendamento</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="person-outline" size={22} color="#4A90E2" />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Paciente</Text>
            <Text style={styles.summaryValue}>{selectedPatient?.name}</Text>
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
        placeholder="Adicione observações sobre a consulta..."
        placeholderTextColor="#999"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={styles.confirmActions}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(2)}
        >
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

      {renderStepIndicator()}

      {step === 1 && renderPatientSelection()}
      {step === 2 && renderDateTimeSelection()}
      {step === 3 && renderConfirmation()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#4A90E2',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#4A90E2',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  // Patient selection
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  patientList: {
    flex: 1,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  patientEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Selected patient banner
  selectedPatientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  selectedPatientText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  // Slots
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
  // Confirmation
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
