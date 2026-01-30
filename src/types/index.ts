// Tipos de usuário
export type UserRole = 'clinic' | 'psychologist' | 'client' | 'patient';

export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  clinicId?: string;
  psychologistId?: string;
  crp?: string;
  cnpj?: string;
  specialties?: string[];
  birthDate?: string;
  cpf?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tipos para Clínica
export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  logo?: string;
}

export interface Psychologist {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  crp: string;
  avatar?: string;
  clinicId: string;
}

// Tipos para Paciente/Cliente
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  psychologistId: string;
  avatar?: string;
  registrationDate: Date;
}

// Tipos para Agenda
export interface Appointment {
  id: string;
  clientId: string;
  psychologistId: string;
  date: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

// Tipos para Documentos
export interface Document {
  id: string;
  clientId: string;
  psychologistId: string;
  type: 'anamnesis' | 'session_report' | 'evaluation' | 'other';
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para Chat
export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: Date;
  isAI?: boolean;
}

export interface ChatSession {
  id: string;
  clientId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de Navegação
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type ClinicTabParamList = {
  Overview: undefined;
  Psychologists: undefined;
  Schedule: undefined;
};

export type PsychologistTabParamList = {
  Clients: undefined;
  Schedule: undefined;
  Documents: undefined;
  Reports: undefined;
};

export type ClientTabParamList = {
  Chat: undefined;
  Appointments: undefined;
  Emergency: undefined;
  Profile: undefined;
};

// Tipos para API de Autenticação
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

// Tipos para Sistema de Convites
export type InvitationRole = 'clinic' | 'psychologist' | 'patient';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface InvitationData {
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  preFilledData: {
    name?: string;
    cnpj?: string;
    crp?: string;
    phone?: string;
    birthDate?: string;
  };
  expiresAt: string;
}

export interface Invitation {
  _id: string;
  id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  invitedBy: string;
  clinicId?: string;
  psychologistId?: string;
  preFilledData: Record<string, any>;
  token: string;
  expiresAt: string;
  createdAt: string;
  invitationUrl?: string;
}

export interface InviteClinicRequest {
  email: string;
  name: string;
  cnpj: string;
}

export interface InvitePsychologistRequest {
  email: string;
  name: string;
  crp: string;
  specialties?: string[];
  phone?: string;
}

export interface InvitePatientRequest {
  email: string;
  name: string;
  phone?: string;
  birthDate?: string;
  psychologistId?: string;
}

export interface CompleteRegistrationClinicRequest {
  token: string;
  password: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface CompleteRegistrationPsychologistRequest {
  token: string;
  password: string;
  phone?: string;
  bio?: string;
  // Campos do wizard terapêutico
  formacaoAcademica?: string;
  abordagemPrincipal?: string;
  descricaoTrabalho?: string;
  publicosEspecificos?: string[];
  temasEspecializados?: string[];
  tonsComunicacao?: string[];
  tecnicasFavoritas?: string[];
  restricoesTematicas?: string;
  diferenciais?: string;
  systemPrompt?: string;
}

export interface PsychologistWizardData {
  // Step 1 - Dados Básicos
  password: string;
  confirmPassword: string;
  phone: string;
  // Step 2 - Abordagem Terapêutica
  formacaoAcademica: string;
  abordagemPrincipal: string;
  descricaoTrabalho: string;
  // Step 3 - Especializações
  publicosEspecificos: string[];
  temasEspecializados: string[];
  // Step 4 - Estilo de Comunicação
  tonsComunicacao: string[];
  // Step 5 - Técnicas e Diferenciais
  tecnicasFavoritas: string;
  restricoesTematicas: string;
  diferenciais: string;
}

export interface CompleteRegistrationPatientRequest {
  token: string;
  password: string;
  cpf?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}
