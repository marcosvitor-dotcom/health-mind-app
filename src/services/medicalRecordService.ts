import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export type MedicalRecordCategory =
  | 'anamnesis'
  | 'session_report'
  | 'declaration'
  | 'report'
  | 'evaluation'
  | 'prescription'
  | 'other';

export type FileType = 'pdf' | 'doc' | 'docx' | 'text' | null;

export interface MedicalRecord {
  _id: string;
  patientId: string | {
    _id: string;
    name: string;
    email: string;
  };
  psychologistId: string | {
    _id: string;
    name: string;
    email: string;
    crp?: string;
  };
  appointmentId?: string | {
    _id: string;
    date: string;
    status: string;
    type: string;
  };
  category: MedicalRecordCategory;
  title: string;
  description?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: FileType;
  fileSize?: number;
  hasFile?: boolean;
  tags?: string[];
  date: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecordStats {
  total: number;
  byCategory: {
    [key in MedicalRecordCategory]?: number;
  };
}

export interface MedicalRecordsResponse {
  records: MedicalRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: MedicalRecordStats;
}

export interface CreateMedicalRecordRequest {
  patientId: string;
  appointmentId?: string;
  category: MedicalRecordCategory;
  title: string;
  description?: string;
  content?: string;
  fileName?: string;
  fileType?: FileType;
  fileData?: string; // Base64
  tags?: string[];
  date?: string;
}

export interface UpdateMedicalRecordRequest {
  category?: MedicalRecordCategory;
  title?: string;
  description?: string;
  content?: string;
  fileName?: string;
  fileType?: FileType;
  fileData?: string; // Base64
  tags?: string[];
  date?: string;
}

// ========================================
// MEDICAL RECORDS API
// ========================================

/**
 * Criar novo registro médico
 */
export const createMedicalRecord = async (
  data: CreateMedicalRecordRequest
): Promise<MedicalRecord> => {
  try {
    const response = await api.post<ApiResponse<MedicalRecord>>(
      '/medical-records',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao criar registro médico');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Obter registros médicos de um paciente
 */
export const getPatientMedicalRecords = async (
  patientId: string,
  filters?: {
    category?: MedicalRecordCategory;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }
): Promise<MedicalRecordsResponse> => {
  try {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.page) params.append('page', filters.page.toString());

    const queryString = params.toString();
    const url = `/medical-records/patient/${patientId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<ApiResponse<MedicalRecordsResponse>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao buscar registros médicos');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Obter um registro médico específico
 */
export const getMedicalRecord = async (recordId: string): Promise<MedicalRecord> => {
  try {
    const response = await api.get<ApiResponse<MedicalRecord>>(
      `/medical-records/${recordId}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao buscar registro médico');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Atualizar registro médico
 */
export const updateMedicalRecord = async (
  recordId: string,
  data: UpdateMedicalRecordRequest
): Promise<MedicalRecord> => {
  try {
    const response = await api.put<ApiResponse<MedicalRecord>>(
      `/medical-records/${recordId}`,
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao atualizar registro médico');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Deletar registro médico
 */
export const deleteMedicalRecord = async (recordId: string): Promise<void> => {
  try {
    const response = await api.delete<ApiResponse>(
      `/medical-records/${recordId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao deletar registro médico');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Obter estatísticas do prontuário do paciente
 */
export const getPatientRecordStats = async (
  patientId: string
): Promise<MedicalRecordStats> => {
  try {
    const response = await api.get<ApiResponse<MedicalRecordStats>>(
      `/medical-records/patient/${patientId}/stats`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao buscar estatísticas');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Download de arquivo do registro médico
 */
export const downloadMedicalRecordFile = async (recordId: string): Promise<void> => {
  try {
    const response = await api.get(
      `/medical-records/${recordId}/download`,
      { responseType: 'blob' }
    );

    // Criar um link temporário para download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'document.pdf'); // Será substituído pelo nome real no header
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Converter arquivo para Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remover o prefixo "data:...;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Obter tipo de arquivo da extensão
 */
export const getFileType = (fileName: string): FileType => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'pdf';
  if (extension === 'doc') return 'doc';
  if (extension === 'docx') return 'docx';
  return 'text';
};

/**
 * Validar tamanho do arquivo (max 10MB)
 */
export const validateFileSize = (file: File): boolean => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return file.size <= maxSize;
};

/**
 * Validar tipo de arquivo
 */
export const validateFileType = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  return allowedTypes.includes(file.type);
};

/**
 * Obter label de categoria
 */
export const getCategoryLabel = (category: MedicalRecordCategory): string => {
  const labels: { [key in MedicalRecordCategory]: string } = {
    anamnesis: 'Ficha de Anamnese',
    session_report: 'Relatos de Sessão',
    declaration: 'Declarações',
    report: 'Relatórios',
    evaluation: 'Laudos e Pareceres',
    prescription: 'Prescrições',
    other: 'Outros',
  };
  return labels[category] || category;
};

/**
 * Obter ícone de categoria
 */
export const getCategoryIcon = (category: MedicalRecordCategory): string => {
  const icons: { [key in MedicalRecordCategory]: string } = {
    anamnesis: 'clipboard',
    session_report: 'document-text',
    declaration: 'document',
    report: 'stats-chart',
    evaluation: 'ribbon',
    prescription: 'medical',
    other: 'folder',
  };
  return icons[category] || 'document';
};
