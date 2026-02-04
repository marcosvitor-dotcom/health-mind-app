import api, { ApiResponse, getErrorMessage } from './api';
import {
  AdminStats,
  AdminClinic,
  AdminPsychologist,
  AdminPatient,
  AdminUser,
} from '../types';

// ========================================
// DASHBOARD
// ========================================

export const getDashboardStats = async (): Promise<AdminStats> => {
  try {
    const { data } = await api.get<ApiResponse<AdminStats>>('/admin/dashboard/stats');
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar estatísticas');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// CLINICS
// ========================================

interface ListClinicsParams {
  page?: number;
  limit?: number;
  search?: string;
  includeDeleted?: boolean;
}

interface ListClinicsResponse {
  clinics: AdminClinic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const listClinics = async (params?: ListClinicsParams): Promise<ListClinicsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');

    const { data } = await api.get<ApiResponse<ListClinicsResponse>>(
      `/admin/clinics?${queryParams.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao listar clínicas');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getClinic = async (id: string): Promise<AdminClinic> => {
  try {
    const { data } = await api.get<ApiResponse<AdminClinic>>(`/admin/clinics/${id}`);
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar clínica');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const updateClinic = async (
  id: string,
  updateData: Partial<AdminClinic>
): Promise<AdminClinic> => {
  try {
    const { data } = await api.put<ApiResponse<AdminClinic>>(`/admin/clinics/${id}`, updateData);
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao atualizar clínica');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const deleteClinic = async (id: string): Promise<void> => {
  try {
    const { data } = await api.delete<ApiResponse>(`/admin/clinics/${id}`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao desativar clínica');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const restoreClinic = async (id: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/admin/clinics/${id}/restore`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao restaurar clínica');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// PSYCHOLOGISTS
// ========================================

interface ListPsychologistsParams {
  page?: number;
  limit?: number;
  search?: string;
  includeDeleted?: boolean;
}

interface ListPsychologistsResponse {
  psychologists: AdminPsychologist[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const listPsychologists = async (
  params?: ListPsychologistsParams
): Promise<ListPsychologistsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');

    const { data } = await api.get<ApiResponse<ListPsychologistsResponse>>(
      `/admin/psychologists?${queryParams.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao listar psicólogos');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const deletePsychologist = async (id: string): Promise<void> => {
  try {
    const { data } = await api.delete<ApiResponse>(`/admin/psychologists/${id}`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao desativar psicólogo');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const restorePsychologist = async (id: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/admin/psychologists/${id}/restore`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao restaurar psicólogo');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// PATIENTS
// ========================================

interface ListPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  includeDeleted?: boolean;
}

interface ListPatientsResponse {
  patients: AdminPatient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const listPatients = async (params?: ListPatientsParams): Promise<ListPatientsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');

    const { data } = await api.get<ApiResponse<ListPatientsResponse>>(
      `/admin/patients?${queryParams.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao listar pacientes');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const deletePatient = async (id: string): Promise<void> => {
  try {
    const { data } = await api.delete<ApiResponse>(`/admin/patients/${id}`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao desativar paciente');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const restorePatient = async (id: string): Promise<void> => {
  try {
    const { data } = await api.post<ApiResponse>(`/admin/patients/${id}/restore`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao restaurar paciente');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// ADMINS
// ========================================

interface ListAdminsParams {
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

interface ListAdminsResponse {
  admins: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const listAdmins = async (params?: ListAdminsParams): Promise<ListAdminsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.includeDeleted) queryParams.append('includeDeleted', 'true');

    const { data } = await api.get<ApiResponse<ListAdminsResponse>>(
      `/admin/admins?${queryParams.toString()}`
    );

    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao listar administradores');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

interface CreateAdminData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  permissions?: {
    manageUsers?: boolean;
    manageClinics?: boolean;
    viewMetrics?: boolean;
    promoteAdmin?: boolean;
  };
}

export const createAdmin = async (adminData: CreateAdminData): Promise<AdminUser> => {
  try {
    const { data } = await api.post<ApiResponse<AdminUser>>('/admin/admins', adminData);
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao criar administrador');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const revokeAdmin = async (id: string): Promise<void> => {
  try {
    const { data } = await api.delete<ApiResponse>(`/admin/admins/${id}`);
    if (!data.success) {
      throw new Error(data.message || 'Erro ao revogar administrador');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// INVITATIONS
// ========================================

interface InviteClinicData {
  email: string;
  name: string;
  cnpj?: string;
}

export const inviteClinic = async (inviteData: InviteClinicData): Promise<any> => {
  try {
    const { data } = await api.post<ApiResponse>('/invitations/clinic', inviteData);
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao enviar convite');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
