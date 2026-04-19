import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface DREReport {
  period: { startDate: string; endDate: string };
  revenue: {
    grossRevenue: number;
    ownerRevenue: number;
    clinicShare?: number;
    psychologistShare?: number;
    sessionCount: number;
  };
  expenses: {
    total: number;
    byCategory: Array<{
      _id: string;
      categoryName: string;
      total: number;
      count: number;
    }>;
  };
  netProfit: number;
}

export interface CashFlowMonth {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  balance: number;
  cumulativeBalance: number;
  sessionCount: number;
}

export interface CashFlowReport {
  period: { startDate: string; endDate: string };
  cashFlow: CashFlowMonth[];
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalBalance: number;
  };
}

export interface MonthlyBalance {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  sessionCount: number;
}

export interface OutstandingExpenses {
  pending: { total: number; count: number };
  overdue: { total: number; count: number };
}

// ========================================
// FUNÇÕES
// ========================================

export const getDRE = async (startDate: string, endDate: string): Promise<DREReport> => {
  try {
    const response = await api.get<ApiResponse<DREReport>>(
      `/financial/dre?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getCashFlow = async (startDate: string, endDate: string): Promise<CashFlowReport> => {
  try {
    const response = await api.get<ApiResponse<CashFlowReport>>(
      `/financial/cashflow?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getMonthlyBalance = async (month: string): Promise<MonthlyBalance> => {
  try {
    const response = await api.get<ApiResponse<MonthlyBalance>>(
      `/financial/monthly-balance?month=${month}`
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getOutstandingExpenses = async (): Promise<OutstandingExpenses> => {
  try {
    const response = await api.get<ApiResponse<OutstandingExpenses>>('/financial/outstanding');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
