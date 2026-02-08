export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
}

export const lightColors: ThemeColors = {
  background: '#f5f5f5',
  surface: '#fff',
  surfaceSecondary: '#f9f9f9',
  textPrimary: '#333',
  textSecondary: '#666',
  textTertiary: '#999',
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  primary: '#4A90E2',
};

export const darkColors: ThemeColors = {
  background: '#1A252F',
  surface: '#243340',
  surfaceSecondary: '#1E2D38',
  textPrimary: '#E8E8E8',
  textSecondary: '#A0A8B0',
  textTertiary: '#6B7580',
  border: '#2D3E4A',
  borderLight: '#263545',
  primary: '#4A90E2',
};
