import React from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { Navigate, useLocation } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { keycloak, initialized } = useKeycloak();
  const location = useLocation();

  console.log('PrivateRoute - initialized:', initialized, 'authenticated:', keycloak.authenticated, 'at:', location.pathname);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Oturum bilgileri doğrulanıyor... ({location.pathname})</p>
        </div>
      </div>
    );
  }

  if (!keycloak.authenticated) {
    const handleLogin = () => {
      console.log('Login button clicked in PrivateRoute');
      keycloak.login({ redirectUri: 'http://localhost:3000' + location.pathname });
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
