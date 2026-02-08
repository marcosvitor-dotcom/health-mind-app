import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface RoomSublease {
  _id: string;
  appointmentId: string | { _id: string; date: string; duration: number; type: string };
  roomId: string | { _id: string; name: string; number?: string };
  psychologistId: string | { _id: string; name: string };
  clinicId: string;
  patientId: string | { _id: string; name: string };
  value: number;
  status: 'pending' | 'paid' | 'cancelled';
  appointmentDate: string;
  paidAt?: string | null;
  cancelledAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubleaseSummary {
  totalCount: number;
  totalValue: number;
  paidCount: number;
  paidValue: number;
  pendingCount: number;
  pendingValue: number;
}

export interface SubleasesResponse {
  subleases: RoomSublease[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ========================================
// API
// ========================================

export const getPsychologistSubleaseSummary = async (
  psychologistId: string,
  startDate?: string,
  endDate?: string
): Promise<SubleaseSummary> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get<ApiResponse<SubleaseSummary>>(
      `/subleases/summary/psychologist/${psychologistId}${query}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar resumo de sublocações');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getClinicSubleaseSummary = async (
  clinicId: string,
  startDate?: string,
  endDate?: string
): Promise<SubleaseSummary> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    const { data } = await api.get<ApiResponse<SubleaseSummary>>(
      `/subleases/summary/clinic/${clinicId}${query}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar resumo de sublocações');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getSubleases = async (
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<SubleasesResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);

    const { data } = await api.get<ApiResponse<SubleasesResponse>>(
      `/subleases?${params.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar sublocações');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const markSubleasePaid = async (id: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/subleases/${id}/pay`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao marcar como pago');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const cancelSublease = async (id: string, reason?: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/subleases/${id}/cancel`, { reason });
    if (!data.success) {
      throw new Error(data.message || 'Erro ao cancelar sublocação');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
