import api, { ApiResponse, getErrorMessage } from './api';

export type NotificationType =
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_reminder'
  | 'new_message'
  | 'report_request'
  | 'document_request'
  | 'invite_accepted'
  | 'general';

export interface InAppNotification {
  _id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    appointmentId?: string;
    screen?: string;
    [key: string]: any;
  };
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: InAppNotification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getNotifications = async (
  page = 1,
  limit = 30
): Promise<NotificationsResponse> => {
  const response = await api.get<ApiResponse<NotificationsResponse>>(
    `/notifications?page=${page}&limit=${limit}`
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Erro ao buscar notificações');
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    const response = await api.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count'
    );
    if (response.data.success && response.data.data) {
      return response.data.data.count;
    }
    return 0;
  } catch {
    return 0;
  }
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  await api.put(`/notifications/${notificationId}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await api.put('/notifications/read-all');
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
};

export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'appointment_confirmed': return 'calendar-check';
    case 'appointment_cancelled': return 'calendar-remove';
    case 'appointment_rescheduled': return 'calendar-clock';
    case 'appointment_reminder': return 'alarm';
    case 'new_message': return 'chatbubble';
    case 'report_request': return 'document-text';
    case 'document_request': return 'folder-open';
    case 'invite_accepted': return 'person-add';
    default: return 'notifications';
  }
};

export const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'appointment_confirmed': return '#50C878';
    case 'appointment_cancelled': return '#FF6B6B';
    case 'appointment_rescheduled': return '#9B59B6';
    case 'appointment_reminder': return '#FFB347';
    case 'new_message': return '#4A90E2';
    case 'report_request': return '#E67E22';
    case 'document_request': return '#1ABC9C';
    case 'invite_accepted': return '#50C878';
    default: return '#999';
  }
};
