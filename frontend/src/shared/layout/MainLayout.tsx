import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChefHat, LayoutDashboard, Utensils, User as UserIcon, LogOut, ChevronLeft, ChevronRight, Globe, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useTheme } from '../../infrastructure/theme/ThemeContext';
import { useTranslation } from 'react-i18next';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated, user, logout, login } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [expanded, setExpanded] = React.useState(true);

    const location = useLocation();
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const menuItems = [
        { id: 'dashboard', text: t('navigation.home'), icon: <LayoutDashboard size={24} strokeWidth={1.5} />, route: '/dashboard' },
        { id: 'recipes', text: t('navigation.recipes'), icon: <Utensils size={24} strokeWidth={1.5} />, route: '/recipes', private: true },
        { id: 'profile', text: t('navigation.profile'), icon: <UserIcon size={24} strokeWidth={1.5} />, route: '/profile', private: true },
    ];

    const visibleItems = menuItems.filter(item => !item.private || authenticated);

    return (
        <div className="flex min-h-screen bg-alabaster dark:bg-[#1A1817] transition-colors duration-300">
            {/* Sidebar */}
            <aside className={`bg-espresso-midnight text-alabaster transition-all duration-500 flex flex-col shadow-2xl dark:bg-black/40 dark:backdrop-blur-xl ${expanded ? 'w-72' : 'w-24'}`}>
                <div className="p-8 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-terracotta rounded-xl shadow-lg shadow-terracotta/20">
                            <ChefHat className="text-white min-w-[24px] w-6 h-6" />
                        </div>
                        {expanded && <span className="text-2xl font-serif font-bold tracking-tight text-white whitespace-nowrap">Chef AI</span>}
                    </Link>
                </div>

                <nav className="flex-1 py-8 px-4">
                    <ul className="space-y-4">
                        {visibleItems.map((item) => {
                            const isActive = location.pathname === item.route;
                            return (
                                <li key={item.id}>
                                    <Link
                                        to={item.route}
                                        className={`group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${
                                            isActive 
                                                ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20' 
                                                : 'text-alabaster/60 hover:text-alabaster hover:bg-white/5'
                                        }`}
                                    >
                                        <span className={`${isActive ? 'text-white' : 'text-alabaster/40 group-hover:text-terracotta'} transition-colors`}>
                                            {item.icon}
                                        </span>
                                        {expanded && <span className="font-medium tracking-wide">{item.text}</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-6">
                    <div className={`mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 ${expanded ? 'block' : 'hidden'}`}>
                        <div className="flex items-center justify-between mb-2">
                             <Globe size={16} className="text-alabaster/40" />
                             <div className="flex gap-3">
                                <button 
                                    onClick={toggleTheme}
                                    className="p-2 rounded-lg bg-white/5 text-alabaster/40 hover:text-terracotta transition-colors"
                                    title={isDark ? "Light Mode" : "Dark Mode"}
                                >
                                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                                </button>
                                <button 
                                    onClick={() => changeLanguage('en')}
                                    className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-md transition-all ${i18n.language === 'en' ? 'bg-terracotta text-white' : 'text-alabaster/40 hover:text-alabaster'}`}
                                >
                                    EN
                                </button>
                                <button 
                                    onClick={() => changeLanguage('tr')}
                                    className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-md transition-all ${i18n.language === 'tr' ? 'bg-terracotta text-white' : 'text-alabaster/40 hover:text-alabaster'}`}
                                >
                                    TR
                                </button>
                             </div>
                        </div>
                    </div>

                    {authenticated ? (
                        <div className="space-y-4">
                            {expanded && (
                                <div className="px-4 py-2">
                                    <p className="text-sm font-serif font-bold text-white truncate">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-alabaster/40 truncate">{user?.email}</p>
                                </div>
                            )}
                            <button
                                onClick={() => logout()}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-alabaster/40 hover:text-white hover:bg-red-500/20 transition-all`}
                            >
                                <LogOut size={20} />
                                {expanded && <span className="font-medium tracking-wide">{t('actions.logout')}</span>}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => login()}
                            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-terracotta text-white hover:bg-terracotta/90 transition-all shadow-xl shadow-terracotta/20`}
                        >
                            <UserIcon size={20} />
                            {expanded && <span className="font-medium tracking-wide">{t('actions.login')}</span>}
                        </button>
                    )}
                    
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className="mt-6 w-full flex justify-center p-2 text-alabaster/20 hover:text-terracotta transition-colors"
                    >
                        {expanded ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <main className="flex-1 p-10 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
