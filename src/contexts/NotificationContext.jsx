import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { notificationAPI } from "../services/api";

// Crear el contexto
const NotificationContext = createContext();
export { NotificationContext };

// Provider del contexto
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar notificaciones existentes desde la API
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notificationAPI.getAllNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error("NotificationContext: Error loading notifications", error);
      // Error cargando notificaciones
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Agregar nueva notificación
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      // Evitar duplicados
      const exists = prev.some((notif) => notif.id === notification.id);
      if (exists) return prev;

      // Mapear la notificación del WebSocket al formato esperado
      const mappedNotification = {
        id: notification.id || Date.now(),
        title: notification.title || "Nueva notificación",
        message: notification.message || notification.content || "",
        read: notification.read || false,
        createdAt:
          notification.createdAt ||
          notification.timestamp ||
          new Date().toISOString(),
        type: notification.type || "message",
        ...notification,
      };

      return [mappedNotification, ...prev];
    });
  }, []);

  // Eliminar notificación
  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
  }, []);

  // Marcar como leída
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        // Actualizar en el estado local inmediatamente para UX rápida
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );

        // Actualizar en el servidor
        await notificationAPI.markAsRead(notificationId);

        // Emitir evento
        window.dispatchEvent(
          new CustomEvent("notificationUpdated", {
            detail: { type: "markAsRead", notificationId },
          })
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
        // Error marcando notificación como leída - recargar para sincronizar
        loadNotifications();
      }
    },
    [loadNotifications]
  );

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);

    // Marcar todas como leídas localmente primero para UX rápida
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));

    // Intentar marcar en el servidor
    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          notificationAPI.markAsRead(notification.id)
        )
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      // Error marcando todas las notificaciones como leídas
      loadNotifications();
    }
  }, [notifications, loadNotifications]);

  // Obtener contador de notificaciones no leídas
  const unreadCount = useMemo(() => {
    return notifications.filter((notif) => !notif.read).length;
  }, [notifications]);

  // Obtener las notificaciones más recientes
  const recentNotifications = useMemo(() => {
    return notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10); // Limitar a las 10 más recientes
  }, [notifications]);

  // Configurar WebSocket listeners cuando el contexto se inicializa - DESHABILITADO
  useEffect(() => {
    // ...existing code...

    // Cargar notificaciones iniciales solo si hay usuario autenticado
    const checkAuthAndLoad = () => {
      const token = document.cookie.match(/authToken=([^;]+)/)?.[1];
      if (token) {
        loadNotifications();

        // ...existing code...
      }
    };

    checkAuthAndLoad();

    return () => {
      // ...existing code...
    };
  }, [addNotification, loadNotifications]);

  const value = {
    notifications,
    recentNotifications,
    unreadCount,
    isLoading,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
