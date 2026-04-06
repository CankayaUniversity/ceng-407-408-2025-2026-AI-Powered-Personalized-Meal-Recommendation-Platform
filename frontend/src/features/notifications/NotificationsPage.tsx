import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  Mail, 
  Clock, 
  Info,
  CheckCircle2,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { useNotificationService } from '../../services/notificationService';
import { useInventoryService } from '../../services/inventoryService';
import { Notification } from '../../types';
import { useToast } from '../../shared/hooks/useToast';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const notificationService = useNotificationService();
  const inventoryService = useInventoryService();
  const { showToast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
      showToast('Bildirimler yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const isUnread = (status: string | any) => {
    if (!status) return false;
    return status.toString().toUpperCase() === 'UNREAD';
  };

  const isRead = (status: string | any) => {
    if (!status) return false;
    return status.toString().toUpperCase() === 'READ';
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, status: 'READ' } : n
      ));
    } catch (error) {
      showToast('Bildirim işaretlenemedi', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, status: 'READ' })));
      showToast('Tüm bildirimler okundu olarak işaretlendi', 'success');
    } catch (error) {
      showToast('Hata oluştu', 'error');
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      showToast('Bildirim silindi', 'success');
    } catch (error) {
      showToast('Bildirim silinemedi', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} adet bildirimi silmek istediğinize emin misiniz?`)) return;

    try {
      await notificationService.deleteSelected(selectedIds);
      setNotifications(notifications.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      showToast('Seçili bildirimler silindi', 'success');
    } catch (error) {
      showToast('Silme işlemi sırasında hata oluştu', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm('Tüm bildirimleri silmek istediğinize emin misiniz?')) return;

    try {
      await notificationService.deleteAll();
      setNotifications([]);
      setSelectedIds([]);
      showToast('Tüm bildirimler silindi', 'success');
    } catch (error) {
      showToast('Hata oluştu', 'error');
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const handleAcceptInvitation = async (invitationId: number, notificationId: number) => {
    try {
      await inventoryService.acceptInvitation(invitationId);
      await notificationService.markAsRead(notificationId);
      showToast('Davet kabul edildi', 'success');
      fetchNotifications();
    } catch (error) {
      showToast('Davet kabul edilirken hata oluştu', 'error');
    }
  };

  const handleRejectInvitation = async (invitationId: number, notificationId: number) => {
    try {
      await inventoryService.rejectInvitation(invitationId);
      await notificationService.markAsRead(notificationId);
      showToast('Davet reddedildi', 'info');
      fetchNotifications();
    } catch (error) {
      showToast('Davet reddedilirken hata oluştu', 'error');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Az önce';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
            <Bell size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
            <p className="text-gray-500">Tüm aktivitelerinizi buradan takip edebilirsiniz</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title={selectedIds.length === notifications.length ? "Seçimi Kaldır" : "Tümünü Seç"}
          >
            {selectedIds.length === notifications.length && notifications.length > 0 ? (
              <CheckSquare size={20} className="text-indigo-600" />
            ) : (
              <Square size={20} />
            )}
          </button>
          
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Seçilenleri Sil"
            >
              <Trash2 size={20} />
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Tümünü Temizle"
            >
              <Trash2 size={20} />
            </button>
          )}

          {notifications.some(n => n.status === 'UNREAD') && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 ml-2"
            >
              <CheckCircle2 size={16} />
              Tümünü Okundu İşaretle
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Bildirimler yükleniyor...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
            <Bell className="text-gray-300" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Bildiriminiz bulunmuyor</h3>
          <p className="text-gray-500">Yeni bir gelişme olduğunda burada görünecektir.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => isUnread(notification.status) && handleMarkAsRead(notification.id)}
              className={`relative bg-white rounded-2xl border transition-all duration-200 group ${
                isUnread(notification.status)
                  ? 'border-indigo-100 bg-indigo-50/30 cursor-pointer hover:bg-indigo-50/50' 
                  : 'border-gray-100 opacity-80'
              } ${selectedIds.includes(notification.id) ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
            >
              <div className="p-5 flex gap-4">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(notification.id);
                    }}
                    className={`cursor-pointer p-1 rounded transition-colors ${
                      selectedIds.includes(notification.id) ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'
                    }`}
                  >
                    {selectedIds.includes(notification.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    notification.type === 'INVITATION' 
                      ? (isRead(notification.status) ? 'bg-amber-50 text-amber-400' : 'bg-amber-100 text-amber-600')
                      : notification.type === 'SYSTEM' 
                        ? (isRead(notification.status) ? 'bg-blue-50 text-blue-400' : 'bg-blue-100 text-blue-600')
                        : (isRead(notification.status) ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 text-gray-600')
                  }`}>
                    {notification.type === 'INVITATION' ? <Mail size={24} /> :
                     notification.type === 'SYSTEM' ? <Info size={24} /> :
                     <Bell size={24} />}
                  </div>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className={`font-bold truncate ${
                      isUnread(notification.status) ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm leading-relaxed mb-4 ${
                    isUnread(notification.status) ? 'text-gray-700' : 'text-gray-400 line-clamp-1 hover:line-clamp-none transition-all duration-300'
                  }`}>
                    {notification.message}
                  </p>

                  {notification.type === 'INVITATION' && isUnread(notification.status) && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptInvitation(Number(notification.targetId), notification.id);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 active:scale-95"
                      >
                        <Check size={16} />
                        Kabul Et
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectInvitation(Number(notification.targetId), notification.id);
                        }}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <X size={16} />
                        Reddet
                      </button>
                    </div>
                  )}

                  {notification.type === 'INVITATION' && isRead(notification.status) && (
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 w-fit px-2 py-1 rounded-md">
                      <CheckCircle2 size={12} />
                      Bu davet yanıtlandı veya okundu olarak işaretlendi
                    </div>
                  )}

                  {isUnread(notification.status) && notification.type !== 'INVITATION' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
                    >
                      <Check size={12} />
                      Okundu olarak işaretle
                    </button>
                  )}
                </div>
              </div>

              {isUnread(notification.status) && (
                <div className="absolute top-5 right-0 w-1.5 h-1.5 bg-indigo-600 rounded-full translate-x-3"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
