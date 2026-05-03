import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Utensils, User as UserIcon,
    LogOut, ChevronLeft, ChevronRight, Moon, Sun, Boxes, Sparkles, Plus,
    Bell, Settings, Check, X, Calculator, BarChart2, Info
} from 'lucide-react';
import amblem from '../../assets/meal_amblem.png';
import logoDark from '../../assets/meal_logo_dark.png';
import logoLight from '../../assets/meal_logo_light.png';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useTheme } from '../../infrastructure/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNotificationService } from '../../services/notificationService';
import { useInventoryService } from '../../services/inventoryService';
import { Notification } from '../../types';
import { useToast } from '../hooks/useToast';

import { UIProvider, useUI } from '../../infrastructure/ui/UIContext';
import ConsumptionModal from '../../features/consumption/components/ConsumptionModal';
import SettingsModal from '../../features/profile/SettingsModal';
import UnitConverterModal from '../components/UnitConverterModal';

const formatTimeAgo = (date: Date, locale: string) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return locale === 'tr' ? 'şimdi' : 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return locale === 'tr' ? `${diffInMinutes} dk önce` : `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return locale === 'tr' ? `${diffInHours} sa önce` : `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return locale === 'tr' ? `${diffInDays} gün önce` : `${diffInDays}d ago`;
    
    return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US');
};

// Separate content component so useUI hook can be used inside Layout
const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated, user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { openConsumption, openSettings, openUnitConverter } = useUI();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const notificationService = useNotificationService();
    const inventoryService = useInventoryService();
    const { showToast } = useToast();

    const [expanded, setExpanded] = useState(() => {
        const saved = localStorage.getItem('sidebar-expanded');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const isUnread = (status: string | any) => {
        if (!status) return false;
        return status.toString().toUpperCase() === 'UNREAD';
    };

    const isRead = (status: string | any) => {
        if (!status) return false;
        return status.toString().toUpperCase() === 'READ';
    };

    useEffect(() => {
        if (authenticated) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [authenticated]);

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
            const unread = data.filter(n => n.status === 'UNREAD').length;
            setUnreadCount(unread);
        } catch (error) {
            console.error("Notifications could not be fetched", error);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, status: 'READ' } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Could not mark as read", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, status: 'READ' })));
            setUnreadCount(0);
            showToast(t('toasts.notifications.allRead'), 'success');
        } catch (error) {
            console.error("Could not mark all as read", error);
            showToast(t('common.error'), 'error');
        }
    };

    const handleAcceptInvitation = async (invitationId: number, notificationId: number) => {
        try {
            await inventoryService.acceptInvitation(invitationId);
            await notificationService.markAsRead(notificationId);
            showToast(t('toasts.inventory.invitationAccepted'), 'success');
            fetchNotifications();
        } catch (error) {
            showToast(t('toasts.inventory.invitationAcceptError'), 'error');
        }
    };

    const handleRejectInvitation = async (invitationId: number, notificationId: number) => {
        try {
            await inventoryService.rejectInvitation(invitationId);
            await notificationService.markAsRead(notificationId);
            showToast(t('toasts.inventory.invitationRejected'), 'info');
            fetchNotifications();
        } catch (error) {
            showToast(t('toasts.inventory.invitationRejectError'), 'error');
        }
    };

    useEffect(() => {
        localStorage.setItem('sidebar-expanded', JSON.stringify(expanded));
    }, [expanded]);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const shouldShowSidebar = authenticated || location.pathname !== '/about';

    const menuItems = [
        { id: 'dashboard', text: t('navigation.home'), icon: <LayoutDashboard size={20} />, route: '/dashboard' },
        { id: 'recipes', text: t('navigation.recipes'), icon: <Utensils size={20} />, route: '/recipes', private: true },
        { id: 'analysis', text: t('navigation.analysis'), icon: <BarChart2 size={20} />, route: '/history', private: true },
        { id: 'inventory', text: t('navigation.inventory'), icon: <Boxes size={20} />, route: '/inventory', private: true },
        { id: 'recommendations', text: t('navigation.recommendations'), icon: <Sparkles size={20} />, route: '/recommendations', private: true },
        { id: 'profile', text: t('navigation.profile'), icon: <UserIcon size={20} />, route: '/profile', private: true },
        { id: 'about', text: t('landing.footer.about'), icon: <Info size={20} />, route: '/about' },
    ];

    const visibleItems = menuItems.filter(item => !item.private || authenticated);

    return (
        <div className="flex h-screen bg-background dark:bg-espresso-midnight transition-colors duration-500 overflow-hidden font-sans text-espresso-midnight dark:text-alabaster">

            {/* --- SIDEBAR --- */}
            {shouldShowSidebar && (
                <aside className={`
                    relative z-50 flex flex-col bg-sidebar dark:bg-black/40 dark:backdrop-blur-3xl border-r border-black/5 dark:border-white/5 transition-all duration-500 ease-in-out
                    ${expanded ? 'w-72' : 'w-24'}
                `}>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="absolute -right-3.5 top-10 z-[70] flex h-7 w-7 items-center justify-center rounded-full bg-terracotta text-white shadow-xl hover:scale-110 active:scale-95 transition-all border border-white/20"
                    >
                        {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div className={`flex items-center ${expanded ? 'pl-4 p-8 mb-6 justify-start' : 'p-4 mb-4 justify-center'}`}>
                        <Link to="/" className="flex items-center gap-1 group">
                            <div className="meal-brand-amblem-container sidebar-amblem-box bg-transparent border-none shadow-none">
                                <img src={amblem} alt="MealAI Amblem" className="meal-brand-amblem-img" />
                            </div>
                            {expanded && (
                                <div className="h-14 meal-brand-logo-container animate-in fade-in slide-in-from-left-2 bg-transparent border-none shadow-none">
                                    <img
                                        src={isDark ? logoDark : logoLight}
                                        alt="MealAI"
                                        className="meal-brand-logo-img"
                                    />
                                </div>
                            )}
                        </Link>
                    </div>

                    <nav className="flex-1 px-4 py-2 overflow-y-auto scrollbar-hide">
                        <ul className="space-y-1.5">
                            {visibleItems.map((item) => {
                                const isActive = location.pathname === item.route;
                                return (
                                    <li key={item.id}>
                                        <Link
                                            to={item.route}
                                            className={`
                                                group relative flex items-center px-4 py-3.5 rounded-xl transition-all duration-300
                                                ${isActive
                                                ? 'bg-black/5 dark:bg-white/10 text-espresso-midnight dark:text-white shadow-sm'
                                                : 'text-black/40 dark:text-alabaster/40 hover:text-terracotta dark:hover:text-alabaster hover:bg-black/5 dark:hover:bg-white/5'}
                                                ${expanded ? 'gap-4' : 'justify-center'}
                                            `}
                                        >
                                            {isActive && <div className="absolute left-0 w-1 h-5 bg-terracotta rounded-r-full shadow-[0_0_10px_rgba(231,76,60,0.5)]" />}
                                            <span className={`transition-colors duration-300 ${isActive ? 'text-terracotta' : 'text-black/20 dark:text-white/20 group-hover:text-terracotta'}`}>
                                                {item.icon}
                                            </span>
                                            {expanded && <span className="text-sm font-medium tracking-wide whitespace-nowrap">{item.text}</span>}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    <div className="p-6">
                        {authenticated && (
                            <button onClick={logout} className={`w-full flex items-center rounded-xl text-black/40 dark:text-alabaster/40 hover:text-red-500 hover:bg-red-500/10 transition-all group ${expanded ? 'px-4 py-3.5 gap-4' : 'p-3.5 justify-center'}`}>
                                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                                {expanded && <span className="text-[10px] font-black uppercase tracking-widest">{t('actions.logout')}</span>}
                            </button>
                        )}
                    </div>
                </aside>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 relative flex flex-col min-w-0 overflow-hidden bg-background dark:bg-espresso-midnight transition-colors duration-500">

                {/* HEADER */}
                <header className="h-20 z-40 flex items-center justify-end px-8 gap-6 bg-header dark:bg-black/20 backdrop-blur-xl border-b border-black/5 dark:border-white/5">

                    {/* ADD MEAL BUTTON (Global Trigger) */}
                    {authenticated && (
                        <div className="mr-auto flex items-center gap-2">
                            <button
                                onClick={openConsumption}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-terracotta/20 bg-terracotta/5 hover:bg-terracotta hover:text-white transition-all text-terracotta font-bold text-xs shadow-sm hover:shadow-terracotta/20 active:scale-95"
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span className="hidden md:block tracking-wide">{t('layout.addMeal')}</span>
                            </button>
                            <button
                                onClick={openUnitConverter}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-espresso-midnight/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-espresso-midnight dark:hover:bg-white hover:text-white dark:hover:text-espresso-midnight transition-all text-espresso-midnight dark:text-white font-bold text-xs shadow-sm active:scale-95"
                                title={t('layout.unitConverter')}
                            >
                                <Calculator size={16} />
                                <span className="hidden lg:block tracking-wide uppercase">{t('layout.units')}</span>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                        {['en', 'tr'].map((lng) => (
                            <button key={lng} onClick={() => changeLanguage(lng)} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${i18n.language === lng ? 'bg-white dark:bg-terracotta text-espresso-midnight dark:text-white shadow-sm' : 'text-black/40 dark:text-alabaster/40 hover:text-terracotta'}`}>
                                {lng.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-black/40 dark:text-alabaster/40 hover:text-terracotta transition-all border border-black/5 dark:border-white/5">
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {authenticated && (
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowNotifications(!showNotifications);
                                    setShowProfileMenu(false);
                                }}
                                className={`p-2.5 rounded-xl transition-all border border-black/5 dark:border-white/5 relative ${showNotifications ? 'bg-terracotta text-white' : 'bg-black/5 dark:bg-white/5 text-black/40 dark:text-alabaster/40 hover:text-terracotta'}`}
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-espresso-midnight">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-black/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]">
                                    <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                                        <h3 className="text-sm font-bold tracking-tight">{t('notifications.title')}</h3>
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="text-[10px] font-black text-terracotta hover:underline uppercase tracking-widest"
                                        >
                                            {t('notifications.markAllRead')}
                                        </button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Bell className="mx-auto mb-3 text-black/10 dark:text-white/10" size={32} />
                                                <p className="text-xs text-black/40 dark:text-alabaster/40">{t('notifications.empty')}</p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleMarkAsRead(n.id)}
                                                    className={`p-4 border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group ${n.status === 'UNREAD' ? 'bg-terracotta/[0.02]' : ''}`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className={`text-xs font-bold ${isUnread(n.status) ? 'text-espresso-midnight dark:text-white' : 'text-black/40 dark:text-alabaster/40'}`}>
                                                            {n.title}
                                                        </p>
                                                        <span className="text-[9px] text-black/20 dark:text-white/20 whitespace-nowrap ml-2">
                                                            {formatTimeAgo(new Date(n.createdAt), i18n.language)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] leading-relaxed text-black/60 dark:text-alabaster/60">
                                                        {n.message}
                                                    </p>
                                                    {n.type === 'INVITATION' && isUnread(n.status) && (
                                                        <div className="mt-3 flex gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAcceptInvitation(Number(n.targetId), n.id);
                                                                }}
                                                                className="flex-1 py-1.5 bg-terracotta text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-terracotta/90 transition-all"
                                                            >
                                                                <Check size={12} />
                                                                {t('notifications.accept')}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRejectInvitation(Number(n.targetId), n.id);
                                                                }}
                                                                className="flex-1 py-1.5 bg-black/5 dark:bg-white/5 text-black/60 dark:text-alabaster/60 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                                                            >
                                                                <X size={12} />
                                                                {t('notifications.reject')}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {n.type === 'INVITATION' && isRead(n.status) && (
                                                        <div className="mt-2 flex items-center gap-1 text-[9px] font-medium text-black/30 dark:text-white/30">
                                                            <Check size={10} />
                                                            {t('notifications.answered')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] text-center">
                                        <Link
                                            to="/notifications"
                                            className="text-[10px] font-bold text-black/40 dark:text-alabaster/40 hover:text-terracotta uppercase tracking-wider"
                                            onClick={() => setShowNotifications(false)}
                                        >
                                            {t('notifications.viewAll')}
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {authenticated && (
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowProfileMenu(!showProfileMenu);
                                    setShowNotifications(false);
                                }}
                                className="flex items-center gap-3 pl-6 border-l border-black/10 dark:border-white/10 group cursor-pointer"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold group-hover:text-terracotta transition-colors">{user?.name || user?.firstName}</p>
                                    <p className="text-[10px] uppercase text-black/40 dark:text-alabaster/25 tracking-wider font-medium">{user?.email}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner transition-all duration-300 ${showProfileMenu ? 'bg-terracotta text-white scale-105 shadow-lg' : 'bg-terracotta/10 border border-terracotta/20 text-terracotta group-hover:scale-105 group-hover:shadow-lg'}`}>
                                    {user?.name?.charAt(0) || user?.firstName?.charAt(0)}
                                </div>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-4 w-56 bg-white dark:bg-black/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]">
                                    <div className="p-4 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                                        <p className="text-xs font-bold">{user?.name || user?.firstName}</p>
                                        <p className="text-[10px] text-black/40 dark:text-alabaster/40 truncate">{user?.email}</p>
                                    </div>
                                    <div className="p-2">
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-black/60 dark:text-alabaster/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-terracotta transition-all"
                                            onClick={() => setShowProfileMenu(false)}
                                        >
                                            <UserIcon size={16} />
                                            {t('layout.myProfile')}
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                openSettings();
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-black/60 dark:text-alabaster/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-terracotta transition-all"
                                        >
                                            <Settings size={16} />
                                            {t('layout.settings')}
                                        </button>
                                    </div>
                                    <div className="p-2 border-t border-black/5 dark:border-white/5">
                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                logout();
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/5 transition-all"
                                        >
                                            <LogOut size={16} />
                                            {t('actions.logout')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </header>

                {/* MAIN */}
                <main className="flex-1 overflow-y-auto scroll-smooth relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-terracotta/[0.03] blur-[120px] rounded-full pointer-events-none" />
                    <div className="mx-auto max-w-[1500px] min-h-full p-8 md:p-12 animate-in fade-in duration-700">
                        {children}
                    </div>
                </main>
            </div>

            {/* MODALS */}
            <ConsumptionModal />
            <SettingsModal />
            <UnitConverterModal />
        </div>
    );
};

// Main Layout: UIProvider wrapping here
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <UIProvider>
            <LayoutContent>{children}</LayoutContent>
        </UIProvider>
    );
};

export default MainLayout;
