import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface DirectMessage {
  _id: string;
  conversationKey: string;
  senderId: string;
  senderModel: 'Patient' | 'Psychologist';
  senderRole: 'patient' | 'psychologist';
  receiverId: string;
  receiverModel: 'Patient' | 'Psychologist';
  message: string;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponse {
  messages: DirectMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ========================================
// DIRECT MESSAGE API
// ========================================

/**
 * Enviar mensagem direta
 */
export const sendDirectMessage = async (
  receiverId: string,
  message: string
): Promise<DirectMessage> => {
  try {
    const { data } = await api.post<ApiResponse<DirectMessage>>('/direct-messages', {
      receiverId,
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
 * Obter conversa com um parceiro
 */
export const getConversation = async (
  partnerId: string,
  page: number = 1,
  limit: number = 50
): Promise<ConversationResponse> => {
  try {
    const { data } = await api.get<ApiResponse<ConversationResponse>>(
      `/direct-messages/${partnerId}?page=${page}&limit=${limit}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar conversa');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Marcar mensagens como lidas
 */
export const markAsRead = async (partnerId: string): Promise<void> => {
  try {
    const { data } = await api.put<ApiResponse>(`/direct-messages/read/${partnerId}`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao marcar como lidas');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Obter contagem de mensagens nao lidas
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const { data } = await api.get<ApiResponse<UnreadCountResponse>>(
      '/direct-messages/unread-count'
    );

    if (data.success && data.data) {
      return data.data.unreadCount;
    }
    return 0;
  } catch (error) {
    console.error('Erro ao buscar contagem de nao lidas:', error);
    return 0;
  }
};
