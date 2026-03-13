import api from './api';

export type MoodType = 'euforico' | 'feliz' | 'normal' | 'ansioso' | 'triste' | 'raiva';

export interface MoodConfig {
  type: MoodType;
  label: string;
  emoji: string;
  value: number;
  color: string;
}

export const MOODS: MoodConfig[] = [
  { type: 'euforico', label: 'Eufórico', emoji: '🤩', value: 5, color: '#FFD700' },
  { type: 'feliz',    label: 'Feliz',    emoji: '😊', value: 4, color: '#50C878' },
  { type: 'normal',   label: 'Normal',   emoji: '😐', value: 3, color: '#4A90E2' },
  { type: 'ansioso',  label: 'Ansioso',  emoji: '😰', value: 2, color: '#FF9800' },
  { type: 'triste',   label: 'Triste',   emoji: '😢', value: 1, color: '#9E9E9E' },
  { type: 'raiva',    label: 'Raiva',    emoji: '😠', value: 0, color: '#E53935' },
];

export interface MoodEntry {
  _id: string;
  patientId: string;
  mood: MoodType;
  value: number;
  note: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface MoodTimelineResponse {
  entries: MoodEntry[];
  total: number;
}

export const logMood = async (mood: MoodType, note?: string): Promise<MoodEntry> => {
  const response = await api.post('/mood', { mood, note });
  return response.data.data;
};

export const getMoodTimeline = async (
  patientId: string,
  startDate?: string,
  endDate?: string,
  limit = 200
): Promise<MoodTimelineResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`/mood/patient/${patientId}?${params.toString()}`);
    return response.data.data;
  } catch {
    return { entries: [], total: 0 };
  }
};

export const deleteMoodEntry = async (entryId: string): Promise<void> => {
  await api.delete(`/mood/${entryId}`);
};

/** Retorna o valor numérico de um MoodType */
export const getMoodValue = (mood: MoodType): number =>
  MOODS.find((m) => m.type === mood)?.value ?? 3;

/** Retorna config de um MoodType */
export const getMoodConfig = (mood: MoodType): MoodConfig =>
  MOODS.find((m) => m.type === mood) ?? MOODS[2];
