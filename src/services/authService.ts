import axios from 'axios';
import api, { ApiResponse, getErrorMessage } from './api';
import {
  LoginRequest,
  LoginResponse,
  InviteClinicRequest,
  InvitePsychologistRequest,
  InvitePatientRequest,
  CompleteRegistrationClinicRequest,
  CompleteRegistrationPsychologistRequest,
  CompleteRegistrationPatientRequest,
  InvitationData,
  Invitation,
  User,
} from '../types';

// ========================================
// AUTENTICAÇÃO
// ========================================

export class LoginError extends Error {
  errorCode: string;
  constructor(message: string, errorCode: string) {
    super(message);
    this.errorCode = errorCode;
  }
}

export class ApiErrorWithCode extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Login de usuário
 */
export const login = async (
  email: string,
  password: string
): Promise<{ user: User; token: string; refreshToken: string }> => {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao fazer login');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data;
      throw new LoginError(
        body?.message || 'Erro ao fazer login',
        body?.errorCode || 'UNKNOWN'
      );
    }
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Solicitar link de redefinição de senha
 */
export const forgotPassword = async (email: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse<null>>('/auth/forgot-password', { email });
    if (!data.success) throw new Error(data.message);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Redefinir senha com token
 */
export const resetPassword = async (token: string, password: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse<null>>('/auth/reset-password', { token, password });
    if (!data.success) throw new Error(data.message);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Logout de usuário
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    // Não lançar erro, pois logout deve sempre funcionar localmente
  }
};

/**
 * Excluir conta do usuário (soft delete)
 */
export const deleteAccount = async (): Promise<void> => {
  const { data } = await api.delete<ApiResponse<null>>('/auth/delete-account');
  if (!data.success) {
    throw new Error(data.message || 'Erro ao excluir conta');
  }
};

/**
 * Obter dados do usuário logado
 */
export const getMe = async (): Promise<User> => {
  try {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error('Erro ao buscar dados do usuário');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Renovar token (feito automaticamente pelo interceptor)
 */
export const refreshToken = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  try {
    const { data } = await api.post<ApiResponse<{ token: string; refreshToken: string }>>(
      '/auth/refresh-token',
      { refreshToken }
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error('Erro ao renovar token');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// SISTEMA DE CONVITES
// ========================================

/**
 * [ADMIN] Convidar Clínica
 */
export const inviteClinic = async (data: InviteClinicRequest): Promise<Invitation> => {
  try {
    const response = await api.post<ApiResponse<{ invitation: Invitation }>>(
      '/invitations/clinic',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data.invitation;
    }
    throw new Error('Erro ao enviar convite');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * [CLINIC] Convidar Psicólogo
 */
export const invitePsychologist = async (data: InvitePsychologistRequest): Promise<Invitation> => {
  try {
    const response = await api.post<ApiResponse<{ invitation: Invitation }>>(
      '/invitations/psychologist',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data.invitation;
    }
    throw new Error('Erro ao enviar convite');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * [PSYCHOLOGIST/CLINIC] Convidar Paciente
 */
export const invitePatient = async (data: InvitePatientRequest): Promise<Invitation> => {
  try {
    const response = await api.post<ApiResponse<{ invitation: Invitation }>>(
      '/invitations/patient',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data.invitation;
    }
    throw new Error('Erro ao enviar convite');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data;
      const code: string | undefined = body?.code;
      const message = body?.message || 'Erro ao enviar convite';
      if (code) throw new ApiErrorWithCode(message, code);
    }
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Validar token de convite (público)
 */
export const validateInvitationToken = async (token: string): Promise<InvitationData> => {
  try {
    const { data } = await api.get<ApiResponse<InvitationData>>(`/invitations/validate/${token}`);

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error('Convite inválido ou expirado');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Listar convites enviados
 */
export const listInvitations = async (
  status?: 'pending' | 'accepted' | 'expired',
  role?: 'clinic' | 'psychologist' | 'patient'
): Promise<Invitation[]> => {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (role) params.append('role', role);

    const { data } = await api.get<ApiResponse<Invitation[]>>(
      `/invitations?${params.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    return [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Reenviar convite
 */
export const resendInvitation = async (invitationId: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/invitations/${invitationId}/resend`);

    if (!data.success) {
      throw new Error('Erro ao reenviar convite');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Editar convite pendente (atualiza dados e renova prazo)
 */
export const updateInvitation = async (
  invitationId: string,
  data: { name?: string; phone?: string; birthDate?: string; psychologistId?: string }
): Promise<Invitation> => {
  try {
    const response = await api.patch<ApiResponse<{ invitation: Invitation }>>(
      `/invitations/${invitationId}`,
      data
    );
    if (response.data.success && response.data.data) {
      return response.data.data.invitation;
    }
    throw new Error(response.data.message || 'Erro ao atualizar convite');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Cancelar convite
 */
export const cancelInvitation = async (invitationId: string): Promise<void> => {
  try {
    const { data } = await api.delete<ApiResponse>(`/invitations/${invitationId}`);

    if (!data.success) {
      throw new Error('Erro ao cancelar convite');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// FINALIZAÇÃO DE CADASTRO
// ========================================

/**
 * Finalizar cadastro de Clínica
 */
export const completeClinicRegistration = async (
  data: CompleteRegistrationClinicRequest
): Promise<{ user: User; token: string; refreshToken: string }> => {
  try {
    const response = await api.post<LoginResponse>(
      '/auth/complete-registration/clinic',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao completar cadastro');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Finalizar cadastro de Psicólogo
 */
export const completePsychologistRegistration = async (
  data: CompleteRegistrationPsychologistRequest
): Promise<{ user: User; token: string; refreshToken: string }> => {
  try {
    const response = await api.post<LoginResponse>(
      '/auth/complete-registration/psychologist',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao completar cadastro');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Finalizar cadastro de Paciente
 */
export const completePatientRegistration = async (
  data: CompleteRegistrationPatientRequest
): Promise<{ user: User; token: string; refreshToken: string }> => {
  try {
    const response = await api.post<LoginResponse>(
      '/auth/complete-registration/patient',
      data
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Erro ao completar cadastro');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
