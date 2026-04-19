import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface InsuranceBatch {
  _id: string;
  ownerId: string;
  ownerModel: 'Clinic' | 'Psychologist';
  insuranceName: string;
  referenceMonth: string; // YYYY-MM
  status: 'open' | 'submitted' | 'partially_paid' | 'paid' | 'cancelled';
  paymentIds: string[];
  totalAmount: number;
  receivedAmount: number;
  submittedAt?: string | null;
  paidAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBatchParams {
  insuranceName: string;
  referenceMonth: string;
  paymentIds: string[];
  notes?: string;
}

export interface PaginatedBatches {
  batches: InsuranceBatch[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ListBatchesParams {
  status?: string;
  referenceMonth?: string;
  insuranceName?: string;
  page?: number;
  limit?: number;
}

// ========================================
// FUNÇÕES
// ========================================

export const listBatches = async (params: ListBatchesParams = {}): Promise<PaginatedBatches> => {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const response = await api.get<ApiResponse<PaginatedBatches>>(`/insurance-batches?${query.toString()}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getBatch = async (id: string): Promise<InsuranceBatch> => {
  try {
    const response = await api.get<ApiResponse<InsuranceBatch>>(`/insurance-batches/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const createBatch = async (data: CreateBatchParams): Promise<InsuranceBatch> => {
  try {
    const response = await api.post<ApiResponse<InsuranceBatch>>('/insurance-batches', data);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const submitBatch = async (id: string): Promise<InsuranceBatch> => {
  try {
    const response = await api.post<ApiResponse<InsuranceBatch>>(`/insurance-batches/${id}/submit`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const markBatchPaid = async (
  id: string,
  data: { receivedAmount: number; paidAt?: string }
): Promise<InsuranceBatch> => {
  try {
    const response = await api.post<ApiResponse<InsuranceBatch>>(`/insurance-batches/${id}/paid`, data);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const cancelBatch = async (id: string): Promise<InsuranceBatch> => {
  try {
    const response = await api.post<ApiResponse<InsuranceBatch>>(`/insurance-batches/${id}/cancel`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const addPaymentsToBatch = async (id: string, paymentIds: string[]): Promise<InsuranceBatch> => {
  try {
    const response = await api.post<ApiResponse<InsuranceBatch>>(`/insurance-batches/${id}/payments/add`, { paymentIds });
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
