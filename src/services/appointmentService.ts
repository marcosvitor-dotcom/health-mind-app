import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface AppointmentData {
  _id: string;
  patientId: string;
  psychologistId: string | {
    _id: string;
    name: string;
    email: string;
    crp?: string;
    avatar?: string;
  };
  date: string;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'pending';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentsResponse {
  appointments: AppointmentData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ========================================
// APPOINTMENTS API
// ========================================

/**
 * Obter consultas do paciente
 */
export interface CreateAppointmentRequest {
  patientId: string;
  psychologistId: string;
  date: string;
  duration?: number;
  type?: 'online' | 'in_person';
  notes?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AvailableSlotsResponse {
  slots: TimeSlot[];
  date: string;
  psychologistId: string;
}

export const getPatientAppointments = async (
  patientId: string,
  page: number = 1,
  limit: number = 20,
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<AppointmentsResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const { data } = await api.get<ApiResponse<AppointmentsResponse>>(
      `/patients/${patientId}/appointments?${params.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar consultas');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Criar uma nova consulta
 */
export const createAppointment = async (
  appointmentData: CreateAppointmentRequest
): Promise<AppointmentData> => {
  try {
    const { data } = await api.post<ApiResponse<AppointmentData>>(
      '/appointments',
      appointmentData
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao criar consulta');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Obter horarios disponiveis para um psicologo em uma data
 */
export const getAvailableSlots = async (
  psychologistId: string,
  date: string
): Promise<AvailableSlotsResponse> => {
  try {
    const { data } = await api.get<ApiResponse<AvailableSlotsResponse>>(
      `/availability/slots?psychologistId=${psychologistId}&date=${date}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar horários disponíveis');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
