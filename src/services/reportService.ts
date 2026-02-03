import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface ReportSection {
  temasAbordados: string;
  sentimentosIdentificados: string;
  padroesComportamentais: string;
  pontosDeAtencao: string;
  evolucaoObservada: string;
  sugestoesParaSessao: string;
}

export interface TherapeuticReport {
  _id: string;
  patientId: string;
  psychologistId: string;
  status: 'generating' | 'completed' | 'failed';
  periodStart: string | null;
  periodEnd: string;
  messagesAnalyzed: number;
  sections: ReportSection;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface TherapeuticReportListItem {
  _id: string;
  patientId: string;
  psychologistId: string;
  status: 'generating' | 'completed' | 'failed';
  periodStart: string | null;
  periodEnd: string;
  messagesAnalyzed: number;
  summary: string;
  createdAt: string;
}

export interface ReportsListResponse {
  reports: TherapeuticReportListItem[];
  total: number;
}

// ========================================
// RELATÓRIO TERAPÊUTICO API
// ========================================

/**
 * Gerar relatório terapêutico para um paciente
 */
export const generateTherapeuticReport = async (
  patientId: string
): Promise<TherapeuticReport> => {
  try {
    const { data } = await api.post<ApiResponse<TherapeuticReport>>(
      '/ai/generate-therapeutic-report',
      { patientId },
      { timeout: 150000 } // 2.5 min — geração pode demorar
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao gerar relatório terapêutico');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Listar relatórios terapêuticos de um paciente
 */
export const getTherapeuticReports = async (
  patientId: string
): Promise<ReportsListResponse> => {
  try {
    const { data } = await api.get<ApiResponse<ReportsListResponse>>(
      `/ai/therapeutic-reports/${patientId}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar relatórios');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Obter relatório terapêutico completo por ID
 */
export const getTherapeuticReport = async (
  reportId: string
): Promise<TherapeuticReport> => {
  try {
    const { data } = await api.get<ApiResponse<TherapeuticReport>>(
      `/ai/therapeutic-report/${reportId}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar relatório');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
