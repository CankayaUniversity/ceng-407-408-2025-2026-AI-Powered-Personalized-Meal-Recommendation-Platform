import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ChefHat, LayoutDashboard, Utensils, User as UserIcon,
    LogOut, ChevronLeft, ChevronRight, Moon, Sun, Boxes, Sparkles, Plus
} from 'lucide-react'; // Plus ikonunu ekledik
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useTheme } from '../../infrastructure/theme/ThemeContext';
import { useTranslation } from 'react-i18next';

import { UIProvider, useUI } from '../../infrastructure/ui/UIContext';
import ConsumptionModal from '../../components/ConsumptionModal';

// İçerik kısmını ayrı bir bileşene alıyoruz ki useUI hook'unu Layout içinde kullanabilelim
const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated, user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { openConsumption } = useUI(); // UIContext'ten açma fonksiyonunu aldık
    const location = useLocation();
    const { t, i18n } = useTranslation();

    const [expanded, setExpanded] = useState(() => {
        const saved = localStorage.getItem('sidebar-expanded');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('sidebar-expanded', JSON.stringify(expanded));
    }, [expanded]);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const menuItems = [
        { id: 'dashboard', text: t('navigation.home'), icon: <LayoutDashboard size={20} />, route: '/dashboard' },
        { id: 'recipes', text: t('navigation.recipes'), icon: <Utensils size={20} />, route: '/recipes', private: true },
        { id: 'inventory', text: t('navigation.inventory'), icon: <Boxes size={20} />, route: '/inventory', private: true },
        { id: 'recommendations', text: t('navigation.recommendations'), icon: <Sparkles size={20} />, route: '/recommendations', private: true },
        { id: 'profile', text: t('navigation.profile'), icon: <UserIcon size={20} />, route: '/profile', private: true },
    ];

    const visibleItems = menuItems.filter(item => !item.private || authenticated);

    return (
        <div className="flex h-screen bg-alabaster dark:bg-espresso-midnight transition-colors duration-500 overflow-hidden font-sans text-espresso-midnight dark:text-alabaster">

            {/* --- SIDEBAR --- */}
            <aside className={`
                relative z-50 flex flex-col bg-white dark:bg-black/40 dark:backdrop-blur-3xl border-r border-black/5 dark:border-white/5 transition-all duration-500 ease-in-out
                ${expanded ? 'w-72' : 'w-24'}
            `}>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="absolute -right-3.5 top-10 z-[70] flex h-7 w-7 items-center justify-center rounded-full bg-terracotta text-white shadow-xl hover:scale-110 active:scale-95 transition-all border border-white/20"
                >
                    {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>

                <div className={`p-8 mb-6 flex items-center ${expanded ? 'justify-start' : 'justify-center'}`}>
                    <Link to="/" className="flex items-center gap-4 group">
                        <div className="p-2 bg-terracotta rounded-xl shadow-lg shadow-terracotta/20 min-w-[40px] flex items-center justify-center group-hover:rotate-6 transition-transform">
                            <ChefHat className="text-white w-6 h-6" />
                        </div>
                        {expanded && (
                            <span className="text-xl font-serif font-bold tracking-tight text-espresso-midnight dark:text-white animate-in fade-in slide-in-from-left-2 whitespace-nowrap">
                                Meal<span className="text-terracotta">AI</span>
                            </span>
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

            {/* --- ANA İÇERİK ALANI --- */}
            <div className="flex-1 relative flex flex-col min-w-0 overflow-hidden bg-alabaster dark:bg-espresso-midnight transition-colors duration-500">

                {/* HEADER */}
                <header className="h-20 z-40 flex items-center justify-end px-8 gap-6 bg-white/70 dark:bg-black/20 backdrop-blur-xl border-b border-black/5 dark:border-white/5">

                    {/* --- YENİ: ÖĞÜN EKLE BUTONU (Global Trigger) --- */}
                    {authenticated && (
                        <button
                            onClick={openConsumption}
                            className="mr-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-terracotta/20 bg-terracotta/5 hover:bg-terracotta hover:text-white transition-all text-terracotta font-bold text-xs shadow-sm hover:shadow-terracotta/20 active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            <span className="hidden md:block tracking-wide">ÖĞÜN EKLE</span>
                        </button>
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
                        <Link to="/profile" className="flex items-center gap-3 pl-6 border-l border-black/10 dark:border-white/10 group cursor-pointer">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold group-hover:text-terracotta transition-colors">{user?.firstName}</p>
                                <p className="text-[10px] uppercase text-black/40 dark:text-alabaster/25 tracking-wider font-medium">{user?.email}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center text-terracotta font-bold text-sm shadow-inner group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
                                {user?.firstName?.charAt(0)}
                            </div>
                        </Link>
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

            {/* PANEL BURADA GİZLİ BEKLİYOR */}
            <ConsumptionModal />
        </div>
    );
};

// Ana Layout: Provider sarmalamasını burada yapıyoruz
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <UIProvider>
            <LayoutContent>{children}</LayoutContent>
        </UIProvider>
    );
};

export default MainLayout;
