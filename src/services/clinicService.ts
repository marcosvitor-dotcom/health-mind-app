import api, { ApiResponse } from './api';

// Tipos para Clínica
export interface ClinicAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ClinicData {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  cnpj?: string;
  logo?: string;
  address?: ClinicAddress;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicStats {
  totalPsychologists: number;
  totalPatients: number;
  appointmentsToday: number;
  occupancyRate: number;
  newPatientsThisMonth?: number;
}

export interface ClinicPsychologist {
  _id: string;
  id: string;
  name: string;
  email: string;
  crp: string;
  phone?: string;
  avatar?: string;
  specialties: string[];
  patientCount?: number;
  nextAppointment?: string;
}

export interface ClinicAppointment {
  _id: string;
  id: string;
  dateTime?: string;
  date?: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show' | 'awaiting_patient' | 'awaiting_psychologist';
  type?: string;
  notes?: string;
  psychologist?: {
    _id: string;
    name: string;
  };
  psychologistId?: string;
  patient?: {
    _id: string;
    name: string;
  };
  patientId?: string;
}

export interface PatientBasic {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

/**
 * Obter dados da clínica
 */
export const getClinic = async (clinicId: string): Promise<ClinicData> => {
  const response = await api.get<ApiResponse<ClinicData>>(`/clinics/${clinicId}`);
  return response.data.data!;
};

/**
 * Atualizar dados da clínica
 */
export const updateClinic = async (clinicId: string, data: Partial<ClinicData>): Promise<ClinicData> => {
  const response = await api.put<ApiResponse<ClinicData>>(`/clinics/${clinicId}`, data);
  return response.data.data!;
};

/**
 * Obter estatísticas da clínica
 */
export const getClinicStats = async (clinicId: string): Promise<ClinicStats> => {
  const response = await api.get<ApiResponse<ClinicStats>>(`/clinics/${clinicId}/stats`);
  return response.data.data!;
};

/**
 * Listar psicólogos da clínica
 */
export const getClinicPsychologists = async (clinicId: string): Promise<ClinicPsychologist[]> => {
  const response = await api.get(`/clinics/${clinicId}/psychologists`);
  const data = response.data;

  // Trata diferentes formatos de resposta da API
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.data && Array.isArray(data.data)) {
    return data.data;
  }
  if (data?.psychologists && Array.isArray(data.psychologists)) {
    return data.psychologists;
  }
  if (data?.data?.psychologists && Array.isArray(data.data.psychologists)) {
    return data.data.psychologists;
  }

  console.log('Formato de resposta dos psicólogos:', JSON.stringify(data, null, 2));
  return [];
};

/**
 * Obter agendamentos de um psicólogo específico
 * Tenta primeiro /psychologists/:id/appointments, se falhar tenta /appointments/psychologist/:id
 */
export const getPsychologistAppointments = async (psychologistId: string, date?: string): Promise<ClinicAppointment[]> => {
  const params = date ? { date } : {};

  // Lista de rotas para tentar
  const routes = [
    `/psychologists/${psychologistId}/appointments`,
    `/appointments/psychologist/${psychologistId}`,
  ];

  for (const route of routes) {
    try {
      const response = await api.get(route, { params });
      const data = response.data;

      // Trata diferentes formatos de resposta da API
      if (Array.isArray(data)) {
        return data;
      }
      if (data?.data && Array.isArray(data.data)) {
        return data.data;
      }
      if (data?.appointments && Array.isArray(data.appointments)) {
        return data.appointments;
      }
      if (data?.data?.appointments && Array.isArray(data.data.appointments)) {
        return data.data.appointments;
      }

      return [];
    } catch (err: any) {
      // Se for 404, tenta a próxima rota
      if (err.response?.status === 404) {
        continue;
      }
      // Outros erros, propaga
      throw err;
    }
  }

  // Nenhuma rota funcionou
  return [];
};

/**
 * Obter dados de um paciente pelo ID
 */
export const getPatient = async (patientId: string): Promise<PatientBasic | null> => {
  try {
    const response = await api.get(`/patients/${patientId}`);
    const data = response.data;

    if (data?.data) {
      return data.data;
    }
    if (data?._id || data?.id) {
      return data;
    }
    return null;
  } catch (err) {
    console.log('Erro ao buscar paciente:', patientId, err);
    return null;
  }
};

/**
 * Cache de pacientes para evitar requisições repetidas
 */
const patientCache: { [key: string]: PatientBasic } = {};

/**
 * Busca paciente com cache
 */
export const getPatientCached = async (patientId: string): Promise<PatientBasic | null> => {
  if (patientCache[patientId]) {
    return patientCache[patientId];
  }

  const patient = await getPatient(patientId);
  if (patient) {
    patientCache[patientId] = patient;
  }
  return patient;
};

/**
 * Extrai o ID de um campo que pode ser string ou objeto MongoDB
 */
const extractId = (idField: any): string | null => {
  if (!idField) return null;
  if (typeof idField === 'string') return idField;
  if (typeof idField === 'object') {
    // MongoDB ObjectId format: { "$oid": "..." } ou { _id: "..." }
    if (idField.$oid) return idField.$oid;
    if (idField._id) return idField._id;
    if (idField.id) return idField.id;
  }
  return null;
};

/**
 * Enriquece agendamentos com dados do paciente
 */
export const enrichAppointmentsWithPatients = async (appointments: ClinicAppointment[]): Promise<ClinicAppointment[]> => {
  const enrichedAppointments = await Promise.all(
    appointments.map(async (appt) => {
      // Se já tem dados do paciente, retorna como está
      if (appt.patient?.name) {
        return appt;
      }

      // Extrai o patientId (pode ser string ou objeto MongoDB)
      const patientId = extractId(appt.patientId) || extractId((appt as any).patient);

      if (patientId) {
        const patient = await getPatientCached(patientId);
        if (patient) {
          return {
            ...appt,
            patientId: patientId, // Normaliza para string
            patient: {
              _id: patient._id,
              name: patient.name,
            },
          };
        }
      }

      return appt;
    })
  );

  return enrichedAppointments;
};

/**
 * Atualizar um agendamento
 * Tenta diferentes rotas e métodos (PATCH e PUT)
 *
 * IMPORTANTE: O backend espera:
 * - Campo 'date' (não 'dateTime')
 * - Tipo: 'online' ou 'in_person' (não 'presencial')
 * - Status: 'scheduled', 'confirmed', 'completed', 'cancelled'
 */
export const updateAppointment = async (
  appointmentId: string,
  data: { date?: string; status?: string; notes?: string; type?: string; psychologistId?: string; duration?: number }
): Promise<ClinicAppointment | null> => {
  try {
    // Tenta diferentes rotas e métodos
    const routes = [
      { url: `/appointments/${appointmentId}`, method: 'put' },
      { url: `/appointments/${appointmentId}`, method: 'patch' },
      { url: `/clinic/appointments/${appointmentId}`, method: 'put' },
      { url: `/clinic/appointments/${appointmentId}`, method: 'patch' },
    ];

    for (const route of routes) {
      try {
        console.log(`Tentando ${route.method.toUpperCase()} ${route.url} com dados:`, JSON.stringify(data, null, 2));
        const response = route.method === 'put'
          ? await api.put(route.url, data)
          : await api.patch(route.url, data);
        console.log('Resposta da API:', response.data);
        return response.data?.data || response.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          console.log(`Rota ${route.url} não encontrada, tentando próxima...`);
          continue;
        }
        if (err.response?.status === 403) {
          // Se for 403, não tenta outras rotas - é um problema de permissão
          console.error('Erro 403 - Sem permissão:', err.response?.data);
          throw err;
        }
        if (err.response?.status === 409) {
          console.error('Erro 409 - Conflito:', {
            message: err.response?.data?.message,
            error: err.response?.data?.error,
            data: err.response?.data,
          });
          throw err;
        }
        console.error(`Erro ao atualizar via ${route.url}:`, err.response?.data || err.message);
        throw err;
      }
    }
    return null;
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    throw err;
  }
};

/**
 * Solicitar alteração de agendamento (quando não há permissão para editar diretamente)
 * Esta função pode enviar uma notificação ao psicólogo solicitando a mudança
 */
export const requestAppointmentChange = async (
  appointmentId: string,
  data: {
    date?: string;
    notes?: string;
    type?: string;
    psychologistId?: string;
    reason: string;
  }
): Promise<boolean> => {
  try {
    // Tenta rota de solicitação de mudança
    await api.post(`/appointments/${appointmentId}/request-change`, data);
    return true;
  } catch (err: any) {
    // Se a rota não existir (404), tenta enviar notificação direta
    if (err.response?.status === 404) {
      try {
        await api.post(`/notifications`, {
          type: 'appointment_change_request',
          appointmentId,
          requestedChanges: data,
        });
        return true;
      } catch (notifErr) {
        console.error('Erro ao solicitar mudança:', notifErr);
        throw new Error('Não foi possível solicitar a mudança. Entre em contato com o psicólogo diretamente.');
      }
    }
    throw err;
  }
};

/**
 * Cancelar um agendamento
 */
export const cancelAppointment = async (appointmentId: string): Promise<boolean> => {
  try {
    await api.put(`/appointments/${appointmentId}`, { status: 'cancelled' });
    return true;
  } catch (err) {
    console.error('Erro ao cancelar agendamento:', err);
    throw err;
  }
};

/**
 * Obter agenda do dia da clínica (busca agendamentos de todos os psicólogos)
 */
export const getClinicAppointments = async (clinicId: string, date?: string): Promise<ClinicAppointment[]> => {
  // Primeiro busca os psicólogos da clínica
  const psychologists = await getClinicPsychologists(clinicId);

  if (psychologists.length === 0) {
    return [];
  }

  // Busca agendamentos de todos os psicólogos em paralelo
  const appointmentsPromises = psychologists.map((psy) =>
    getPsychologistAppointments(psy._id || psy.id, date).catch(() => [])
  );

  const allAppointments = await Promise.all(appointmentsPromises);

  // Junta todos os agendamentos e ordena por horário
  const flatAppointments = allAppointments.flat();

  return flatAppointments;
};

/**
 * Vincular psicólogo à clínica
 */
export const linkPsychologistToClinic = async (clinicId: string, psychologistId: string): Promise<boolean> => {
  try {
    await api.post(`/clinics/${clinicId}/psychologists/${psychologistId}/link`);
    return true;
  } catch (err) {
    console.error('Erro ao vincular psicólogo:', err);
    throw err;
  }
};

/**
 * Desvincular psicólogo da clínica
 */
export const unlinkPsychologistFromClinic = async (clinicId: string, psychologistId: string): Promise<boolean> => {
  try {
    await api.post(`/clinics/${clinicId}/psychologists/${psychologistId}/unlink`);
    return true;
  } catch (err) {
    console.error('Erro ao desvincular psicólogo:', err);
    throw err;
  }
};

/**
 * Listar pacientes da clínica
 */
export const getClinicPatients = async (
  clinicId: string,
  options?: {
    psychologistId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ patients: PatientBasic[]; total: number; pages: number }> => {
  try {
    const params: any = {};
    if (options?.psychologistId) params.psychologistId = options.psychologistId;
    if (options?.search) params.search = options.search;
    if (options?.page) params.page = options.page;
    if (options?.limit) params.limit = options.limit;

    const response = await api.get(`/clinics/${clinicId}/patients`, { params });
    const data = response.data;

    if (data?.data) {
      return {
        patients: data.data.patients || [],
        total: data.data.pagination?.total || 0,
        pages: data.data.pagination?.pages || 0,
      };
    }

    return { patients: [], total: 0, pages: 0 };
  } catch (err) {
    console.error('Erro ao buscar pacientes da clínica:', err);
    throw err;
  }
};

/**
 * Vincular paciente à clínica
 */
export const linkPatientToClinic = async (clinicId: string, patientId: string): Promise<boolean> => {
  try {
    await api.post(`/clinics/${clinicId}/patients/${patientId}/link`);
    return true;
  } catch (err) {
    console.error('Erro ao vincular paciente:', err);
    throw err;
  }
};

/**
 * Desvincular paciente da clínica
 */
export const unlinkPatientFromClinic = async (clinicId: string, patientId: string): Promise<boolean> => {
  try {
    await api.post(`/clinics/${clinicId}/patients/${patientId}/unlink`);
    return true;
  } catch (err) {
    console.error('Erro ao desvincular paciente:', err);
    throw err;
  }
};

/**
 * Atribuir/reatribuir paciente a psicólogo da clínica
 */
export const assignPatientToPsychologist = async (
  clinicId: string,
  patientId: string,
  psychologistId: string
): Promise<boolean> => {
  try {
    await api.put(`/clinics/${clinicId}/patients/${patientId}/assign-psychologist`, {
      psychologistId,
    });
    return true;
  } catch (err) {
    console.error('Erro ao atribuir paciente a psicólogo:', err);
    throw err;
  }
};

/**
 * Obter novos pacientes do mês atual
 * Tenta primeiro um endpoint específico, se não existir calcula localmente
 */
export const getNewPatientsThisMonth = async (clinicId: string): Promise<number> => {
  try {
    // Primeiro tenta um endpoint específico para stats do mês
    const response = await api.get(`/clinics/${clinicId}/stats/monthly`);
    if (response.data?.data?.newPatientsThisMonth !== undefined) {
      return response.data.data.newPatientsThisMonth;
    }
    if (response.data?.newPatientsThisMonth !== undefined) {
      return response.data.newPatientsThisMonth;
    }
  } catch (err: any) {
    // Se o endpoint não existir, tenta calcular baseado nos pacientes
    if (err.response?.status === 404) {
      try {
        // Busca pacientes com filtro de data (se a API suportar)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startDateStr = startOfMonth.toISOString().split('T')[0];

        const response = await api.get(`/clinics/${clinicId}/patients`, {
          params: { createdAfter: startDateStr },
        });

        const data = response.data;
        if (data?.data?.pagination?.total !== undefined) {
          return data.data.pagination.total;
        }
        if (data?.data?.patients) {
          return data.data.patients.length;
        }
      } catch (innerErr) {
        console.log('Não foi possível calcular novos pacientes do mês:', innerErr);
      }
    }
  }

  // Se não conseguir de nenhuma forma, retorna 0
  return 0;
};

/**
 * Obter pacientes de um psicólogo específico
 */
export const getPsychologistPatients = async (psychologistId: string): Promise<PatientBasic[]> => {
  try {
    const response = await api.get(`/psychologists/${psychologistId}/patients`);
    if (response.data?.data?.patients) {
      return response.data.data.patients;
    }
    return [];
  } catch (err) {
    console.error('Erro ao buscar pacientes do psicólogo:', err);
    return [];
  }
};

/**
 * Obter estatísticas de um paciente (sessões, próxima consulta, valores)
 */
export const getPatientStats = async (patientId: string): Promise<{
  sessionsCount: number;
  nextAppointment: string | null;
  totalPaid: number;
  totalPending: number;
}> => {
  try {
    // Buscar consultas do paciente
    const appointmentsResponse = await api.get(`/appointments/patient/${patientId}`);
    console.log('Appointments response:', appointmentsResponse.data); // Debug
    const appointments = appointmentsResponse.data?.data || [];

    // Contar sessões realizadas
    const sessionsCount = Array.isArray(appointments)
      ? appointments.filter((apt: any) => apt.status === 'completed').length
      : 0;

    console.log('Sessões realizadas:', sessionsCount); // Debug

    // Buscar próxima consulta
    const now = new Date();
    const futureAppointments = Array.isArray(appointments)
      ? appointments.filter((apt: any) => {
          const aptDate = new Date(apt.dateTime || apt.date);
          return aptDate >= now && ['scheduled', 'confirmed'].includes(apt.status);
        })
      : [];

    futureAppointments.sort((a: any, b: any) => {
      const dateA = new Date(a.dateTime || a.date);
      const dateB = new Date(b.dateTime || b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const nextAppointment = futureAppointments.length > 0 ? futureAppointments[0].dateTime || futureAppointments[0].date : null;

    console.log('Próxima consulta:', nextAppointment); // Debug
    console.log('Total de consultas futuras:', futureAppointments.length); // Debug

    // Buscar informações de pagamento (summary do paciente)
    let totalPaid = 0;
    let totalPending = 0;

    try {
      const summaryResponse = await api.get(`/payments/summary/patient/${patientId}`);
      const summary = summaryResponse.data?.data;

      if (summary) {
        totalPaid = summary.totalReceived || summary.totalPaid || 0;
        totalPending = summary.totalPending || 0;
      }
    } catch (paymentErr) {
      // Pagamentos podem não estar disponíveis ainda
      console.log('Pagamentos não disponíveis ainda:', paymentErr);
    }

    return {
      sessionsCount,
      nextAppointment,
      totalPaid,
      totalPending,
    };
  } catch (err) {
    console.error('Erro ao buscar estatísticas do paciente:', err);
    return {
      sessionsCount: 0,
      nextAppointment: null,
      totalPaid: 0,
      totalPending: 0,
    };
  }
};
