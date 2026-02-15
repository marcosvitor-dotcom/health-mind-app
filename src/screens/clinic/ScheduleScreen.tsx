import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicPsychologist, ClinicAppointment, PatientBasic } from '../../services/clinicService';

interface AppointmentsByDate {
  [date: string]: ClinicAppointment[];
}

// Horários do dia para visualização diária
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 às 20:00

// Tipos de consulta (devem corresponder aos valores do backend)
const APPOINTMENT_TYPES = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'Presencial' },
];

// Helper para extrair ID de objetos MongoDB
const extractId = (idField: any): string | null => {
  if (!idField) return null;
  if (typeof idField === 'string') return idField;
  if (typeof idField === 'object') {
    if (idField.$oid) return idField.$oid;
    if (idField._id) return idField._id;
    if (idField.id) return idField.id;
  }
  return null;
};

export default function ScheduleScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [psychologists, setPsychologists] = useState<ClinicPsychologist[]>([]);
  const [appointments, setAppointments] = useState<AppointmentsByDate>({});
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedPsychologists, setSelectedPsychologists] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ClinicAppointment | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Campos de edição
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPsychologistId, setEditPsychologistId] = useState('');

  // Modal de paciente
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientData, setPatientData] = useState<PatientBasic | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Carregar psicólogos
  const loadPsychologists = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await clinicService.getClinicPsychologists(user.id);
      setPsychologists(data);
      setSelectedPsychologists(data.map((p) => p._id || p.id));
    } catch (err) {
      console.error('Erro ao carregar psicólogos:', err);
    }
  }, [user?.id]);

  // Carregar agendamentos
  const loadAppointments = useCallback(async () => {
    if (!user?.id || psychologists.length === 0) return;

    try {
      setError(null);
      const allAppointments: AppointmentsByDate = {};

      const psychsToLoad = selectedPsychologists.length > 0
        ? psychologists.filter((p) => selectedPsychologists.includes(p._id || p.id))
        : psychologists;

      const promises = psychsToLoad.map(async (psy) => {
        const psyId = psy._id || psy.id;
        const psyAppointments = await clinicService.getPsychologistAppointments(psyId);
        return { psychologist: psy, appointments: psyAppointments };
      });

      const results = await Promise.all(promises.map((p) => p.catch(() => null)));

      const allAppts: ClinicAppointment[] = [];

      results.forEach((result) => {
        if (!result) return;
        const { psychologist, appointments: psyAppts } = result;

        psyAppts.forEach((appt: any) => {
          const appointmentWithPsy = {
            ...appt,
            psychologist: appt.psychologist || { _id: psychologist._id, id: psychologist.id, name: psychologist.name },
          };
          allAppts.push(appointmentWithPsy);
        });
      });

      const enrichedAppts = await clinicService.enrichAppointmentsWithPatients(allAppts);

      enrichedAppts.forEach((appt) => {
        const dateStr = getAppointmentDate(appt);
        if (!dateStr) return;

        if (!allAppointments[dateStr]) {
          allAppointments[dateStr] = [];
        }
        allAppointments[dateStr].push(appt);
      });

      Object.keys(allAppointments).forEach((date) => {
        allAppointments[date].sort((a, b) => {
          const timeA = getAppointmentTime(a);
          const timeB = getAppointmentTime(b);
          return timeA.localeCompare(timeB);
        });
      });

      setAppointments(allAppointments);
    } catch (err: any) {
      console.error('Erro ao carregar agenda:', err);
      setError(err.message || 'Erro ao carregar agenda');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, psychologists, selectedPsychologists]);

  useEffect(() => {
    loadPsychologists();
  }, [loadPsychologists]);

  useEffect(() => {
    if (psychologists.length > 0) {
      loadAppointments();
    }
  }, [psychologists, loadAppointments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAppointments();
  }, [loadAppointments]);

  // Helpers
  const getAppointmentDate = (appointment: any): string => {
    const dateTime = appointment.dateTime || appointment.date || appointment.startTime;
    if (!dateTime) return '';
    return new Date(dateTime).toISOString().split('T')[0];
  };

  const getAppointmentTime = (appointment: any): string => {
    if (appointment.time) return appointment.time;
    const dateTime = appointment.dateTime || appointment.date || appointment.startTime;
    if (!dateTime) return '--:--';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getAppointmentHour = (appointment: any): number => {
    const time = getAppointmentTime(appointment);
    const [hours] = time.split(':').map(Number);
    return hours || 0;
  };

  const getPsychologistName = (appointment: any): string => {
    return appointment.psychologist?.name || 'N/A';
  };

  const getPatientName = (appointment: any): string => {
    return appointment.patient?.name || 'N/A';
  };

  const getPatientId = (appointment: any): string | null => {
    const fromPatient = extractId(appointment.patient?._id) || extractId(appointment.patient?.id);
    const fromPatientId = extractId(appointment.patientId);
    return fromPatient || fromPatientId || null;
  };

  const getAppointmentId = (appointment: any): string | null => {
    return extractId(appointment._id) || extractId(appointment.id) || null;
  };

  const getPsychologistId = (appointment: any): string | null => {
    const fromPsy = extractId(appointment.psychologist?._id) || extractId(appointment.psychologist?.id);
    const fromPsyId = extractId(appointment.psychologistId);
    return fromPsy || fromPsyId || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#50C878';
      case 'awaiting_patient':
        return '#FFB347';
      case 'awaiting_psychologist':
        return '#9B59B6';
      case 'scheduled':
      case 'pending':
        return '#FFB347';
      case 'cancelled':
        return '#FF6B6B';
      case 'completed':
        return '#4A90E2';
      case 'no_show':
        return '#999';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'awaiting_patient':
        return 'Aguardando Paciente';
      case 'awaiting_psychologist':
        return 'Aguardando Psicólogo';
      case 'scheduled':
        return 'Agendada';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Concluída';
      case 'no_show':
        return 'Não compareceu';
      default:
        return status;
    }
  };

  const getAppointmentTypeLabel = (type?: string) => {
    if (!type) return 'Consulta';
    switch (type) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'Presencial';
      case 'presencial': // Fallback para dados antigos
        return 'Presencial';
      case 'regular':
        return 'Consulta Regular';
      case 'first':
        return 'Primeira Consulta';
      case 'couple':
        return 'Terapia de Casal';
      case 'emergency':
        return 'Emergência';
      case 'return':
        return 'Retorno';
      default:
        return type;
    }
  };

  // Toggle psicólogo
  const togglePsychologist = (psyId: string) => {
    setSelectedPsychologists((prev) => {
      if (prev.includes(psyId)) {
        return prev.filter((id) => id !== psyId);
      }
      return [...prev, psyId];
    });
  };

  const selectAllPsychologists = () => {
    setSelectedPsychologists(psychologists.map((p) => p._id || p.id));
  };

  const clearPsychologistSelection = () => {
    setSelectedPsychologists([]);
  };

  // Ver paciente - abrir modal
  const handleViewPatient = async (appointment: ClinicAppointment) => {
    const patientId = getPatientId(appointment);

    if (!patientId) {
      Alert.alert('Erro', 'Não foi possível encontrar os dados do paciente.');
      return;
    }

    setLoadingPatient(true);
    setShowPatientModal(true);

    try {
      const patient = await clinicService.getPatient(patientId);
      if (patient) {
        setPatientData(patient);
      } else {
        // Usa os dados que já temos
        setPatientData({
          _id: patientId,
          name: getPatientName(appointment),
          email: undefined,
          phone: undefined,
        });
      }
    } catch (err) {
      setPatientData({
        _id: patientId,
        name: getPatientName(appointment),
        email: undefined,
        phone: undefined,
      });
    } finally {
      setLoadingPatient(false);
    }
  };

  // Abrir WhatsApp
  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não disponível.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=55${cleanPhone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  // Ligar
  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('Erro', 'Telefone não disponível.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  // Editar agendamento - abrir modal
  const handleEditAppointment = (appointment: ClinicAppointment) => {
    setSelectedAppointment(appointment);

    // Preenche os campos de edição
    setEditDate(getAppointmentDate(appointment));
    setEditTime(getAppointmentTime(appointment));
    setEditType(appointment.type || 'in_person'); // Padrão: in_person (presencial)
    setEditNotes(appointment.notes || '');
    setEditPsychologistId(getPsychologistId(appointment) || '');

    setShowEditModal(true);
  };

  // Abrir modal de reagendamento
  const handleOpenReschedule = () => {
    setShowRescheduleModal(true);
  };

  // Salvar edições
  const handleSaveEdit = async () => {
    if (!selectedAppointment) return;

    const appointmentId = getAppointmentId(selectedAppointment);
    if (!appointmentId) {
      Alert.alert('Erro', 'ID do agendamento não encontrado.');
      return;
    }

    if (!editDate || !editTime) {
      Alert.alert('Erro', 'Por favor, preencha a data e hora.');
      return;
    }

    setIsSaving(true);

    try {
      const [hours, minutes] = editTime.split(':');
      const dateTime = new Date(`${editDate}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);

      // Verifica se a data é válida
      if (isNaN(dateTime.getTime())) {
        Alert.alert('Erro', 'Data ou hora inválida. Por favor, verifique os valores.');
        return;
      }

      // IMPORTANTE: O backend espera 'date' (não 'dateTime')
      const updateData: any = {};

      // Verifica se a data/hora mudou
      const originalDate = getAppointmentDate(selectedAppointment);
      const originalTime = getAppointmentTime(selectedAppointment);
      const originalDateTime = new Date(`${originalDate}T${originalTime}:00`);

      const dateChanged = Math.abs(dateTime.getTime() - originalDateTime.getTime()) > 60000; // Diferença maior que 1 minuto

      if (dateChanged) {
        // Valida que a data está no futuro (backend requer isso)
        if (dateTime <= new Date()) {
          Alert.alert(
            'Data Inválida',
            'A data do agendamento deve ser no futuro. Por favor, escolha uma data e hora posteriores ao momento atual.',
            [{ text: 'OK' }]
          );
          return;
        }
        updateData.date = dateTime.toISOString();
      }

      // Adiciona apenas os campos que foram modificados ou têm valor
      if (editType && editType !== selectedAppointment.type) {
        updateData.type = editType;
      }

      if (editNotes !== undefined && editNotes !== selectedAppointment.notes) {
        updateData.notes = editNotes;
      }

      // Se mudou o psicólogo
      if (editPsychologistId && editPsychologistId !== getPsychologistId(selectedAppointment)) {
        updateData.psychologistId = editPsychologistId;
      }

      // Se nenhum campo foi alterado, não faz nada
      if (Object.keys(updateData).length === 0) {
        Alert.alert('Aviso', 'Nenhuma alteração foi detectada.');
        return;
      }

      console.log('Dados de atualização:', JSON.stringify({
        appointmentId,
        updateData,
        original: {
          date: getAppointmentDate(selectedAppointment),
          time: getAppointmentTime(selectedAppointment),
          psychologist: getPsychologistId(selectedAppointment),
          type: selectedAppointment.type,
        },
      }, null, 2));

      await clinicService.updateAppointment(appointmentId, updateData);

      Alert.alert('Sucesso', 'Agendamento atualizado com sucesso!');
      setShowRescheduleModal(false);
      setShowEditModal(false);
      setSelectedAppointment(null);

      setLoading(true);
      loadAppointments();
    } catch (err: any) {
      console.error('Erro ao atualizar:', err);
      if (err.response?.status === 403) {
        Alert.alert(
          'Permissão Negada',
          'A clínica não possui permissão para modificar agendamentos diretamente.\n\n' +
          'Para fazer alterações neste agendamento, entre em contato com o psicólogo responsável:\n' +
          `Dr(a). ${getPsychologistName(selectedAppointment)}\n\n` +
          'Alterações em agendamentos devem ser realizadas pelo profissional que criou a consulta.',
          [{ text: 'Entendi', style: 'cancel' }]
        );
      } else if (err.response?.status === 404) {
        Alert.alert(
          'Agendamento não encontrado',
          'Este agendamento pode ter sido removido ou não está mais disponível.',
          [{ text: 'OK' }]
        );
      } else if (err.response?.status === 409) {
        const errorData = err.response?.data;
        const errorMessage = errorData?.message || errorData?.error || '';

        console.log('Detalhes do erro 409:', JSON.stringify(errorData, null, 2));

        let displayMessage = errorMessage;

        // Se não houver mensagem específica, monta uma genérica
        if (!displayMessage) {
          displayMessage =
            'Não foi possível atualizar o agendamento devido a um conflito.\n\n' +
            'Possíveis causas:\n' +
            '• O horário já está ocupado por outro agendamento\n' +
            '• Conflito com disponibilidade do psicólogo\n' +
            '• O agendamento foi modificado recentemente\n\n' +
            'Tente recarregar a agenda e verificar os horários disponíveis.';
        }

        Alert.alert('Conflito de Agendamento', displayMessage, [
          { text: 'Recarregar Agenda', onPress: () => { setLoading(true); loadAppointments(); } },
          { text: 'OK', style: 'cancel' }
        ]);
      } else {
        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
        console.log('Erro completo:', JSON.stringify(err.response?.data, null, 2));
        Alert.alert('Erro', errorMessage || 'Não foi possível atualizar o agendamento.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Cancelar agendamento
  const handleCancelAppointment = () => {
    if (!selectedAppointment) return;

    const appointmentId = getAppointmentId(selectedAppointment);
    if (!appointmentId) {
      Alert.alert('Erro', 'ID do agendamento não encontrado.');
      return;
    }

    Alert.alert(
      'Cancelar Agendamento',
      `Deseja realmente cancelar este agendamento?\n\nPaciente: ${getPatientName(selectedAppointment)}\nData: ${new Date(getAppointmentDate(selectedAppointment) + 'T00:00:00').toLocaleDateString('pt-BR')}\nHorário: ${getAppointmentTime(selectedAppointment)}`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await clinicService.cancelAppointment(appointmentId);
              Alert.alert('Sucesso', 'Agendamento cancelado com sucesso!');
              setShowEditModal(false);
              setSelectedAppointment(null);

              setLoading(true);
              loadAppointments();
            } catch (err: any) {
              if (err.response?.status === 403) {
                Alert.alert(
                  'Permissão Negada',
                  'A clínica não possui permissão para cancelar agendamentos diretamente.\n\n' +
                  'Para cancelar este agendamento, entre em contato com o psicólogo responsável:\n' +
                  `Dr(a). ${getPsychologistName(selectedAppointment)}\n\n` +
                  'Cancelamentos devem ser realizados pelo profissional que criou a consulta.',
                  [{ text: 'Entendi', style: 'cancel' }]
                );
              } else {
                Alert.alert('Erro', err.message || 'Não foi possível cancelar o agendamento.');
              }
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  // Confirmar agendamento
  const handleConfirmAppointment = async () => {
    if (!selectedAppointment) return;

    const appointmentId = getAppointmentId(selectedAppointment);
    if (!appointmentId) {
      Alert.alert('Erro', 'ID do agendamento não encontrado.');
      return;
    }

    setIsSaving(true);

    try {
      await clinicService.updateAppointment(appointmentId, {
        status: 'confirmed',
      });

      Alert.alert('Sucesso', 'Agendamento confirmado!');
      setShowEditModal(false);
      setSelectedAppointment(null);

      setLoading(true);
      loadAppointments();
    } catch (err: any) {
      if (err.response?.status === 403) {
        Alert.alert(
          'Permissão Negada',
          'A clínica não possui permissão para confirmar agendamentos diretamente.\n\n' +
          'Para confirmar este agendamento, entre em contato com o psicólogo responsável:\n' +
          `Dr(a). ${getPsychologistName(selectedAppointment)}\n\n` +
          'Confirmações devem ser realizadas pelo profissional responsável pela consulta.',
          [{ text: 'Entendi', style: 'cancel' }]
        );
      } else {
        Alert.alert('Erro', err.message || 'Não foi possível confirmar o agendamento.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular semana atual
  const getWeekDates = useCallback((dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - dayOfWeek);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }
    return weekDates;
  }, []);

  // Calcular mês atual
  const getMonthDates = useCallback((dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const monthDates: string[] = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      monthDates.push(d.toISOString().split('T')[0]);
    }
    return monthDates;
  }, []);

  // Estatísticas baseadas no viewMode
  const stats = useMemo(() => {
    let dates: string[] = [];
    let label = '';

    if (viewMode === 'day') {
      dates = [selectedDate];
      label = 'Hoje';
    } else if (viewMode === 'week') {
      dates = getWeekDates(selectedDate);
      label = 'Semana';
    } else {
      dates = getMonthDates(selectedDate);
      label = 'Mês';
    }

    let total = 0;
    let confirmed = 0;
    let pending = 0;

    dates.forEach((date) => {
      const dayAppts = appointments[date] || [];
      total += dayAppts.length;
      confirmed += dayAppts.filter((a) => a.status === 'confirmed').length;
      pending += dayAppts.filter((a) => ['pending', 'scheduled', 'awaiting_patient', 'awaiting_psychologist'].includes(a.status)).length;
    });

    return { total, confirmed, pending, label };
  }, [viewMode, selectedDate, appointments, getWeekDates, getMonthDates]);

  // Agendamentos a exibir
  const displayAppointments = useMemo(() => {
    if (viewMode === 'day') {
      return appointments[selectedDate] || [];
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      const weekAppts: ClinicAppointment[] = [];
      weekDates.forEach((date) => {
        const dayAppts = appointments[date] || [];
        weekAppts.push(...dayAppts.map(a => ({ ...a, _displayDate: date } as any)));
      });
      return weekAppts.sort((a, b) => {
        const dateA = getAppointmentDate(a);
        const dateB = getAppointmentDate(b);
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return getAppointmentTime(a).localeCompare(getAppointmentTime(b));
      });
    }
    return appointments[selectedDate] || [];
  }, [viewMode, selectedDate, appointments, getWeekDates]);

  // Marcar datas no calendário
  const markedDates = useMemo(() => {
    const marked: any = {};

    Object.keys(appointments).forEach((date) => {
      const dayAppts = appointments[date] || [];
      const hasConfirmed = dayAppts.some((a) => a.status === 'confirmed');
      const hasPending = dayAppts.some((a) => ['pending', 'scheduled', 'awaiting_patient', 'awaiting_psychologist'].includes(a.status));

      marked[date] = {
        marked: true,
        dotColor: hasConfirmed ? '#50C878' : hasPending ? '#FFB347' : '#4A90E2',
        selected: date === selectedDate,
        selectedColor: '#4A90E2',
      };
    });

    if (!marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#4A90E2',
      };
    }

    return marked;
  }, [appointments, selectedDate]);

  // Renderizar visão diária
  const renderDayView = () => {
    const dayAppts = appointments[selectedDate] || [];

    return (
      <ScrollView style={[styles.dayViewContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.dayHeader, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.dayHeaderText, { color: colors.textPrimary }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

        {HOURS.map((hour) => {
          const hourAppts = dayAppts.filter((a) => getAppointmentHour(a) === hour);
          const formattedHour = `${hour.toString().padStart(2, '0')}:00`;

          return (
            <View key={hour} style={[styles.hourRow, { borderBottomColor: colors.borderLight }]}>
              <View style={[styles.hourLabel, { backgroundColor: colors.surfaceSecondary, borderRightColor: colors.borderLight }]}>
                <Text style={[styles.hourText, { color: colors.textSecondary }]}>{formattedHour}</Text>
              </View>
              <View style={styles.hourContent}>
                {hourAppts.length === 0 ? (
                  <View style={styles.emptyHourSlot} />
                ) : (
                  hourAppts.map((appt, idx) => (
                    <TouchableOpacity
                      key={appt._id || idx}
                      style={[styles.hourAppointment, { borderLeftColor: getStatusColor(appt.status), backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}
                      onPress={() => handleEditAppointment(appt)}
                    >
                      <Text style={styles.hourApptTime}>{getAppointmentTime(appt)}</Text>
                      <Text style={[styles.hourApptPatient, { color: colors.textPrimary }]} numberOfLines={1}>
                        {getPatientName(appt)}
                      </Text>
                      <Text style={[styles.hourApptPsy, { color: colors.textSecondary }]} numberOfLines={1}>
                        Dr(a). {getPsychologistName(appt)}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // Renderizar card de agendamento
  const renderAppointmentCard = (appt: ClinicAppointment, index: number, showDate: boolean = false) => (
    <Card key={appt._id || index} style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={20} color="#4A90E2" />
          <Text style={[styles.appointmentTime, { color: colors.textPrimary }]}>
            {showDate && (
              <Text style={[styles.appointmentDate, { color: colors.textSecondary }]}>
                {new Date(getAppointmentDate(appt) + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} -{' '}
              </Text>
            )}
            {getAppointmentTime(appt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appt.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(appt.status) }]}>
            {getStatusLabel(appt.status)}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color="#4A90E2" />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Psicólogo:</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{getPsychologistName(appt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people" size={16} color="#50C878" />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Paciente:</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{getPatientName(appt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="document-text" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Tipo:</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{getAppointmentTypeLabel(appt.type)}</Text>
        </View>
      </View>

      <View style={[styles.appointmentActions, { borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleViewPatient(appt)}
        >
          <Ionicons name="person-circle" size={18} color="#4A90E2" />
          <Text style={styles.actionButtonText}>Ver Paciente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditAppointment(appt)}
        >
          <Ionicons name="pencil" size={18} color="#FFB347" />
          <Text style={[styles.actionButtonText, { color: '#FFB347' }]}>Editar</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  // Renderizar lista de agendamentos
  const renderAppointmentsList = () => {
    if (displayAppointments.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum compromisso agendado</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            {viewMode === 'week' ? 'Nesta semana' : 'Neste dia'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.appointmentsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90E2']} />
        }
      >
        {displayAppointments.map((appt, index) => renderAppointmentCard(appt, index, viewMode === 'week'))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agenda da Clínica</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando agenda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Agenda da Clínica</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {selectedPsychologists.length === psychologists.length
              ? 'Todos os psicólogos'
              : `${selectedPsychologists.length} psicólogo(s) selecionado(s)`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Seletor de Visualização */}
      <View style={[styles.viewSelector, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.viewButton, viewMode === 'day' && styles.viewButtonActive]}
          onPress={() => setViewMode('day')}
        >
          <Text style={[styles.viewButtonText, { color: colors.textSecondary }, viewMode === 'day' && styles.viewButtonTextActive]}>
            Dia
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, viewMode === 'week' && styles.viewButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.viewButtonText, { color: colors.textSecondary }, viewMode === 'week' && styles.viewButtonTextActive]}>
            Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, viewMode === 'month' && styles.viewButtonActive]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.viewButtonText, { color: colors.textSecondary }, viewMode === 'month' && styles.viewButtonTextActive]}>
            Mês
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resumo de estatísticas */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total ({stats.label})</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#50C878' }]}>{stats.confirmed}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Confirmadas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FFB347' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pendentes</Text>
        </View>
      </View>

      {/* Calendário (esconde na visão diária) */}
      {viewMode !== 'day' && (
        <Calendar
          style={[styles.calendar, { borderBottomColor: colors.borderLight }]}
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          theme={{
            backgroundColor: isDark ? colors.surface : '#ffffff',
            calendarBackground: isDark ? colors.surface : '#ffffff',
            textSectionTitleColor: '#4A90E2',
            selectedDayBackgroundColor: '#4A90E2',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#4A90E2',
            dayTextColor: isDark ? colors.textPrimary : '#2d4150',
            textDisabledColor: isDark ? colors.textTertiary : '#d9e1e8',
            dotColor: '#4A90E2',
            selectedDotColor: '#ffffff',
            arrowColor: '#4A90E2',
            monthTextColor: isDark ? colors.textPrimary : '#2d4150',
            indicatorColor: '#4A90E2',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
        />
      )}

      {/* Data selecionada (apenas para mês) */}
      {viewMode === 'month' && (
        <View style={[styles.selectedDateContainer, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <View style={styles.selectedDateInfo}>
            <Ionicons name="calendar" size={20} color="#4A90E2" />
            <Text style={[styles.selectedDateText, { color: colors.textPrimary }]}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        </View>
      )}

      {/* Conteúdo baseado no viewMode */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAppointments}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'day' ? (
        renderDayView()
      ) : (
        renderAppointmentsList()
      )}

      {/* Modal de Filtros */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filtrar Agenda</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Psicólogos</Text>
            <View style={styles.filterActions}>
              <TouchableOpacity style={[styles.filterActionButton, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]} onPress={selectAllPsychologists}>
                <Text style={styles.filterActionText}>Selecionar todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterActionButton, { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]} onPress={clearPsychologistSelection}>
                <Text style={styles.filterActionText}>Limpar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterList}>
              {psychologists.map((psy) => {
                const psyId = psy._id || psy.id;
                const isSelected = selectedPsychologists.includes(psyId);
                return (
                  <TouchableOpacity
                    key={psyId}
                    style={[styles.filterItem, { backgroundColor: colors.surfaceSecondary }, isSelected && { backgroundColor: isDark ? '#1A2E3D' : '#E8F4FF' }]}
                    onPress={() => togglePsychologist(psyId)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isSelected ? '#4A90E2' : colors.textTertiary}
                    />
                    <View style={styles.filterItemInfo}>
                      <Text style={[styles.filterItemName, { color: colors.textPrimary }]}>{psy.name}</Text>
                      <Text style={[styles.filterItemCrp, { color: colors.textSecondary }]}>{psy.crp}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => {
                setShowFilterModal(false);
                setLoading(true);
                loadAppointments();
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.applyFilterButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes/Edição */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Detalhes do Agendamento</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.editSection}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Data e Hora</Text>
                  <View style={styles.editRow}>
                    <Ionicons name="calendar" size={20} color="#4A90E2" />
                    <Text style={[styles.editValue, { color: colors.textPrimary }]}>
                      {new Date(getAppointmentDate(selectedAppointment) + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.editRow}>
                    <Ionicons name="time" size={20} color="#4A90E2" />
                    <Text style={[styles.editValue, { color: colors.textPrimary }]}>{getAppointmentTime(selectedAppointment)}</Text>
                  </View>
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Paciente</Text>
                  <TouchableOpacity
                    style={[styles.editRowClickable, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => {
                      setShowEditModal(false);
                      handleViewPatient(selectedAppointment);
                    }}
                  >
                    <Ionicons name="person" size={20} color="#50C878" />
                    <Text style={[styles.editValue, { color: colors.textPrimary }]}>{getPatientName(selectedAppointment)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Psicólogo</Text>
                  <View style={styles.editRow}>
                    <Ionicons name="person" size={20} color="#4A90E2" />
                    <Text style={[styles.editValue, { color: colors.textPrimary }]}>{getPsychologistName(selectedAppointment)}</Text>
                  </View>
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedAppointment.status) + '20' }]}>
                    <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedAppointment.status) }]}>
                      {getStatusLabel(selectedAppointment.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Tipo</Text>
                  <Text style={[styles.editValue, { color: colors.textPrimary }]}>{getAppointmentTypeLabel(selectedAppointment.type)}</Text>
                </View>

                {selectedAppointment.notes && (
                  <View style={styles.editSection}>
                    <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Observações</Text>
                    <Text style={[styles.editNotes, { color: colors.textSecondary, backgroundColor: colors.surfaceSecondary }]}>{selectedAppointment.notes}</Text>
                  </View>
                )}

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editActionButton, { backgroundColor: '#4A90E2' }]}
                    onPress={() => {
                      setShowEditModal(false);
                      handleViewPatient(selectedAppointment);
                    }}
                    disabled={isSaving}
                  >
                    <Ionicons name="person-circle" size={20} color="#fff" />
                    <Text style={styles.editActionText}>Ver Paciente</Text>
                  </TouchableOpacity>

                  {['pending', 'scheduled', 'awaiting_patient', 'awaiting_psychologist'].includes(selectedAppointment.status) && (
                    <TouchableOpacity
                      style={[styles.editActionButton, { backgroundColor: '#50C878' }]}
                      onPress={handleConfirmAppointment}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.editActionText}>Confirmar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editActionButton, { backgroundColor: '#FFB347' }]}
                    onPress={handleOpenReschedule}
                    disabled={isSaving}
                  >
                    <Ionicons name="calendar" size={20} color="#fff" />
                    <Text style={styles.editActionText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editActionButton, { backgroundColor: '#FF6B6B' }]}
                    onPress={handleCancelAppointment}
                    disabled={isSaving}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.editActionText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Edição Completa */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Editar Agendamento</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.rescheduleLabel, { color: colors.textPrimary }]}>Data (AAAA-MM-DD)</Text>
              <TextInput
                style={[styles.rescheduleInput, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="Ex: 2026-01-25"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.rescheduleLabel, { color: colors.textPrimary }]}>Horário (HH:MM)</Text>
              <TextInput
                style={[styles.rescheduleInput, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="Ex: 14:30"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={[styles.rescheduleLabel, { color: colors.textPrimary }]}>Psicólogo</Text>
              <View style={styles.typeSelector}>
                {psychologists.map((psy) => {
                  const psyId = psy._id || psy.id;
                  const isSelected = editPsychologistId === psyId;
                  return (
                    <TouchableOpacity
                      key={psyId}
                      style={[styles.typeButton, { borderColor: '#4A90E2' }, isSelected && styles.typeButtonActive]}
                      onPress={() => setEditPsychologistId(psyId)}
                    >
                      <Text style={[styles.typeButtonText, isSelected && styles.typeButtonTextActive]} numberOfLines={1}>
                        {psy.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.rescheduleLabel, { color: colors.textPrimary }]}>Tipo de Atendimento</Text>
              <View style={styles.typeSelector}>
                {APPOINTMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeButton, { borderColor: '#4A90E2' }, editType === type.value && styles.typeButtonActive]}
                    onPress={() => setEditType(type.value)}
                  >
                    <Ionicons
                      name={type.value === 'online' ? 'videocam' : 'business'}
                      size={16}
                      color={editType === type.value ? '#fff' : '#4A90E2'}
                    />
                    <Text style={[styles.typeButtonText, editType === type.value && styles.typeButtonTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.rescheduleLabel, { color: colors.textPrimary }]}>Observações</Text>
              <TextInput
                style={[styles.rescheduleInput, styles.textArea, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Adicione observações sobre a consulta..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.rescheduleActions}>
                <TouchableOpacity
                  style={[styles.rescheduleButton, { backgroundColor: colors.borderLight }]}
                  onPress={() => setShowRescheduleModal(false)}
                  disabled={isSaving}
                >
                  <Text style={[styles.rescheduleButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rescheduleButton, styles.rescheduleSave]}
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.rescheduleButtonText, { color: '#fff' }]}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Paciente */}
      <Modal
        visible={showPatientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Dados do Paciente</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingPatient ? (
              <View style={styles.patientLoadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
              </View>
            ) : patientData ? (
              <View>
                <View style={styles.patientAvatar}>
                  <Ionicons name="person-circle" size={80} color="#4A90E2" />
                </View>

                <Text style={[styles.patientName, { color: colors.textPrimary }]}>{patientData.name}</Text>

                <View style={styles.patientInfo}>
                  <View style={[styles.patientInfoRow, { borderBottomColor: colors.borderLight }]}>
                    <Ionicons name="mail" size={20} color={colors.textSecondary} />
                    <Text style={[styles.patientInfoText, { color: colors.textPrimary }]}>
                      {patientData.email || 'Email não disponível'}
                    </Text>
                  </View>

                  <View style={[styles.patientInfoRow, { borderBottomColor: colors.borderLight }]}>
                    <Ionicons name="call" size={20} color={colors.textSecondary} />
                    <Text style={[styles.patientInfoText, { color: colors.textPrimary }]}>
                      {patientData.phone || 'Telefone não disponível'}
                    </Text>
                  </View>
                </View>

                {patientData.phone && (
                  <View style={styles.patientActions}>
                    <TouchableOpacity
                      style={[styles.patientActionButton, { backgroundColor: '#25D366' }]}
                      onPress={() => handleWhatsApp(patientData.phone)}
                    >
                      <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                      <Text style={styles.patientActionText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.patientActionButton, { backgroundColor: '#4A90E2' }]}
                      onPress={() => handleCall(patientData.phone)}
                    >
                      <Ionicons name="call" size={24} color="#fff" />
                      <Text style={styles.patientActionText}>Ligar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.closePatientButton, { backgroundColor: colors.borderLight }]}
                  onPress={() => setShowPatientModal(false)}
                >
                  <Text style={[styles.closePatientButtonText, { color: colors.textSecondary }]}>Fechar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.patientLoadingContainer}>
                <Ionicons name="person-circle" size={64} color={colors.textTertiary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Paciente não encontrado</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewSelector: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  viewButtonActive: {
    backgroundColor: '#4A90E2',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewButtonTextActive: {
    color: '#fff',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  calendar: {
    borderBottomWidth: 1,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  appointmentsList: {
    flex: 1,
    padding: 12,
  },
  appointmentCard: {
    marginBottom: 12,
    padding: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // Day View
  dayViewContainer: {
    flex: 1,
  },
  dayHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  dayHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
  },
  hourLabel: {
    width: 60,
    padding: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  hourText: {
    fontSize: 12,
    fontWeight: '500',
  },
  hourContent: {
    flex: 1,
    padding: 4,
  },
  emptyHourSlot: {
    height: 52,
  },
  hourAppointment: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
    borderLeftWidth: 3,
  },
  hourApptTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  hourApptPatient: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  hourApptPsy: {
    fontSize: 11,
    marginTop: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterActionText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  filterList: {
    maxHeight: 300,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterItemSelected: {
    // Kept for backwards compatibility; overridden by inline style
  },
  filterItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  filterItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterItemCrp: {
    fontSize: 12,
    marginTop: 2,
  },
  applyFilterButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  applyFilterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Edit Modal
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  editRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    padding: 8,
    borderRadius: 8,
  },
  editValue: {
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  editNotes: {
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    borderRadius: 8,
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  editActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  editActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Reschedule Modal
  rescheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  rescheduleInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#4A90E2',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  rescheduleActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  rescheduleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleCancel: {
    // Kept for backwards compatibility; overridden by inline style
  },
  rescheduleSave: {
    backgroundColor: '#4A90E2',
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Patient Modal
  patientLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  patientAvatar: {
    alignItems: 'center',
    marginBottom: 16,
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  patientInfo: {
    marginBottom: 24,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  patientInfoText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  patientActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  patientActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  patientActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closePatientButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closePatientButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
