import React from 'react';
import { Navigate, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './infrastructure/auth/AuthContext';
import axios from 'axios';
import { ServiceRegistry, ServiceProvider } from './infrastructure/di';
import { AuthServiceKey, HttpClientKey, LoggerServiceKey } from './infrastructure/services';
import { KeycloakAuthService } from './infrastructure/services/auth/KeycloakAuthService';
import { GuestAuthService } from './infrastructure/services/auth/GuestAuthService';
import { ConsoleLoggerService } from './infrastructure/services/logging/ConsoleLoggerService';
import { AuthContextProvider } from './infrastructure/auth/AuthContextProvider';
import { ThemeProvider } from './infrastructure/theme/ThemeContext';
import AuthGate from './infrastructure/auth/AuthGate';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './shared/layout/MainLayout';
import LandingPage from './features/landing-page/LandingPage';
import Dashboard from './features/dashboard/Dashboard';
import RecipeList from './features/recipes/RecipeList';
import Profile from './features/profile/Profile';
import InventoryPage from './features/inventory/InventoryPage';
import keycloakConfig from './keycloak-config.json';
import type { AuthService } from './infrastructure/services/auth/AuthService';

// Initialize Service Registry
const registry = new ServiceRegistry();

// Create instances for DI
const logger = new ConsoleLoggerService();

let authService: AuthService;

if (keycloakConfig.enabled) {
  authService = new KeycloakAuthService({
    url: keycloakConfig.url,
    realm: keycloakConfig.realm,
    clientId: keycloakConfig.clientId,
    logging: keycloakConfig.logging
  }, logger);
} else {
  authService = new GuestAuthService(logger);
}

const httpClient = axios.create({
  baseURL: '/api',
});

// Register services
registry.register(LoggerServiceKey, () => logger);
registry.register(AuthServiceKey, () => authService);
registry.register(HttpClientKey, () => httpClient);

// Configure Axios Interceptor
// Moved inside App or a dedicated hook/service to ensure it has access to authService correctly
httpClient.interceptors.request.use(async (config) => {
  const token = await authService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const App: React.FC = () => {
  return (
    <ServiceProvider registry={registry}>
      <ThemeProvider>
        <AuthContextProvider>
          <AuthGate>
            <Router>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route
                  path="/dashboard"
                  element={
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  }
                />
                <Route
                  path="/recipes"
                  element={
                    <PrivateRoute>
                      <MainLayout>
                        <RecipeList />
                      </MainLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <MainLayout>
                        <Profile />
                      </MainLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <PrivateRoute>
                      <MainLayout>
                        <InventoryPage />
                      </MainLayout>
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthGate>
        </AuthContextProvider>
      </ThemeProvider>
    </ServiceProvider>
  );
};

// Redirect to dashboard if authenticated, or show landing page if not
const HomeRedirect: React.FC = () => {
  const { authenticated } = useAuth();
  
  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
};

export default App;
