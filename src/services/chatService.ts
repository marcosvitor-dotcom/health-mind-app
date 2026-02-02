import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface ChatMessageData {
  _id: string;
  patientId: string;
  message: string;
  response?: string;
  isAI: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessageData;
  aiMessage: ChatMessageData;
}

export interface ChatHistoryResponse {
  messages: ChatMessageData[];
  sentimentStats: Record<string, number>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ========================================
// CHAT API
// ========================================

/**
 * Enviar mensagem no chat (paciente)
 */
export const sendMessage = async (
  patientId: string,
  message: string
): Promise<SendMessageResponse> => {
  try {
    const { data } = await api.post<ApiResponse<SendMessageResponse>>('/chat', {
      patientId,
      message,
    });

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao enviar mensagem');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Obter historico de chat do paciente
 */
export const getChatHistory = async (
  patientId: string,
  page: number = 1,
  limit: number = 50,
  startDate?: string,
  endDate?: string
): Promise<ChatHistoryResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const { data } = await api.get<ApiResponse<ChatHistoryResponse>>(
      `/chat/patient/${patientId}?${params.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar historico');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Deletar mensagem do chat (soft delete)
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    const { data } = await api.delete<ApiResponse>(`/chat/${messageId}`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao deletar mensagem');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
