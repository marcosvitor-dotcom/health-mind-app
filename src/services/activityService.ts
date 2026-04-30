import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export type ActivityType = 'checklist' | 'reflection' | 'mood_tracking' | 'document_upload';
export type ActivityStatus = 'pending' | 'completed' | 'skipped';

export interface ChecklistItem {
  _id: string;
  text: string;
  checked: boolean;
}

export interface AppointmentActivity {
  _id: string;
  appointmentId: string;
  patientId: string;
  psychologistId: string;
  title: string;
  description?: string | null;
  type: ActivityType;
  status: ActivityStatus;
  checklistItems?: ChecklistItem[];
  reflectionAnswer?: string | null;
  moodValue?: number | null;
  moodNote?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityRequest {
  title: string;
  description?: string;
  type: ActivityType;
  checklistItems?: string[];
}

export interface SubmitChecklistRequest {
  checklistItems: Array<{ _id: string; checked: boolean }>;
}

export interface SubmitReflectionRequest {
  reflectionAnswer: string;
}

export interface SubmitMoodRequest {
  moodValue: number;
  moodNote?: string;
}

// ========================================
// API
// ========================================

export const getActivities = async (appointmentId: string): Promise<AppointmentActivity[]> => {
  const response = await api.get<ApiResponse<AppointmentActivity[]>>(
    `/appointments/${appointmentId}/activities`
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Erro ao buscar atividades');
};

export const createActivity = async (
  appointmentId: string,
  data: CreateActivityRequest
): Promise<AppointmentActivity> => {
  const response = await api.post<ApiResponse<AppointmentActivity>>(
    `/appointments/${appointmentId}/activities`,
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Erro ao criar atividade');
};

export const updateActivity = async (
  appointmentId: string,
  activityId: string,
  data: Partial<CreateActivityRequest>
): Promise<AppointmentActivity> => {
  const response = await api.put<ApiResponse<AppointmentActivity>>(
    `/appointments/${appointmentId}/activities/${activityId}`,
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Erro ao atualizar atividade');
};

export const deleteActivity = async (
  appointmentId: string,
  activityId: string
): Promise<void> => {
  const response = await api.delete<ApiResponse<null>>(
    `/appointments/${appointmentId}/activities/${activityId}`
  );
  if (!response.data.success) {
    throw new Error(response.data.message || 'Erro ao remover atividade');
  }
};

export const submitActivity = async (
  appointmentId: string,
  activityId: string,
  data: SubmitChecklistRequest | SubmitReflectionRequest | SubmitMoodRequest
): Promise<AppointmentActivity> => {
  const response = await api.put<ApiResponse<AppointmentActivity>>(
    `/appointments/${appointmentId}/activities/${activityId}/submit`,
    data
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Erro ao enviar resposta');
};

export const uploadActivityFile = async (
  appointmentId: string,
  activityId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<AppointmentActivity> => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const response = await api.post<ApiResponse<AppointmentActivity>>(
    `/appointments/${appointmentId}/activities/${activityId}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Erro ao enviar arquivo');
};
