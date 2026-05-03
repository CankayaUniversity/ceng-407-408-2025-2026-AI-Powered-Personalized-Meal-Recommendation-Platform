import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Settings as SettingsIcon, Mail, Lock, ExternalLink, ShieldCheck } from 'lucide-react';
import { useUI } from '../../infrastructure/ui/UIContext';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import ModalPortal from '../../shared/components/ModalPortal';

const SettingsModal: React.FC = () => {
    const { t } = useTranslation();
    const { isSettingsOpen, closeSettings } = useUI();
    const { user, keycloak } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');

    if (!isSettingsOpen) return null;

    const handleKeycloakAction = (action: 'UPDATE_PASSWORD' | 'UPDATE_PROFILE' | 'UPDATE_EMAIL') => {
        if (keycloak) {
            // Bir önceki çalışan versiyona geri dönüyoruz:
            // Doğrudan keycloak.login kullanarak aynı sekmede yönlendirme yapıyoruz
            // Yeni sekmede açmak (window.open + createLoginUrl) bazı session/state hatalarına yol açabiliyor
            keycloak.login({
                action: action,
                redirectUri: window.location.origin
            });
        }
    };

    const handleKeycloakAccountConsole = () => {
        if (keycloak) {
            // Account Console URL'ini alıp yeni sekmede açıyoruz (Bu buton için yeni sekme istendi)
            const url = keycloak.createAccountUrl();
            window.open(url, '_blank');
        } else {
            alert(t("settings.keycloak.redirect"));
        }
    };

    return (
        <ModalPortal>
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-espresso-midnight/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={closeSettings}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-espresso-midnight rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex h-full flex-col md:flex-row">
                    
                    {/* Sidebar */}
                    <div className="w-full md:w-64 bg-black/[0.02] dark:bg-white/[0.02] border-r border-black/5 dark:border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-terracotta/10 rounded-xl text-terracotta">
                                <SettingsIcon size={20} />
                            </div>
                            <h2 className="text-lg font-bold tracking-tight">{t("settings.title")}</h2>
                        </div>

                        <nav className="space-y-1">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-white dark:bg-white/10 text-terracotta shadow-sm' : 'text-black/40 dark:text-white/40 hover:text-terracotta hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                <Mail size={18} />
                                {t("settings.tabs.general")}
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'security' ? 'bg-white dark:bg-white/10 text-terracotta shadow-sm' : 'text-black/40 dark:text-white/40 hover:text-terracotta hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                <Lock size={18} />
                                {t("settings.tabs.security")}
                            </button>
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-h-[400px]">
                        <header className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-sm uppercase tracking-widest text-black/40 dark:text-white/40">
                                {activeTab === 'general' ? t('settings.tabs.general') : t('settings.tabs.securityTitle')}
                            </h3>
                            <button 
                                onClick={closeSettings}
                                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-black/40 dark:text-white/40 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 p-8">
                            {activeTab === 'general' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40 ml-1">
                                            {t("settings.emailLabel")}
                                        </label>
                                        <div className="flex items-center gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 text-black/60 dark:text-white/60">
                                            <Mail size={18} />
                                            <span className="text-sm font-medium">{user?.email}</span>
                                        </div>
                                        <p className="text-[11px] text-black/40 dark:text-white/40 italic ml-1 leading-relaxed">
                                            {t("settings.email.managed")}
                                        </p>
                                    </div>

                                    <div className="pt-4 flex flex-col gap-3">
                                        <button 
                                            onClick={() => handleKeycloakAction('UPDATE_PROFILE')}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-terracotta text-white rounded-2xl font-bold text-sm shadow-lg shadow-terracotta/20 hover:scale-[1.02] active:scale-95 transition-all"
                                        >
                                            {t("settings.actions.editAccount")}
                                            <ExternalLink size={16} />
                                        </button>
                                        <p className="text-[10px] text-black/40 dark:text-white/40 text-center px-4 leading-relaxed">
                                            {t("settings.keycloak.hint")}
                                        </p>
                                        <button 
                                            onClick={handleKeycloakAccountConsole}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 rounded-2xl font-bold text-xs hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                                        >
                                            {t("settings.actions.allSecurity")}
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="p-6 bg-terracotta/5 rounded-[2rem] border border-terracotta/10 space-y-4">
                                        <div className="flex items-center gap-3 text-terracotta">
                                            <ShieldCheck size={24} />
                                            <h4 className="font-bold text-lg">{t("settings.security.title")}</h4>
                                        </div>
                                        <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                                            {t("settings.security.desc")}
                                        </p>
                                    </div>

                                    <button 
                                        onClick={() => handleKeycloakAction('UPDATE_PASSWORD')}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-espresso-midnight dark:bg-white dark:text-espresso-midnight text-white rounded-2xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        {t("settings.actions.changePassword")}
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <footer className="p-6 bg-black/[0.01] dark:bg-white/[0.01] border-t border-black/5 dark:border-white/5">
                            <p className="text-[10px] text-center text-black/30 dark:text-white/20 font-medium">
                                {t("settings.footer")}
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
};

export default SettingsModal;
