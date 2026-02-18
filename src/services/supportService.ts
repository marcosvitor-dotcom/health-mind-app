import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface TicketResponse {
  responderId: string | { _id: string; name: string };
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  userId: string;
  userModel: 'Patient' | 'Psychologist' | 'Clinic';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  responses: TicketResponse[];
  createdAt: string;
  updatedAt: string;
}

// ========================================
// API
// ========================================

export const createTicket = async (
  subject: string,
  message: string
): Promise<SupportTicket> => {
  try {
    const { data } = await api.post<ApiResponse<SupportTicket>>('/support', {
      subject,
      message,
    });

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao criar ticket de suporte');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getMyTickets = async (): Promise<SupportTicket[]> => {
  try {
    const { data } = await api.get<ApiResponse<SupportTicket[]>>('/support');

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar tickets');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getTicket = async (id: string): Promise<SupportTicket> => {
  try {
    const { data } = await api.get<ApiResponse<SupportTicket>>(
      `/support/${id}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar ticket');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
