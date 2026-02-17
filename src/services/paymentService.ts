import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface PaymentData {
  _id: string;
  appointmentId: string | {
    _id: string;
    date: string;
    duration: number;
    type: string;
    status: string;
  };
  patientId: string | {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  psychologistId: string | {
    _id: string;
    name: string;
    crp?: string;
  };
  clinicId?: string | {
    _id: string;
    name: string;
  };
  sessionValue: number;
  clinicPercentage: number;
  clinicAmount: number;
  psychologistAmount: number;
  discount: number;
  finalValue: number;
  status: 'pending' | 'awaiting_confirmation' | 'confirmed' | 'cancelled' | 'refunded';
  paymentMethod?: string | null;
  healthInsurance?: {
    name?: string;
    planNumber?: string;
    authorizationCode?: string;
  };
  dueDate?: string | null;
  paidAt?: string | null;
  confirmedAt?: string | null;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsResponse {
  payments: PaymentData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PsychologistFinancialSummary {
  totalSessions: number;
  confirmedPayments: { count: number; value: number; psychologistValue: number };
  pendingPayments: { count: number; value: number; psychologistValue: number };
  awaitingConfirmation: { count: number; value: number; psychologistValue: number };
  cancelledPayments: { count: number; value: number };
  expectedEarnings: number;
  confirmedEarnings: number;
  pendingEarnings: number;
}

export interface ClinicFinancialSummary {
  totalSessions: number;
  confirmedPayments: { count: number; totalValue: number; clinicValue: number; psychologistValue: number };
  pendingPayments: { count: number; totalValue: number; clinicValue: number; psychologistValue: number };
  awaitingConfirmation: { count: number; totalValue: number; clinicValue: number; psychologistValue: number };
  cancelledPayments: { count: number; totalValue: number };
  byPsychologist: Array<{
    psychologistId: string;
    name: string;
    totalSessions: number;
    confirmedPayments: { count: number; value: number; psychologistValue: number };
    pendingPayments: { count: number; value: number; psychologistValue: number };
    awaitingConfirmation: { count: number; value: number; psychologistValue: number };
    cancelledPayments: { count: number; value: number };
  }>;
}

export interface PatientFinancialSummary {
  totalSessions: number;
  paidSessions: { count: number; value: number };
  pendingSessions: { count: number; value: number };
  totalPaid: number;
  totalPending: number;
  pendingPayments: PaymentData[];
}

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  psychologistId?: string;
  patientId?: string;
}

// ========================================
// API
// ========================================

export const listPayments = async (
  params: ListPaymentsParams = {}
): Promise<PaymentsResponse> => {
  try {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status) query.append('status', params.status);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.psychologistId) query.append('psychologistId', params.psychologistId);
    if (params.patientId) query.append('patientId', params.patientId);

    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const { data } = await api.get<ApiResponse<PaymentsResponse>>(
      `/payments${queryStr}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar pagamentos');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getPayment = async (id: string): Promise<PaymentData> => {
  try {
    const { data } = await api.get<ApiResponse<PaymentData>>(`/payments/${id}`);
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar pagamento');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const registerPayment = async (
  id: string,
  paymentMethod: string,
  paidAt?: string
): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/payments/${id}/pay`, {
      paymentMethod,
      paidAt,
    });
    if (!data.success) {
      throw new Error(data.message || 'Erro ao registrar pagamento');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const confirmPayment = async (
  id: string,
  internalNotes?: string
): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/payments/${id}/confirm`, {
      internalNotes,
    });
    if (!data.success) {
      throw new Error(data.message || 'Erro ao confirmar pagamento');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const confirmBatchPayments = async (
  paymentIds: string[],
  internalNotes?: string
): Promise<{ confirmed: string[]; failed: Array<{ paymentId: string; error: string }> }> => {
  try {
    const { data } = await api.post<ApiResponse<{ confirmed: string[]; failed: Array<{ paymentId: string; error: string }> }>>(
      '/payments/batch/confirm',
      { paymentIds, internalNotes }
    );
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao confirmar pagamentos em lote');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const cancelPayment = async (
  id: string,
  reason?: string
): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/payments/${id}/cancel`, { reason });
    if (!data.success) {
      throw new Error(data.message || 'Erro ao cancelar pagamento');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const refundPayment = async (
  id: string,
  reason?: string
): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/payments/${id}/refund`, { reason });
    if (!data.success) {
      throw new Error(data.message || 'Erro ao reembolsar pagamento');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const updatePaymentValue = async (
  id: string,
  sessionValue: number,
  discount?: number
): Promise<void> => {
  try {
    const { data } = await api.put<ApiResponse>(`/payments/${id}/value`, {
      sessionValue,
      discount,
    });
    if (!data.success) {
      throw new Error(data.message || 'Erro ao atualizar valor');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getPsychologistSummary = async (
  psychologistId: string,
  startDate: string,
  endDate: string
): Promise<PsychologistFinancialSummary> => {
  try {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    const { data } = await api.get<ApiResponse<PsychologistFinancialSummary>>(
      `/payments/summary/psychologist/${psychologistId}?${params.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar resumo financeiro');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getClinicSummary = async (
  clinicId: string,
  startDate: string,
  endDate: string
): Promise<ClinicFinancialSummary> => {
  try {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    const { data } = await api.get<ApiResponse<ClinicFinancialSummary>>(
      `/payments/summary/clinic/${clinicId}?${params.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar resumo financeiro da clinica');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getPatientSummary = async (
  patientId: string
): Promise<PatientFinancialSummary> => {
  try {
    const { data } = await api.get<ApiResponse<PatientFinancialSummary>>(
      `/payments/summary/patient/${patientId}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar resumo do paciente');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getPatientPendingPayments = async (
  patientId: string
): Promise<PaymentData[]> => {
  try {
    const { data } = await api.get<ApiResponse<PaymentData[]>>(
      `/payments/patient/${patientId}/pending`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar pagamentos pendentes');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
