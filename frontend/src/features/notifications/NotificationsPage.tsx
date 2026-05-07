import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Square,
  BookOpen,
  Eye
} from 'lucide-react';
import { useNotificationService } from '../../services/notificationService';
import { useInventoryService } from '../../services/inventoryService';
import { useRecipeService } from '../../services/recipeService';
import { Notification } from '../../types';
import { useToast } from '../../shared/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../infrastructure/ui/UIContext';

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { viewRecipe } = useUI();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const notificationService = useNotificationService();
  const inventoryService = useInventoryService();
  const recipeService = useRecipeService();
  const { showToast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
      showToast(t('toasts.notifications.loadError'), 'error');
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

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, status: 'READ' } : n
      ));
    } catch (error) {
      showToast(t('toasts.notifications.markReadError'), 'error');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (isUnread(notification.status)) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.type === 'RECIPE_APPROVAL' && notification.targetId) {
      try {
        const recipe = await recipeService.getRecipeById(Number(notification.targetId));
        navigate('/recipes');
        // Give a small delay for navigation and component mount
        setTimeout(() => viewRecipe(recipe), 100);
      } catch (error) {
        console.error("Recipe could not be loaded", error);
        showToast(t('common.error'), 'error');
      }
    } else if (notification.type === 'INVITATION' || notification.type === 'LOW_STOCK') {
      navigate('/inventory');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, status: 'READ' })));
      showToast(t('toasts.notifications.markAllSuccess'), 'success');
    } catch (error) {
      showToast(t('toasts.notifications.markAllError'), 'error');
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
      setSelectedIds(selectedIds.filter(sid => sid !== id));
      showToast(t('toasts.notifications.deleteSuccess'), 'success');
    } catch (error) {
      showToast(t('toasts.notifications.deleteError'), 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(t('confirms.notifications.deleteSelected', { count: selectedIds.length }))) return;

    try {
      await notificationService.deleteSelected(selectedIds);
      setNotifications(notifications.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      showToast(t('toasts.notifications.deleteSuccess'), 'success');
    } catch (error) {
      showToast(t('toasts.notifications.deleteError'), 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm(t('confirms.notifications.clearAll'))) return;

    try {
      await notificationService.deleteAll();
      setNotifications([]);
      setSelectedIds([]);
      showToast(t('toasts.notifications.clearSuccess'), 'success');
    } catch (error) {
      showToast(t('toasts.notifications.markAllError'), 'error');
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
      showToast(t('common.accept'), 'success');
      fetchNotifications();
    } catch (error) {
      showToast(t('toasts.notifications.inviteAcceptError'), 'error');
    }
  };

  const handleRejectInvitation = async (invitationId: number, notificationId: number) => {
    try {
      await inventoryService.rejectInvitation(invitationId);
      await notificationService.markAsRead(notificationId);
      showToast(t('common.reject'), 'info');
      fetchNotifications();
    } catch (error) {
      showToast(t('toasts.notifications.inviteRejectError'), 'error');
    }
  };

  const handleApproveRecipe = async (recipeId: number, notificationId: number) => {
    try {
      await recipeService.approveRecipe(recipeId);
      await notificationService.markAsRead(notificationId);
      showToast(t('toasts.recipes.approveSuccess'), 'success');
      fetchNotifications();
    } catch (error) {
      showToast(t('toasts.recipes.approveError'), 'error');
    }
  };

  const handleRejectRecipe = async (recipeId: number, notificationId: number) => {
    try {
      await recipeService.rejectRecipe(recipeId);
      await notificationService.markAsRead(notificationId);
      showToast(t('toasts.recipes.rejectSuccess'), 'info');
      fetchNotifications();
    } catch (error) {
      showToast(t('toasts.recipes.rejectError'), 'error');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('notifications.time.justNow');
    if (diffInSeconds < 3600) return t('notifications.time.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('notifications.time.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 notification-type-recipe rounded-xl">
            <Bell size={28} />
          </div>
          <div>
            <h1 className="meal-section-title">{t('navigation.notifications')}</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('notifications.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium"
            title={selectedIds.length === notifications.length ? t('notifications.actions.deselect') : t('notifications.actions.selectAll')}
          >
            {selectedIds.length === notifications.length && notifications.length > 0 ? (
              <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
            ) : (
              <Square size={18} style={{ color: 'var(--color-text-muted)' }} />
            )}
            <span style={{ color: 'var(--color-text)' }}>
              {selectedIds.length === notifications.length && notifications.length > 0 
                ? t('notifications.actions.deselect') 
                : t('notifications.actions.selectAll')}
            </span>
          </button>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 size={18} />
              <span>{t('notifications.actions.deleteSelected')}</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 size={18} />
              <span>{t('notifications.actions.clearAll')}</span>
            </button>
          )}

          {notifications.some(n => n.status === 'UNREAD') && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-3 py-2 text-sm font-bold ml-auto transition-colors hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
            >
              <CheckCircle2 size={18} />
              {t('notifications.actions.markAllRead')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 meal-card border-dashed">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>{t('notifications.loading')}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 meal-card border-dashed">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-black/5 dark:bg-white/5">
            <Bell style={{ color: 'var(--color-text-muted)' }} size={32} />
          </div>
          <h3 className="text-lg font-bold mb-1">{t('navigation.notifications')}</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`relative meal-card !p-0 overflow-hidden transition-all duration-300 group cursor-pointer ${
                isUnread(notification.status)
                  ? 'ring-1 ring-[var(--color-primary)] ring-inset' 
                  : 'opacity-70 grayscale-[0.3]'
              } ${selectedIds.includes(notification.id) ? 'ring-2 !ring-[var(--color-primary)]' : ''}`}
            >
              <div className="p-5 flex gap-4">
                <div className="flex-shrink-0 flex flex-col items-center gap-3">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(notification.id);
                    }}
                    className={`cursor-pointer p-1 rounded transition-colors ${
                      selectedIds.includes(notification.id) ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {selectedIds.includes(notification.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  
                  <div className={`notification-icon-container ${
                    notification.type === 'INVITATION' 
                      ? 'notification-type-invitation'
                      : notification.type === 'SYSTEM' 
                        ? 'notification-type-system'
                        : notification.type === 'RECIPE_APPROVAL'
                          ? 'notification-type-recipe'
                          : 'notification-type-default'
                  }`}>
                    {notification.type === 'INVITATION' ? <Mail size={24} /> :
                     notification.type === 'SYSTEM' ? <Info size={24} /> :
                     notification.type === 'RECIPE_APPROVAL' ? <BookOpen size={24} /> :
                     <Bell size={24} />}
                  </div>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className={`font-bold truncate text-lg ${
                      isUnread(notification.status) ? '' : 'text-[var(--color-text-muted)]'
                    }`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Clock size={12} />
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title={t('inventory.itemList.colActions')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm leading-relaxed mb-4 ${
                    isUnread(notification.status) ? '' : 'text-[var(--color-text-muted)]'
                  }`}>
                    {notification.message}
                  </p>

                  {notification.type === 'INVITATION' && notification.invitationStatus === 'PENDING' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptInvitation(Number(notification.targetId), notification.id);
                        }}
                        className="btn-primary !px-4 !py-2 !text-sm flex items-center gap-2 active:scale-95"
                      >
                        <Check size={16} />
                        {t('common.accept')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectInvitation(Number(notification.targetId), notification.id);
                        }}
                        className="btn-secondary !px-4 !py-2 !text-sm flex items-center gap-2 active:scale-95"
                      >
                        <X size={16} />
                        {t('common.reject')}
                      </button>
                    </div>
                  )}

                  {notification.type === 'INVITATION' && notification.invitationStatus !== 'PENDING' && (
                    <div className="medical-badge w-fit">
                      <CheckCircle2 size={12} />
                      {notification.invitationStatus === 'ACCEPTED' ? t('common.accept') : t('common.reject')}
                    </div>
                  )}

                  {notification.type === 'RECIPE_APPROVAL' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/recipes?recipeId=${notification.targetId}`);
                        }}
                        className="btn-primary !px-4 !py-2 !text-sm flex items-center gap-2 active:scale-95"
                      >
                        <Eye size={16} />
                        {t('notifications.viewDetails')}
                      </button>
                      
                      {notification.recipeStatus === 'PENDING' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveRecipe(Number(notification.targetId), notification.id);
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95"
                          >
                            <Check size={16} />
                            {t('recipes.status.approved')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectRecipe(Number(notification.targetId), notification.id);
                            }}
                            className="btn-secondary !px-4 !py-2 !text-sm flex items-center gap-2 active:scale-95"
                          >
                            <X size={16} />
                            {t('recipes.status.rejected')}
                          </button>
                        </>
                      )}

                      {notification.recipeStatus !== 'PENDING' && notification.recipeStatus && (
                        <div className="medical-badge w-fit">
                          <CheckCircle2 size={12} />
                          {notification.recipeStatus === 'APPROVED' ? t('recipes.status.approved') : t('recipes.status.rejected')}
                        </div>
                      )}
                    </div>
                  )}

                  {isUnread(notification.status) && notification.type !== 'INVITATION' && notification.type !== 'RECIPE_APPROVAL' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      className="text-xs font-black uppercase tracking-widest flex items-center gap-1 transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      <Check size={12} />
                      {t('notifications.markRead')}
                    </button>
                  )}
                </div>
              </div>

              {isUnread(notification.status) && (
                <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
