import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import {
  InAppNotification,
  getUnreadCount,
  getNotifications,
  markAsRead as markAsReadService,
  markAllAsRead as markAllAsReadService,
} from '../services/inAppNotificationService';

interface NotificationContextData {
  notifications: InAppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextData>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

const POLL_INTERVAL_MS = 60_000; // poll a cada 60 segundos

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [countResult, listResult] = await Promise.all([
        getUnreadCount(),
        getNotifications(1, 30),
      ]);
      setUnreadCount(countResult);
      setNotifications(listResult.notifications);
    } catch {
      // Silently fail — don't disrupt the user experience
    }
  }, [isAuthenticated]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
  }, [refresh]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial fetch and polling when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      refresh().finally(() => setLoading(false));
      startPolling();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      stopPolling();
    }
    return () => stopPolling();
  }, [isAuthenticated, refresh, startPolling, stopPolling]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refresh();
      }
      appState.current = nextState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refresh]);

  const markAsRead = useCallback(async (id: string) => {
    await markAsReadService(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadService();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
