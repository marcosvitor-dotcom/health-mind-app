import api, { ApiResponse, getErrorMessage } from './api';
import { User } from '../types';

// ========================================
// TIPOS
// ========================================

export interface UpdateClinicRequest {
  name?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

export interface UpdatePsychologistRequest {
  name?: string;
  phone?: string;
  specialties?: string[];
}

export interface UpdatePatientRequest {
  name?: string;
  phone?: string;
  birthDate?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export interface PatientWithPsychologist {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  psychologistId?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    crp?: string;
    specialties?: string[];
  };
  clinicId?: string;
  birthDate?: string;
  cpf?: string;
  avatar?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

// ========================================
// CONSULTA DE PERFIL
// ========================================

/**
 * Obter dados do paciente com dados do psicologo populados
 */
export const getPatient = async (patientId: string): Promise<PatientWithPsychologist> => {
  try {
    const response = await api.get<ApiResponse<PatientWithPsychologist>>(`/patients/${patientId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Erro ao buscar dados do paciente');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// ATUALIZAÇÃO DE PERFIL
// ========================================

/**
 * Atualizar perfil da clínica
 */
export const updateClinic = async (clinicId: string, data: UpdateClinicRequest): Promise<User> => {
  try {
    const response = await api.put<ApiResponse<User>>(`/clinics/${clinicId}`, data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Erro ao atualizar clínica');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Atualizar perfil do psicólogo
 */
export const updatePsychologist = async (psychologistId: string, data: UpdatePsychologistRequest): Promise<User> => {
  try {
    const response = await api.put<ApiResponse<User>>(`/psychologists/${psychologistId}`, data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Erro ao atualizar psicólogo');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Atualizar perfil do paciente
 */
export const updatePatient = async (patientId: string, data: UpdatePatientRequest): Promise<User> => {
  try {
    const response = await api.put<ApiResponse<User>>(`/patients/${patientId}`, data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Erro ao atualizar paciente');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// UPLOAD DE IMAGENS
// ========================================

/**
 * Upload de logo da clínica
 */
export const uploadClinicLogo = async (clinicId: string, imageUri: string): Promise<User> => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'logo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('logo', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await api.post<ApiResponse<User>>(`/clinics/${clinicId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Erro ao fazer upload da logo');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Upload de avatar do psicólogo
 */
export const uploadPsychologistAvatar = async (psychologistId: string, imageUri: string): Promise<User> => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await api.post<ApiResponse<User>>(`/psychologists/${psychologistId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Erro ao fazer upload do avatar');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

/**
 * Upload de avatar do paciente
 */
export const uploadPatientAvatar = async (patientId: string, imageUri: string): Promise<User> => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await api.post<ApiResponse<User>>(`/patients/${patientId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error('Erro ao fazer upload do avatar');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
