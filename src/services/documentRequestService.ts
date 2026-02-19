import api, { ApiResponse } from './api';

// ========================================
// TIPOS
// ========================================

export type DocumentRequestType =
  | 'prontuario'
  | 'declaracao'
  | 'atestado'
  | 'relatorio'
  | 'laudo'
  | 'parecer';

export type DocumentRequestStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export interface DocumentRequestData {
  _id: string;
  patientId: string | { _id: string; name: string; email?: string; avatar?: string };
  psychologistId: string | { _id: string; name: string; crp?: string };
  type: DocumentRequestType;
  status: DocumentRequestStatus;
  description?: string;
  responseNote?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse {
  requests: DocumentRequestData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ========================================
// LABELS E HELPERS
// ========================================

export const TYPE_CONFIG: Record<DocumentRequestType, { label: string; description: string; icon: string }> = {
  prontuario: {
    label: 'Prontuário Psicológico',
    description: 'Registro de evolução do trabalho psicológico realizado',
    icon: 'folder-open',
  },
  declaracao: {
    label: 'Declaração',
    description: 'Comprovação de comparecimento ou acompanhamento psicológico',
    icon: 'document-text',
  },
  atestado: {
    label: 'Atestado Psicológico',
    description: 'Justificativa para faltas, afastamentos ou aptidões',
    icon: 'shield-checkmark',
  },
  relatorio: {
    label: 'Relatório Psicológico',
    description: 'Narrativa detalhada da atuação profissional',
    icon: 'clipboard',
  },
  laudo: {
    label: 'Laudo Psicológico',
    description: 'Resultado técnico-científico de avaliação psicológica',
    icon: 'analytics',
  },
  parecer: {
    label: 'Parecer Psicológico',
    description: 'Resposta técnica a dúvida específica sobre caso',
    icon: 'chatbox-ellipses',
  },
};

export const STATUS_CONFIG: Record<DocumentRequestStatus, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: '#FFB347' },
  in_progress: { label: 'Em Andamento', color: '#4A90E2' },
  completed: { label: 'Concluído', color: '#50C878' },
  rejected: { label: 'Recusado', color: '#FF6B6B' },
};

// ========================================
// API - PACIENTE
// ========================================

export const createDocumentRequest = async (
  type: DocumentRequestType,
  description?: string
): Promise<DocumentRequestData> => {
  const { data } = await api.post<ApiResponse<DocumentRequestData>>('/document-requests', {
    type,
    description,
  });
  if (data.success && data.data) return data.data;
  throw new Error(data.message || 'Erro ao criar solicitação');
};

export const getMyRequests = async (
  page = 1,
  limit = 20,
  status?: DocumentRequestStatus
): Promise<PaginatedResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (status) params.status = status;

  const { data } = await api.get<ApiResponse<PaginatedResponse>>('/document-requests/my-requests', { params });
  if (data.success && data.data) return data.data;
  throw new Error(data.message || 'Erro ao listar solicitações');
};

// ========================================
// API - PSICOLOGO
// ========================================

export const getReceivedRequests = async (
  page = 1,
  limit = 20,
  status?: DocumentRequestStatus,
  patientId?: string
): Promise<PaginatedResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (status) params.status = status;
  if (patientId) params.patientId = patientId;

  const { data } = await api.get<ApiResponse<PaginatedResponse>>('/document-requests/received', { params });
  if (data.success && data.data) return data.data;
  throw new Error(data.message || 'Erro ao listar solicitações');
};

export const updateRequestStatus = async (
  requestId: string,
  status: 'in_progress' | 'completed' | 'rejected',
  responseNote?: string
): Promise<DocumentRequestData> => {
  const { data } = await api.put<ApiResponse<DocumentRequestData>>(
    `/document-requests/${requestId}/status`,
    { status, responseNote }
  );
  if (data.success && data.data) return data.data;
  throw new Error(data.message || 'Erro ao atualizar solicitação');
};

export const getDocumentRequest = async (requestId: string): Promise<DocumentRequestData> => {
  const { data } = await api.get<ApiResponse<DocumentRequestData>>(`/document-requests/${requestId}`);
  if (data.success && data.data) return data.data;
  throw new Error(data.message || 'Erro ao buscar solicitação');
};
