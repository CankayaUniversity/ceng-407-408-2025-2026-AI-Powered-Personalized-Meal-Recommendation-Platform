import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChefHat, LayoutDashboard, Utensils, User as UserIcon, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useService } from '../../infrastructure/di';
import { LoggerServiceKey } from '../../infrastructure/services';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated, user, logout, login } = useAuth();
    const [expanded, setExpanded] = React.useState(true);
    const location = useLocation();
    const logger = useService(LoggerServiceKey);

    const menuItems = [
        { id: 'dashboard', text: 'Panel', icon: <LayoutDashboard size={20} />, route: '/dashboard' },
        { id: 'recipes', text: 'Tarifler', icon: <Utensils size={20} />, route: '/recipes', private: true },
        { id: 'profile', text: 'Profil', icon: <UserIcon size={20} />, route: '/profile', private: true },
    ];

    const visibleItems = menuItems.filter(item => !item.private || authenticated);

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${expanded ? 'w-64' : 'w-20'}`}>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 overflow-hidden">
                        <ChefHat className="text-orange-500 min-w-[32px] w-8 h-8" />
                        {expanded && <span className="text-xl font-bold tracking-tight text-gray-900 whitespace-nowrap">AI Meal</span>}
                    </Link>
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                        {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                <nav className="flex-1 py-4">
                    <ul className="space-y-1 px-3">
                        {visibleItems.map((item) => (
                            <li key={item.id}>
                                <Link
                                    to={item.route}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                        location.pathname === item.route 
                                            ? 'bg-orange-50 text-orange-600' 
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className={location.pathname === item.route ? 'text-orange-500' : 'text-gray-400'}>
                                        {item.icon}
                                    </span>
                                    {expanded && <span className="font-medium">{item.text}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-200">
                    {authenticated ? (
                        <div className="space-y-1">
                            {expanded && (
                                <div className="px-3 py-2 mb-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                            )}
                            <button
                                onClick={() => logout()}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors`}
                            >
                                <LogOut size={20} />
                                {expanded && <span className="font-medium">Çıkış Yap</span>}
                            </button>
                        </div>
                    ) : (
                        <div className="px-3">
                            <button
                                onClick={() => login()}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100`}
                            >
                                <UserIcon size={20} />
                                {expanded && <span className="font-medium">Giriş Yap</span>}
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                <main className="flex-1 p-8">
                    {children}
                </main>
                <footer className="px-8 py-6 border-t border-gray-200 text-center text-gray-500 text-sm bg-white">
                    &copy; 2024 AI Meal Recommendation Platform. Tüm hakları saklıdır.
                </footer>
            </div>
        </div>
    );
};

export default MainLayout;
