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
import * as psychologistService from '../../services/psychologistService';
import * as appointmentService from '../../services/appointmentService';
import * as roomService from '../../services/roomService';
import { Room } from '../../services/roomService';
import * as clinicService from '../../services/clinicService';

export default function AppointmentBookingScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
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

  // Recurring appointments
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'weekly' | 'biweekly'>('weekly');
  const [recurringCount, setRecurringCount] = useState<number>(4);

  // Session value (price)
  const [sessionValue, setSessionValue] = useState<string>('');
  const [defaultSessionValue, setDefaultSessionValue] = useState<number>(0);

  // Room selection
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const clinicId = user?.clinicId || '';

  useEffect(() => {
    if (!preSelectedPatient) {
      loadPatients();
    }
    loadDefaultSessionValue();
  }, []);

  const loadDefaultSessionValue = async () => {
    try {
      const psych = await psychologistService.getPsychologist(psychologistId);
      let value = 0;

      if (psych?.useClinicValue && psych?.clinicId) {
        try {
          const clinic = await clinicService.getClinic(
            typeof psych.clinicId === 'string' ? psych.clinicId : psych.clinicId._id
          );
          value = clinic?.paymentSettings?.defaultSessionValue || 0;
        } catch {
          value = psych?.defaultSessionValue || 0;
        }
      } else {
        value = psych?.defaultSessionValue || 0;
      }

      setDefaultSessionValue(value);
      if (value > 0) {
        setSessionValue(value.toFixed(2).replace('.', ','));
      }
    } catch (error) {
      console.error('Erro ao carregar valor padrao da sessao:', error);
    }
  };

  // Recarregar pacientes quando voltar da tela de adicionar paciente
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!preSelectedPatient && route?.params?.refreshPatients) {
        loadPatients();
      }
    });
    return unsubscribe;
  }, [navigation, preSelectedPatient]);

  useEffect(() => {
    if (step === 2 && selectedDate && psychologistId) {
      loadSlots(selectedDate);
    }
  }, [step, selectedDate]);

  useEffect(() => {
    if (step === 3 && appointmentType === 'in_person' && clinicId) {
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
      // Use local timezone offset to ensure the selected time matches what's displayed
      const localDate = new Date(`${selectedDate}T${selectedSlot}:00`);

      // Parse session value
      const parsedSessionValue = sessionValue
        ? parseFloat(sessionValue.replace(',', '.'))
        : undefined;

      if (isRecurring) {
        // Criar múltiplas consultas recorrentes
        const appointmentsToCreate = [];
        const daysToAdd = recurringType === 'weekly' ? 7 : 14;

        for (let i = 0; i < recurringCount; i++) {
          const appointmentDate = new Date(localDate);
          appointmentDate.setDate(appointmentDate.getDate() + (daysToAdd * i));

          appointmentsToCreate.push({
            patientId,
            psychologistId,
            date: appointmentDate.toISOString(),
            type: appointmentType,
            notes: notes.trim() || undefined,
            roomId: selectedRoomId || undefined,
            sessionValue: parsedSessionValue && parsedSessionValue > 0 ? parsedSessionValue : undefined,
          });
        }

        // Criar todas as consultas
        let successCount = 0;
        let failCount = 0;

        for (const appointmentData of appointmentsToCreate) {
          try {
            await appointmentService.createAppointment(appointmentData);
            successCount++;
          } catch (error) {
            console.error('Erro ao criar consulta recorrente:', error);
            failCount++;
          }
        }

        if (successCount > 0) {
          const message = failCount > 0
            ? `${successCount} consulta(s) agendada(s) com sucesso. ${failCount} falhou(aram).`
            : `${successCount} consulta(s) recorrente(s) agendada(s) com sucesso!`;

          Alert.alert('Sucesso', message, [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        } else {
          Alert.alert('Erro', 'Não foi possível agendar as consultas recorrentes');
        }
      } else {
        // Criar apenas uma consulta
        const dateTime = localDate.toISOString();

        await appointmentService.createAppointment({
          patientId,
          psychologistId,
          date: dateTime,
          type: appointmentType,
          notes: notes.trim() || undefined,
          roomId: selectedRoomId || undefined,
          sessionValue: parsedSessionValue && parsedSessionValue > 0 ? parsedSessionValue : undefined,
        });

        Alert.alert('Sucesso', 'Consulta agendada com sucesso!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
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
    <View style={[styles.stepIndicator, { backgroundColor: colors.surface }]}>
      <View style={[styles.stepDot, { backgroundColor: colors.border }, step >= 1 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, { color: colors.textTertiary }, step >= 1 && styles.stepDotTextActive]}>1</Text>
      </View>
      <View style={[styles.stepLine, { backgroundColor: colors.border }, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepDot, { backgroundColor: colors.border }, step >= 2 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, { color: colors.textTertiary }, step >= 2 && styles.stepDotTextActive]}>2</Text>
      </View>
      <View style={[styles.stepLine, { backgroundColor: colors.border }, step >= 3 && styles.stepLineActive]} />
      <View style={[styles.stepDot, { backgroundColor: colors.border }, step >= 3 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, { color: colors.textTertiary }, step >= 3 && styles.stepDotTextActive]}>3</Text>
      </View>
    </View>
  );

  const renderPatientSelection = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Selecione o Paciente</Text>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Buscar paciente..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Botão para convidar novo paciente */}
      <TouchableOpacity
        style={[styles.addNewPatientButton, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}
        onPress={() => {
          navigation.navigate('InvitePatient', {
            fromAppointmentBooking: true,
          });
        }}
      >
        <Ionicons name="person-add" size={22} color="#4A90E2" />
        <Text style={styles.addNewPatientText}>Convidar Novo Paciente</Text>
        <Ionicons name="arrow-forward" size={18} color="#4A90E2" />
      </TouchableOpacity>

      {loadingPatients ? (
        <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.patientList}>
          {filteredPatients.map((patient) => (
            <TouchableOpacity
              key={patient._id || patient.id}
              style={[styles.patientItem, { backgroundColor: colors.surface }]}
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
                <Text style={[styles.patientName, { color: colors.textPrimary }]}>{patient.name}</Text>
                <Text style={[styles.patientEmail, { color: colors.textSecondary }]}>{patient.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
          {filteredPatients.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Nenhum paciente encontrado</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderDateTimeSelection = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Selecione Data e Horário</Text>

      {selectedPatient && (
        <View style={[styles.selectedPatientBanner, { backgroundColor: isDark ? colors.surfaceSecondary : '#E8F4FD' }]}>
          <Ionicons name="person" size={18} color="#4A90E2" />
          <Text style={[styles.selectedPatientText, { color: colors.textPrimary }]}>{selectedPatient.name}</Text>
          {!preSelectedPatient && (
            <TouchableOpacity onPress={() => { setStep(1); setSelectedPatient(null); }}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
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
          backgroundColor: isDark ? colors.surface : '#ffffff',
          calendarBackground: isDark ? colors.surface : '#ffffff',
          selectedDayBackgroundColor: '#4A90E2',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#4A90E2',
          dayTextColor: isDark ? colors.textPrimary : '#2d4150',
          textDisabledColor: isDark ? '#555' : '#d9e1e8',
          arrowColor: '#4A90E2',
          monthTextColor: isDark ? colors.textPrimary : '#2d4150',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
      />

      <Text style={[styles.slotsTitle, { color: colors.textPrimary }]}>
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
                    { backgroundColor: colors.surface },
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
            <Text style={[styles.noSlotsText, { color: colors.textTertiary }]}>Nenhum horário disponível nesta data</Text>
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
    <ScrollView style={styles.stepContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Confirmar Agendamento</Text>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Ionicons name="person-outline" size={22} color="#4A90E2" />
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Paciente</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{selectedPatient?.name}</Text>
          </View>
        </View>

        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Ionicons name="calendar-outline" size={22} color="#4A90E2" />
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
          <Ionicons name="time-outline" size={22} color="#4A90E2" />
          <View style={styles.summaryInfo}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Horário</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{selectedSlot}</Text>
          </View>
        </View>
      </View>

      {/* Valor da Sessao */}
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Valor da Sessao (R$)</Text>
      <View style={[styles.priceInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>R$</Text>
        <TextInput
          style={[styles.priceInput, { color: colors.textPrimary }]}
          placeholder="0,00"
          placeholderTextColor={colors.textTertiary}
          value={sessionValue}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9.,]/g, '');
            setSessionValue(cleaned);
          }}
          keyboardType="decimal-pad"
        />
      </View>
      {defaultSessionValue > 0 && (
        <Text style={[styles.priceHint, { color: colors.textTertiary }]}>
          Valor padrao: R$ {defaultSessionValue.toFixed(2).replace('.', ',')}
        </Text>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tipo de Consulta</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            { backgroundColor: colors.surface },
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
            { backgroundColor: colors.surface },
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

      {/* Room selection for in_person + clinic */}
      {appointmentType === 'in_person' && clinicId && (
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Sala (opcional)</Text>
          {loadingRooms ? (
            <ActivityIndicator size="small" color="#4A90E2" style={{ marginVertical: 12 }} />
          ) : availableRooms.length > 0 ? (
            <>
              <View style={styles.slotsGrid}>
                {availableRooms.map((room) => (
                  <TouchableOpacity
                    key={room._id}
                    style={[
                      styles.slotButton,
                      { backgroundColor: colors.surface },
                      selectedRoomId === room._id && styles.slotButtonSelected,
                    ]}
                    onPress={() => setSelectedRoomId(
                      selectedRoomId === room._id ? null : room._id
                    )}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selectedRoomId === room._id && styles.slotTextSelected,
                      ]}
                    >
                      {room.name}{room.number ? ` #${room.number}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedRoomId && (
                <View style={[styles.roomWarning, { backgroundColor: isDark ? '#3D3020' : '#FFF8E8' }]}>
                  <Ionicons name="information-circle-outline" size={16} color="#E6A000" />
                  <Text style={styles.roomWarningText}>
                    A sala sera enviada como solicitacao. A clinica precisara aprovar.
                  </Text>
                </View>
              )}
              {selectedRoomId && selectedPatient && (() => {
                const room = availableRooms.find(r => r._id === selectedRoomId);
                const isExternal = !selectedPatient.clinicId || selectedPatient.clinicId !== clinicId;
                if (room?.subleasePrice && room.subleasePrice > 0 && isExternal) {
                  return (
                    <View style={[styles.subleaseWarning, { backgroundColor: isDark ? '#3D3020' : '#FFF3E0' }]}>
                      <Ionicons name="cash-outline" size={16} color="#E8A317" />
                      <Text style={styles.subleaseWarningText}>
                        Esta sala tem taxa de sublocacao de R$ {room.subleasePrice.toFixed(2).replace('.', ',')} para pacientes externos a clinica.
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
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
        placeholder="Adicione observações sobre a consulta..."
        placeholderTextColor={colors.textTertiary}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* Consulta Recorrente */}
      <View style={styles.recurringSection}>
        <View style={styles.recurringHeader}>
          <View style={styles.recurringHeaderLeft}>
            <Ionicons name="repeat" size={22} color="#4A90E2" />
            <View style={styles.recurringHeaderText}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 0 }]}>Consulta Recorrente</Text>
              <Text style={[styles.recurringSubtitle, { color: colors.textSecondary }]}>
                Agendar múltiplas consultas
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.recurringToggle, isRecurring && styles.recurringToggleActive]}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View style={[styles.recurringToggleThumb, isRecurring && styles.recurringToggleThumbActive]} />
          </TouchableOpacity>
        </View>

        {isRecurring && (
          <View style={[styles.recurringOptions, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.recurringLabel, { color: colors.textPrimary }]}>Frequência</Text>
            <View style={styles.recurringTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.recurringTypeButton,
                  { backgroundColor: colors.surface },
                  recurringType === 'weekly' && styles.recurringTypeButtonActive,
                ]}
                onPress={() => setRecurringType('weekly')}
              >
                <Ionicons
                  name="calendar"
                  size={18}
                  color={recurringType === 'weekly' ? '#fff' : '#4A90E2'}
                />
                <Text
                  style={[
                    styles.recurringTypeText,
                    recurringType === 'weekly' && styles.recurringTypeTextActive,
                  ]}
                >
                  Semanal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recurringTypeButton,
                  { backgroundColor: colors.surface },
                  recurringType === 'biweekly' && styles.recurringTypeButtonActive,
                ]}
                onPress={() => setRecurringType('biweekly')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={recurringType === 'biweekly' ? '#fff' : '#4A90E2'}
                />
                <Text
                  style={[
                    styles.recurringTypeText,
                    recurringType === 'biweekly' && styles.recurringTypeTextActive,
                  ]}
                >
                  Quinzenal
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.recurringLabel, { color: colors.textPrimary }]}>
              Número de consultas: {recurringCount}
            </Text>
            <View style={styles.recurringCountSelector}>
              <TouchableOpacity
                style={[styles.recurringCountButton, { backgroundColor: colors.surface }]}
                onPress={() => setRecurringCount(Math.max(2, recurringCount - 1))}
              >
                <Ionicons name="remove" size={20} color="#4A90E2" />
              </TouchableOpacity>
              <Text style={[styles.recurringCountText, { color: colors.textPrimary }]}>
                {recurringCount}
              </Text>
              <TouchableOpacity
                style={[styles.recurringCountButton, { backgroundColor: colors.surface }]}
                onPress={() => setRecurringCount(Math.min(12, recurringCount + 1))}
              >
                <Ionicons name="add" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            <View style={[styles.recurringInfo, { backgroundColor: isDark ? '#2D3E4F' : '#E8F4FD' }]}>
              <Ionicons name="information-circle" size={18} color="#4A90E2" />
              <Text style={[styles.recurringInfoText, { color: colors.textPrimary }]}>
                {recurringCount} consulta(s) serão agendadas {recurringType === 'weekly' ? 'semanalmente' : 'quinzenalmente'},{' '}
                sempre {selectedSlot && `às ${selectedSlot} `}
                {recurringType === 'weekly' ? 'toda semana' : 'a cada 15 dias'} no mesmo dia da semana.
              </Text>
            </View>
          </View>
        )}
      </View>

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agendar Consulta</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#4A90E2',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
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
    marginBottom: 16,
  },
  // Patient selection
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  addNewPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  addNewPatientText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
  },
  patientList: {
    flex: 1,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  patientEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  // Selected patient banner
  selectedPatientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  selectedPatientText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  // Slots
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
    borderColor: '#4A90E2',
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
    borderColor: '#4A90E2',
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
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
  },
  priceHint: {
    fontSize: 12,
    marginBottom: 16,
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
  subleaseWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8A317',
  },
  subleaseWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#E8A317',
    fontWeight: '500',
    lineHeight: 18,
  },
  // Recurring appointments
  recurringSection: {
    marginBottom: 20,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recurringHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recurringHeaderText: {
    flex: 1,
  },
  recurringSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  recurringToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    padding: 3,
  },
  recurringToggleActive: {
    backgroundColor: '#4A90E2',
  },
  recurringToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  recurringToggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  recurringOptions: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  recurringLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  recurringTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  recurringTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 6,
  },
  recurringTypeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  recurringTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  recurringTypeTextActive: {
    color: '#fff',
  },
  recurringCountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  recurringCountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  recurringCountText: {
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  recurringInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  recurringInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
