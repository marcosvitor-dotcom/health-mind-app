import api, { ApiResponse, getErrorMessage } from './api';

// ========================================
// TIPOS
// ========================================

export interface Room {
  _id: string;
  clinicId: string;
  name: string;
  number?: string;
  description?: string;
  capacity: number;
  amenities: string[];
  subleasePrice?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomData {
  name: string;
  number?: string;
  description?: string;
  capacity?: number;
  amenities?: string[];
  subleasePrice?: number | null;
}

export interface UpdateRoomData {
  name?: string;
  number?: string;
  description?: string;
  capacity?: number;
  amenities?: string[];
  subleasePrice?: number | null;
  isActive?: boolean;
}

export interface RoomScheduleEntry {
  _id: string;
  date: string;
  duration: number;
  status: string;
  roomStatus?: string;
  psychologistId: { _id: string; name: string };
  patientId: { _id: string; name: string };
}

export interface RoomSchedule {
  room: { _id: string; name: string; number?: string };
  date: string;
  appointments: RoomScheduleEntry[];
}

export interface PendingRoomRequest {
  _id: string;
  date: string;
  duration: number;
  type: string;
  status: string;
  roomStatus: string;
  patientId: { _id: string; name: string; avatar?: string };
  psychologistId: { _id: string; name: string; avatar?: string; crp?: string };
  roomId: { _id: string; name: string; number?: string };
  roomRequestedId: { _id: string; name: string; number?: string };
}

export const AMENITIES_MAP: Record<string, { label: string; icon: string }> = {
  ar_condicionado: { label: 'Ar Condicionado', icon: 'snow-outline' },
  acessibilidade: { label: 'Acessibilidade', icon: 'accessibility-outline' },
  soundproof: { label: 'Isolamento Acústico', icon: 'volume-mute-outline' },
  wifi: { label: 'Wi-Fi', icon: 'wifi-outline' },
  tv: { label: 'TV', icon: 'tv-outline' },
  sofa: { label: 'Sofá', icon: 'bed-outline' },
  banheiro_privativo: { label: 'Banheiro Privativo', icon: 'water-outline' },
};

// ========================================
// CRUD
// ========================================

export const getRooms = async (clinicId: string, includeInactive = false): Promise<Room[]> => {
  try {
    const params = includeInactive ? '?includeInactive=true' : '';
    const { data } = await api.get<Room[]>(`/clinics/${clinicId}/rooms${params}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getRoom = async (clinicId: string, roomId: string): Promise<Room> => {
  try {
    const { data } = await api.get<Room>(`/clinics/${clinicId}/rooms/${roomId}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const createRoom = async (clinicId: string, roomData: CreateRoomData): Promise<Room> => {
  try {
    const { data } = await api.post<Room>(`/clinics/${clinicId}/rooms`, roomData);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const updateRoom = async (clinicId: string, roomId: string, roomData: UpdateRoomData): Promise<Room> => {
  try {
    const { data } = await api.put<Room>(`/clinics/${clinicId}/rooms/${roomId}`, roomData);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const deleteRoom = async (clinicId: string, roomId: string): Promise<void> => {
  try {
    await api.delete(`/clinics/${clinicId}/rooms/${roomId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// SCHEDULE
// ========================================

export const getRoomSchedule = async (clinicId: string, roomId: string, date: string): Promise<RoomSchedule> => {
  try {
    const { data } = await api.get<RoomSchedule>(
      `/clinics/${clinicId}/rooms/${roomId}/schedule?date=${date}`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const getAllRoomsSchedule = async (clinicId: string, date: string): Promise<RoomSchedule[]> => {
  try {
    const { data } = await api.get<RoomSchedule[]>(
      `/clinics/${clinicId}/rooms/schedule?date=${date}`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// ROOM REQUESTS
// ========================================

export const getPendingRoomRequests = async (): Promise<PendingRoomRequest[]> => {
  try {
    const { data } = await api.get<ApiResponse<PendingRoomRequest[]>>(
      '/appointments/room-requests/pending'
    );
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.message || 'Erro ao buscar solicitações');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

export const handleRoomDecision = async (
  appointmentId: string,
  action: 'approve' | 'reject' | 'change',
  newRoomId?: string
): Promise<void> => {
  try {
    const body: { action: string; newRoomId?: string } = { action };
    if (newRoomId) body.newRoomId = newRoomId;

    const { data } = await api.post<ApiResponse>(
      `/appointments/${appointmentId}/room-decision`,
      body
    );
    if (!data.success) {
      throw new Error(data.message || 'Erro ao processar decisão');
    }
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ========================================
// AVAILABILITY
// ========================================

export const getAvailableRooms = async (
  clinicId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Room[]> => {
  try {
    const { data } = await api.get<Room[]>(
      `/availability/rooms?clinicId=${clinicId}&date=${date}&startTime=${startTime}&endTime=${endTime}`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};
