import React from 'react';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ChefHat, User as UserIcon, LayoutDashboard, Utensils, LogOut, LogIn } from 'lucide-react';
import keycloak from './keycloak';
import PrivateRoute from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import RecipeList from './pages/RecipeList';
import Profile from './pages/Profile';

const App: React.FC = () => {
  const eventLogger = (event: unknown, error: unknown) => {
    console.log('onKeycloakEvent', event, error);
  };

  const tokenLogger = (tokens: unknown) => {
    console.log('onKeycloakTokens', tokens);
  };

  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{ 
        onLoad: 'check-sso',
        checkLoginIframe: false
      }}
      onEvent={eventLogger}
      onTokens={tokenLogger}
    >
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          {/* Navbar */}
          <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <Link to="/" className="flex items-center gap-2">
                <ChefHat className="text-orange-500 w-8 h-8" />
                <span className="text-xl font-bold tracking-tight text-gray-900">MealApp</span>
              </Link>
              <div className="flex gap-6 items-center">
                <NavigationLinks />
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/recipes"
                element={
                  <PrivateRoute>
                    <RecipeList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            &copy; 2024 AI Meal Recommendation Platform. Tüm hakları saklıdır.
          </footer>
        </div>
      </Router>
    </ReactKeycloakProvider>
  );
};

const NavigationLinks: React.FC = () => {
  const { keycloak } = useKeycloak();
  
  return (
    <>
      <Link to="/dashboard" className="flex items-center gap-1 hover:text-orange-500 transition-colors">
        <LayoutDashboard size={18} />
        <span>Panel</span>
      </Link>
      <Link to="/recipes" className="flex items-center gap-1 hover:text-orange-500 transition-colors">
        <Utensils size={18} />
        <span>Tarifler</span>
      </Link>
      {keycloak.authenticated ? (
        <div className="flex items-center gap-4">
          <Link to="/profile" className="bg-orange-500 p-2 rounded-full cursor-pointer hover:bg-orange-600 transition-colors">
            <UserIcon className="text-white w-5 h-5" />
          </Link>
          <button 
            onClick={() => keycloak.logout()} 
            className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Çıkış</span>
          </button>
        </div>
      ) : (
        <button 
          onClick={() => keycloak.login()} 
          className="flex items-center gap-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
        >
          <LogIn size={18} />
          <span>Giriş Yap</span>
        </button>
      )}
    </>
  );
};

const Home: React.FC = () => {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-extrabold mb-6">
        {keycloak.authenticated 
          ? <>Hoş Geldin, <span className="text-orange-500">{keycloak.tokenParsed?.preferred_username}</span></>
          : <>Size Özel <span className="text-orange-500">Yemek Önerileri</span></>
        }
      </h1>
      <p className="text-gray-600 text-xl max-w-2xl mx-auto mb-10">
        {keycloak.authenticated
          ? "Kişisel panelinize giderek size özel tarifleri incelemeye devam edebilirsiniz."
          : "Yapay zeka destekli platformumuz ile damak tadınıza ve beslenme alışkanlıklarınıza en uygun tarifleri keşfedin."
        }
      </p>
      <div className="flex justify-center gap-4">
        {keycloak.authenticated ? (
          <Link 
            to="/dashboard" 
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
          >
            Panele Git
          </Link>
        ) : (
          <>
            <button 
              onClick={() => keycloak.login()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
            >
              Hemen Başla
            </button>
            <button 
              onClick={() => keycloak.login()}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-xl font-semibold transition-colors shadow-sm"
            >
              Giriş Yap
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
