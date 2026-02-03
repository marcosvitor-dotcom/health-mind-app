import api from './api';

// Exportar api para uso em outros arquivos
export { api };

export interface Patient {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  avatar?: string;
}

export interface Appointment {
  _id: string;
  id?: string;
  patientId: string | Patient;
  patient?: Patient;
  date: string;
  dateTime?: string; // alias for date
  status: string;
  type?: string;
  duration?: number;
  notes?: string;
}

export interface OverviewStats {
  totalPatients: number;
  todayAppointments: Appointment[];
  nextAppointment: Appointment | null;
  pendingSessions: number;
  monthRevenue: number;
  pendingRevenue: number;
  completedSessions: number;
}

export const getPsychologist = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/psychologists/${id}`);
    if (response.data?.data) {
      return response.data.data;
    }
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar psicólogo:', error);
    throw error;
  }
};

export const getMyPatients = async (psychologistId: string): Promise<Patient[]> => {
  try {
    const response = await api.get(`/psychologists/${psychologistId}/patients`);
    if (response.data?.data?.patients) {
      return response.data.data.patients;
    }
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error: any) {
    console.error('Erro ao buscar pacientes:', error);
    return [];
  }
};

export const getMyAppointments = async (
  psychologistId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }
): Promise<Appointment[]> => {
  try {
    let url = `/appointments/psychologist/${psychologistId}`;
    const params = new URLSearchParams();

    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await api.get(url);
    let appointments: any[] = [];

    if (response.data?.data && Array.isArray(response.data.data)) {
      appointments = response.data.data;
    } else if (response.data?.data?.appointments && Array.isArray(response.data.data.appointments)) {
      appointments = response.data.data.appointments;
    }

    // Normalizar dados - mapear date para dateTime e patientId para patient
    return appointments.map((apt: any) => ({
      ...apt,
      dateTime: apt.date || apt.dateTime,
      patient: apt.patientId && typeof apt.patientId === 'object' ? apt.patientId : apt.patient,
    }));
  } catch (error: any) {
    console.error('Erro ao buscar agendamentos:', error);
    return [];
  }
};

export const getOverviewStats = async (psychologistId: string): Promise<OverviewStats> => {
  try {
    // Buscar pacientes
    const patients = await getMyPatients(psychologistId);
    const totalPatients = patients.length;

    // Buscar agendamentos de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await getMyAppointments(psychologistId, {
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });

    // Buscar próximo agendamento
    const allAppointments = await getMyAppointments(psychologistId);

    const now = new Date();
    const futureAppointments = allAppointments.filter((apt) => {
      const aptDate = new Date(apt.dateTime || apt.date);
      return aptDate >= now && ['scheduled', 'confirmed'].includes(apt.status);
    });

    futureAppointments.sort((a, b) => {
      const dateA = new Date(a.dateTime || a.date);
      const dateB = new Date(b.dateTime || b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const nextAppointment = futureAppointments.length > 0 ? futureAppointments[0] : null;

    // Contar sessões pendentes (agendadas ou confirmadas)
    const pendingSessions = futureAppointments.length;

    // Buscar dados financeiros
    let monthRevenue = 0;
    let pendingRevenue = 0;
    let completedSessions = 0;

    try {
      const paymentResponse = await api.get(`/payments/summary/psychologist/${psychologistId}`);
      const summary = paymentResponse.data?.data;
      if (summary) {
        monthRevenue = summary.monthRevenue || summary.totalReceived || 0;
        pendingRevenue = summary.totalPending || summary.pendingRevenue || 0;
      }

      // Contar sessões completas
      completedSessions = allAppointments.filter((apt) => apt.status === 'completed').length;
    } catch (paymentErr) {
      console.log('Dados financeiros não disponíveis ainda:', paymentErr);
    }

    return {
      totalPatients,
      todayAppointments,
      nextAppointment,
      pendingSessions,
      monthRevenue,
      pendingRevenue,
      completedSessions,
    };
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalPatients: 0,
      todayAppointments: [],
      nextAppointment: null,
      pendingSessions: 0,
      monthRevenue: 0,
      pendingRevenue: 0,
      completedSessions: 0,
    };
  }
};

export const updatePsychologist = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.put(`/psychologists/${id}`, data);
    if (response.data?.data) {
      return response.data.data;
    }
    return response.data;
  } catch (error: any) {
    console.error('Erro ao atualizar psicólogo:', error);
    throw error;
  }
};

export const getPatientDetails = async (patientId: string): Promise<any> => {
  try {
    const response = await api.get(`/patients/${patientId}`);
    if (response.data?.data) {
      return response.data.data;
    }
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do paciente:', error);
    throw error;
  }
};

export const getPatientAppointments = async (patientId: string): Promise<Appointment[]> => {
  try {
    const response = await api.get(`/appointments/patient/${patientId}`);
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error: any) {
    console.error('Erro ao buscar agendamentos do paciente:', error);
    return [];
  }
};
