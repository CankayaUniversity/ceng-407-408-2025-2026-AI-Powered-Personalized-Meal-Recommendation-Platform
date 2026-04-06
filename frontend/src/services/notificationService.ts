import { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { Notification } from '../types';

export const getNotificationService = (api: AxiosInstance) => ({
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('/v1/notifications');
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<number>('/v1/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (notificationId: number): Promise<void> => {
    await api.post(`/v1/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/v1/notifications/read-all');
  }
});

export const useNotificationService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getNotificationService(api), [api]);
};
