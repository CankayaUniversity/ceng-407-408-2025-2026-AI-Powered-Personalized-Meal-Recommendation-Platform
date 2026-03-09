import React from 'react';
import { useAuth } from '../infrastructure/auth/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { authenticated, initialized, login } = useAuth();
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bu Sayfayı Görmek İçin Giriş Yapmalısınız</h2>
          <p className="text-gray-600 mb-6">Uygulamamızın tüm özelliklerinden faydalanmak için lütfen Keycloak hesabınızla oturum açın.</p>
          <button 
            onClick={handleLogin}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg w-full"
          >
            Hemen Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
