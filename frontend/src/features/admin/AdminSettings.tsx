import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    RefreshCcw, Database, AlertCircle, CheckCircle2, 
    Info, Server, ShieldAlert
} from 'lucide-react';
import { useAdminService } from '../../services/adminService';

const AdminSettings: React.FC = () => {
    const { t } = useTranslation();
    const adminService = useAdminService();
    
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleResetInventory = async () => {
        if (!window.confirm(t('admin.ingredients.resetConfirm'))) return;
        
        setActionLoading('reset');
        try {
            await adminService.resetTestInventory();
            setMessage({ type: 'success', text: t('admin.ingredients.successReset') });
        } catch (error) {
            setMessage({ type: 'error', text: t('admin.ingredients.errorReset') });
        } finally {
            setActionLoading(null);
        }
    };

    const handleSetupInventory = async () => {
        setActionLoading('setup');
        try {
            await adminService.setupTestInventory();
            setMessage({ type: 'success', text: t('admin.settings.successSetup') });
        } catch (error) {
            setMessage({ type: 'error', text: t('admin.ingredients.errorReset') }); // Reusing generic error
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="max-w-4xl space-y-8">
            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                        : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-medium">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">{t('common.close')}</button>
                </div>
            )}

            <section className="space-y-6">
                <div className="flex items-center gap-3 text-espresso-midnight dark:text-alabaster mb-2">
                    <div className="p-2.5 bg-terracotta/10 rounded-xl text-terracotta">
                        <Database size={22} />
                    </div>
                    <h2 className="text-xl font-bold font-serif">{t('admin.settings.dataTitle')}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white dark:bg-espresso-midnight/40 rounded-3xl border border-espresso/10 dark:border-white/5 shadow-sm space-y-6 transition-all hover:shadow-md">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400 shadow-sm">
                                <RefreshCcw size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-espresso-midnight dark:text-alabaster">{t('admin.settings.resetInventoryTitle')}</h3>
                                <p className="text-sm text-espresso/50 dark:text-alabaster/40 mt-1.5 leading-relaxed">
                                    {t('admin.settings.resetInventoryDesc')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleResetInventory}
                            disabled={!!actionLoading}
                            className="w-full py-3 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {actionLoading === 'reset' ? <RefreshCcw size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                            {t('admin.settings.resetButton')}
                        </button>
                    </div>

                    <div className="p-6 bg-white dark:bg-espresso-midnight/40 rounded-3xl border border-espresso/10 dark:border-white/5 shadow-sm space-y-6 transition-all hover:shadow-md">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-terracotta/10 dark:bg-terracotta/20 rounded-2xl text-terracotta shadow-sm">
                                <Server size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-espresso-midnight dark:text-alabaster">{t('admin.settings.setupInventoryTitle')}</h3>
                                <p className="text-sm text-espresso/50 dark:text-alabaster/40 mt-1.5 leading-relaxed">
                                    {t('admin.settings.setupInventoryDesc')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSetupInventory}
                            disabled={!!actionLoading}
                            className="w-full py-3 bg-terracotta/10 text-terracotta dark:bg-terracotta/20 dark:text-terracotta rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-terracotta/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {actionLoading === 'setup' ? <Server size={16} className="animate-spin" /> : <Server size={16} />}
                            {t('admin.settings.setupButton')}
                        </button>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3 text-espresso-midnight dark:text-alabaster mb-2">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                        <ShieldAlert size={22} />
                    </div>
                    <h2 className="text-xl font-bold font-serif">{t('admin.settings.securityTitle')}</h2>
                </div>
                
                <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-3xl flex items-start gap-5 shadow-sm">
                    <div className="p-3 bg-white dark:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400 shadow-sm shrink-0">
                        <Info size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-red-800 dark:text-red-400">{t('admin.settings.infoTitle')}</h3>
                        <p className="text-sm text-red-700/70 dark:text-red-400/60 mt-2 leading-relaxed">
                            {t('admin.settings.infoDesc')}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AdminSettings;
