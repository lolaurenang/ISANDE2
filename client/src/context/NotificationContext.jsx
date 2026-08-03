/**
 * Keeps the unread badge in sync across every page and polls quietly in
 * the background so a mechanic sees a new assignment without refreshing.
 */
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { notificationsApi } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);
const POLL_MS = 60000;

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.list();
      setItems(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      /* a failed poll is not worth interrupting the user */
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return undefined;
    }
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [user, refresh]);

  const markRead = useCallback(async (id) => {
    await notificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ items, unreadCount, refresh, markRead, markAllRead }),
    [items, unreadCount, refresh, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
