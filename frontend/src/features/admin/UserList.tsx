import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Search, Trash2, Shield, User as UserIcon, 
    ShieldCheck, Loader2 
} from 'lucide-react';
import { useAdminService } from '../../services/adminService';
import { useToast } from '../../shared/hooks/useToast';
import { User } from '../../types';

const UserList: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const adminService = useAdminService();
    
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAllUsers(searchTerm);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
            showToast(t('admin.users.errorLoad'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm(t('admin.users.deleteConfirm'))) return;
        
        setActionLoading(id);
        try {
            await adminService.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            showToast(t('admin.users.successDelete'), 'success');
        } catch (error) {
            showToast(t('admin.users.errorDelete'), 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleRole = async (user: User) => {
        const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
        const confirmMsg = t('admin.users.roleUpdateConfirm', { name: user.name, role: newRole });
        
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(user.id);
        try {
            const updatedUser = await adminService.updateUserRole(user.id, newRole);
            setUsers(users.map(u => u.id === user.id ? updatedUser : u));
            showToast(t('admin.users.successRoleUpdate'), 'success');
        } catch (error) {
            showToast(t('admin.users.errorRoleUpdate'), 'error');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso/30 dark:text-alabaster/30 group-focus-within:text-terracotta transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder={t('admin.users.searchPlaceholder')}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-espresso-midnight/40 border border-espresso/10 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-terracotta/10 focus:border-terracotta transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-espresso-midnight/40 rounded-3xl border border-espresso/10 dark:border-white/5 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-espresso/[0.02] dark:bg-white/[0.02] border-b border-espresso/10 dark:border-white/5">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-espresso/40 dark:text-white/40">{t('admin.users.table.user')}</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-espresso/40 dark:text-white/40">{t('admin.users.table.email')}</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-espresso/40 dark:text-white/40">{t('admin.users.table.role')}</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-espresso/40 dark:text-white/40 text-right">{t('admin.users.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-espresso/5 dark:divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-5"><div className="h-4 bg-espresso/5 dark:bg-white/5 rounded-lg w-32"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-espresso/5 dark:bg-white/5 rounded-lg w-48"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-espresso/5 dark:bg-white/5 rounded-lg w-16"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-espresso/5 dark:bg-white/5 rounded-lg w-20 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-espresso/40 dark:text-white/30 italic">
                                        {t('admin.users.noUserFound')}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-espresso/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-terracotta/10 dark:bg-terracotta/20 flex items-center justify-center text-terracotta shadow-inner">
                                                    {user.profileImageUrl ? (
                                                        <img src={user.profileImageUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <UserIcon size={16} />
                                                    )}
                                                </div>
                                                <span className="font-semibold text-espresso-midnight dark:text-alabaster">{user.name || t('admin.users.unnamed')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-espresso/60 dark:text-alabaster/50 text-sm">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                user.role === 'ADMIN' 
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                                    : 'bg-terracotta/10 text-terracotta dark:bg-terracotta/20 dark:text-terracotta'
                                            }`}>
                                                {user.role === 'ADMIN' ? <Shield size={12} strokeWidth={2.5} /> : <UserIcon size={12} strokeWidth={2.5} />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                <button
                                                    onClick={() => handleToggleRole(user)}
                                                    disabled={actionLoading === user.id}
                                                    title={user.role === 'ADMIN' ? t('admin.users.makeUser') : t('admin.users.makeAdmin')}
                                                    className="p-2 text-espresso/40 hover:text-amber-600 dark:text-white/40 dark:hover:text-amber-400 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl shadow-sm border border-espresso/5 dark:border-white/5 bg-white dark:bg-espresso-midnight"
                                                >
                                                    {actionLoading === user.id ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    disabled={actionLoading === user.id}
                                                    title={t('admin.users.deleteUser')}
                                                    className="p-2 text-espresso/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl shadow-sm border border-espresso/5 dark:border-white/5 bg-white dark:bg-espresso-midnight"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserList;
