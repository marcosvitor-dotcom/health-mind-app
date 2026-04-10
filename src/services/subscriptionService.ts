import api from './api';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'overdue' | 'blocked' | 'cancelled' | 'none';
export type PlanKey =
  | 'psico_avaliacao'
  | 'psico_basico'
  | 'psico_consciencia'
  | 'psico_equilibrio'
  | 'psico_plenitude'
  | 'clinic_essencia'
  | 'clinic_amplitude';

export type PaymentMethod = 'pix' | 'boleto' | 'transferencia' | 'cartao' | 'dinheiro';
export type SubscriptionPaymentStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'overdue';

export interface PlanLimits {
  patients: number | null;
  invitedPatients: number;
  psychologists: number | null;
}

export interface Plan {
  key: PlanKey;
  name: string;
  userType: 'psychologist' | 'clinic';
  limits: PlanLimits;
  pricing: {
    setupFee: number;
    monthly: number;
  };
}

export interface PlanAddon {
  key: string;
  name: string;
  pricePerSlot: number;
}

export interface SubscriptionPayment {
  _id: string;
  type: 'monthly' | 'setup' | 'addon_patient';
  status: SubscriptionPaymentStatus;
  amount: number;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  slots?: number;
}

export interface Subscription {
  _id: string;
  planKey: PlanKey;
  status: SubscriptionStatus;
  isTrial: boolean;
  trialEndsAt: string | null;
  billing: {
    monthlyAmount: number;
    setupFee: number;
    nextBillingDate: string;
    billingDayOfMonth: number;
  };
  limits: {
    patients: number | null;
    invitedPatients: number;
    psychologists: number | null;
    extraPatientSlots: number;
  };
}

// ── Rotas públicas ────────────────────────────────────────────────────────────

/** Lista todos os planos disponíveis (não requer autenticação) */
export const getPlans = async (): Promise<{ plans: Plan[]; addon: PlanAddon }> => {
  const response = await api.get('/subscriptions/plans');
  return response.data.data;
};

// ── Rotas do assinante (Psicólogo / Clínica) ─────────────────────────────────

/** Retorna a assinatura ativa e os últimos pagamentos do usuário autenticado */
export const getMySubscription = async (): Promise<{
  subscription: Subscription;
  recentPayments: SubscriptionPayment[];
}> => {
  const response = await api.get('/subscriptions/me');
  return response.data.data;
};

/**
 * Registra o pagamento de uma mensalidade/setup/addon.
 * O status vai para "awaiting_confirmation" até o admin confirmar.
 */
export const registerPayment = async (
  subscriptionId: string,
  paymentId: string,
  data: { paymentMethod: PaymentMethod; paidAt: string }
): Promise<{ status: string; paymentMethod: PaymentMethod }> => {
  const response = await api.post(
    `/subscriptions/${subscriptionId}/payments/${paymentId}/pay`,
    data
  );
  return response.data.data;
};

/** Busca o histórico de pagamentos de uma assinatura */
export const getPaymentHistory = async (
  subscriptionId: string,
  page = 1,
  limit = 20
): Promise<{
  payments: SubscriptionPayment[];
  total: number;
  page: number;
  pages: number;
}> => {
  const response = await api.get(
    `/subscriptions/${subscriptionId}/payments?page=${page}&limit=${limit}`
  );
  return {
    payments: response.data.payments,
    total: response.data.total,
    page: response.data.page,
    pages: response.data.pages,
  };
};
