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
import { useTheme } from '../../contexts/ThemeContext';
import * as appointmentService from '../../services/appointmentService';
import { getPatient } from '../../services/profileService';
import * as roomService from '../../services/roomService';
import { Room } from '../../services/roomService';

export default function BookAppointmentScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
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

  // Room selection
  const [clinicId, setClinicId] = useState<string>('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

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
      if (patientData.clinicId) {
        const cId = typeof patientData.clinicId === 'object' ? patientData.clinicId._id : patientData.clinicId;
        setClinicId(cId);
      }
    } catch (error) {
      console.error('Erro ao carregar psicólogo:', error);
    } finally {
      setLoadingPsychologist(false);
    }
  };

  useEffect(() => {
    if (step === 'confirm' && appointmentType === 'in_person' && clinicId) {
      loadAvailableRooms();
    }
    if (appointmentType === 'online') {
      setSelectedRoomId(null);
    }
  }, [step, appointmentType]);

  const loadAvailableRooms = async () => {
    if (!clinicId) return;
    setLoadingRooms(true);
    try {
      const rooms = await roomService.getRooms(clinicId);
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Erro ao carregar salas:', error);
    } finally {
      setLoadingRooms(false);
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
        roomId: selectedRoomId || undefined,
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
      selectedColor: colors.primary,
    };
  }

  if (loadingPsychologist) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!psychologistId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agendar Consulta</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Psicólogo não encontrado</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Você precisa estar vinculado a um psicólogo para agendar consultas.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderDateSelection = () => (
    <ScrollView style={styles.content}>
      <View style={[styles.psychologistBanner, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8FFF0' }]}>
        <Ionicons name="medical" size={20} color="#50C878" />
        <Text style={[styles.psychologistText, { color: colors.textPrimary }]}>{psychologistName}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Selecione a Data</Text>

      <Calendar
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        minDate={new Date().toISOString().split('T')[0]}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.surface,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: colors.primary,
          dayTextColor: isDark ? colors.textPrimary : '#2d4150',
          textDisabledColor: isDark ? colors.textTertiary : '#d9e1e8',
          arrowColor: colors.primary,
          monthTextColor: isDark ? colors.textPrimary : '#2d4150',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
      />

      <Text style={[styles.slotsTitle, { color: colors.textPrimary }]}>
        Horários - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
      </Text>

      {loadingSlots ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
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
                    { borderColor: colors.primary, backgroundColor: colors.surface },
                    selectedSlot === slot.time && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedSlot(slot.time)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      { color: colors.primary },
                      selectedSlot === slot.time && styles.slotTextSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              ))
          ) : (
            <Text style={[styles.noSlotsText, { color: colors.textTertiary }]}>Nenhum horário disponível nesta data</Text>
          )}
        </View>
      )}

      {selectedSlot && (
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={() => setStep('confirm')}>
          <Text style={styles.nextButtonText}>Próximo</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderConfirmation = () => (
    <ScrollView style={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Confirmar Agendamento</Text>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Ionicons name="medical-outline" size={22} color={colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Psicólogo</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{psychologistName}</Text>
          </View>
        </View>

        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Data</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Ionicons name="time-outline" size={22} color={colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Horário</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{selectedSlot}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tipo de Consulta</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            { borderColor: colors.primary, backgroundColor: colors.surface },
            appointmentType === 'in_person' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setAppointmentType('in_person')}
        >
          <Ionicons
            name="business"
            size={20}
            color={appointmentType === 'in_person' ? '#fff' : colors.primary}
          />
          <Text
            style={[
              styles.typeOptionText,
              { color: colors.primary },
              appointmentType === 'in_person' && styles.typeOptionTextSelected,
            ]}
          >
            Presencial
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeOption,
            { borderColor: colors.primary, backgroundColor: colors.surface },
            appointmentType === 'online' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setAppointmentType('online')}
        >
          <Ionicons
            name="videocam"
            size={20}
            color={appointmentType === 'online' ? '#fff' : colors.primary}
          />
          <Text
            style={[
              styles.typeOptionText,
              { color: colors.primary },
              appointmentType === 'online' && styles.typeOptionTextSelected,
            ]}
          >
            Online
          </Text>
        </TouchableOpacity>
      </View>

      {/* Room selection for in_person + clinic */}
      {appointmentType === 'in_person' && clinicId && (
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Sala (opcional)</Text>
          {loadingRooms ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : availableRooms.length > 0 ? (
            <>
              <View style={styles.slotsGrid}>
                {availableRooms.map((room) => (
                  <TouchableOpacity
                    key={room._id}
                    style={[
                      styles.slotButton,
                      { borderColor: colors.primary, backgroundColor: colors.surface },
                      selectedRoomId === room._id && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSelectedRoomId(
                      selectedRoomId === room._id ? null : room._id
                    )}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        { color: colors.primary },
                        selectedRoomId === room._id && styles.slotTextSelected,
                      ]}
                    >
                      {room.name}{room.number ? ` #${room.number}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedRoomId && (
                <View style={[styles.roomWarning, { backgroundColor: isDark ? colors.surfaceSecondary : '#FFF8E8' }]}>
                  <Ionicons name="information-circle-outline" size={16} color="#E6A000" />
                  <Text style={styles.roomWarningText}>
                    A sala sera enviada como solicitacao. A clinica precisara aprovar.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>
              Nenhuma sala disponivel na clinica
            </Text>
          )}
        </View>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Observações (opcional)</Text>
      <TextInput
        style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        placeholder="Adicione observações..."
        placeholderTextColor={colors.textTertiary}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={styles.confirmActions}>
        <TouchableOpacity style={[styles.backButton, { borderColor: colors.primary }]} onPress={() => setStep('date')}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Voltar</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agendar Consulta</Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  psychologistText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  slotTextSelected: {
    color: '#fff',
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  summaryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    gap: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  notesInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
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
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  roomWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  roomWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#E6A000',
    lineHeight: 18,
  },
});
