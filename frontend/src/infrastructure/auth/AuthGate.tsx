import React from 'react';
import {useAuth} from './AuthContext';
import { AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import keycloakConfig from '../../keycloak-config.json';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const { initialized, error } = useAuth();
    const { t } = useTranslation();

    if (!initialized) {
        return <LoadingSpinner fullScreen size="lg" message={t('auth.loading')} />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 p-6 text-center">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-red-50 max-w-lg w-full">
                    <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                        <AlertCircle className="text-red-500 w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">{t('auth.connectionFailed')}</h2>
                    <p className="text-gray-500 text-lg leading-relaxed mb-10 px-4">
                        {error} <br/>
                        <span className="text-gray-400 text-base mt-2 block">{t('auth.connectionHint')}</span>
                    </p>
                    
                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-8 py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-100 group"
                        >
                            <RefreshCw size={22} className="group-hover:rotate-180 transition-transform duration-500" />
                            {t('auth.retry')}
                        </button>

                        <button 
                            onClick={() => {
                                // This button is only visible on error and gives the user a hint about "Guest Mode"
                                alert(t('auth.guestModeAlert'));
                            }}
                            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 px-8 py-5 rounded-2xl font-bold transition-all border border-gray-200 flex items-center justify-center gap-3"
                        >
                            <LogIn size={20} />
                            {t('auth.guestModeInfo')}
                        </button>
                    </div>

                    {!keycloakConfig.enabled && (
                        <div className="mt-8 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                            <p className="text-orange-700 font-medium text-sm">
                                {t('auth.guestModeActive')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGate;
