import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../infrastructure/auth/AuthContext';
import { useLocation } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactElement;
  roles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
  const { t } = useTranslation();
  const { authenticated, initialized, login, user } = useAuth();
  const location = useLocation();

  console.log('PrivateRoute - initialized:', initialized, 'authenticated:', authenticated, 'at:', location.pathname);

  if (!initialized) {
    return null; // AuthGate will handle the global loading state
  }

  if (!authenticated) {
    const handleLogin = () => {
      console.log('Login button clicked in PrivateRoute');
      login();
    };

    console.log('Not authenticated, showing login prompt for:', location.pathname);
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('auth.loginRequired')}</h2>
          <p className="text-gray-600 mb-6">{t('auth.loginDescription')}</p>
          <button 
            onClick={handleLogin}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg w-full"
          >
            {t('auth.loginButton')}
          </button>
        </div>
      </div>
    );
  }

  // Check roles if provided
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some(role => user?.roles?.includes(role));
    if (!hasRequiredRole) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-4">
          <div className="bg-red-50 p-8 rounded-3xl border border-red-100 max-w-md shadow-sm">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17 2 2 4-4"/><path d="m18 10 3-3 2 2"/><circle cx="12" cy="12" r="10"/><path d="m3.4 10.6 3 3 2-2"/></svg>
             </div>
             <h2 className="text-2xl font-bold text-gray-900 mb-3">Erişim Engellendi</h2>
             <p className="text-gray-600 mb-8">Bu bölüme erişmek için gerekli yetkiye sahip değilsiniz. Lütfen yönetici ile iletişime geçin.</p>
             <button 
                onClick={() => window.history.back()}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all"
             >
                Geri Dön
             </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default PrivateRoute;
