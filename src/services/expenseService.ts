import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface FinancialCategory {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  isDefault: boolean;
}

export interface Expense {
  _id: string;
  ownerId: string;
  ownerModel: 'Clinic' | 'Psychologist';
  categoryId: FinancialCategory | string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt?: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string | null;
  receiptUrl?: string | null;
  recurrence: 'none' | 'weekly' | 'monthly' | 'yearly';
  referenceMonth?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  totalPaid: number;
  totalPending: number;
  byCategory: Array<{
    _id: string;
    categoryName: string;
    totalPaid: number;
    totalPending: number;
    count: number;
  }>;
  period: { startDate: string; endDate: string };
}

export interface CreateExpenseParams {
  categoryId: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentMethod?: string;
  notes?: string;
  recurrence?: string;
  referenceMonth?: string;
}

export interface ListExpensesParams {
  status?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  referenceMonth?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedExpenses {
  expenses: Expense[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ========================================
// CATEGORIAS
// ========================================

export const listCategories = async (type?: 'income' | 'expense'): Promise<FinancialCategory[]> => {
  try {
    const params = type ? `?type=${type}` : '';
    const response = await api.get<ApiResponse<FinancialCategory[]>>(`/expenses/categories${params}`);
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const createCategory = async (data: { name: string; type: 'income' | 'expense'; description?: string }): Promise<FinancialCategory> => {
  try {
    const response = await api.post<ApiResponse<FinancialCategory>>('/expenses/categories', data);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const seedCategories = async (): Promise<void> => {
  try {
    await api.post('/expenses/categories/seed');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// DESPESAS
// ========================================

export const listExpenses = async (params: ListExpensesParams = {}): Promise<PaginatedExpenses> => {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const response = await api.get<ApiResponse<PaginatedExpenses>>(`/expenses?${query.toString()}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getExpense = async (id: string): Promise<Expense> => {
  try {
    const response = await api.get<ApiResponse<Expense>>(`/expenses/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const createExpense = async (data: CreateExpenseParams): Promise<Expense> => {
  try {
    const response = await api.post<ApiResponse<Expense>>('/expenses', data);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const updateExpense = async (id: string, data: Partial<CreateExpenseParams>): Promise<Expense> => {
  try {
    const response = await api.put<ApiResponse<Expense>>(`/expenses/${id}`, data);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const markExpenseAsPaid = async (
  id: string,
  data: { paymentMethod?: string; paidAt?: string; receiptUrl?: string }
): Promise<Expense> => {
  try {
    const response = await api.post<ApiResponse<Expense>>(`/expenses/${id}/pay`, data);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const cancelExpense = async (id: string): Promise<Expense> => {
  try {
    const response = await api.post<ApiResponse<Expense>>(`/expenses/${id}/cancel`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    await api.delete(`/expenses/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getExpenseSummary = async (startDate: string, endDate: string): Promise<ExpenseSummary> => {
  try {
    const response = await api.get<ApiResponse<ExpenseSummary>>(
      `/expenses/summary?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
