import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeMode, ThemeColors, lightColors, darkColors } from '../constants/theme';
import * as storage from '../utils/storage';

interface ThemeContextData {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    loadStoredTheme();
  }, []);

  const loadStoredTheme = async () => {
    try {
      const storedTheme = await storage.getTheme();
      if (storedTheme === 'dark' || storedTheme === 'light') {
        setTheme(storedTheme);
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await storage.setTheme(newTheme);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
