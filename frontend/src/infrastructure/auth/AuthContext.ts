import React, {useContext} from 'react';

export interface AuthUser {
    id: string;
    username: string;
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
}

interface AuthContextType {
    initialized: boolean;
    authenticated: boolean;
    user?: AuthUser;
    login: () => Promise<void>;
    register: () => Promise<void>;
    logout: () => Promise<void>;
    error?: string | null;
    authService?: any;
    keycloak?: any;
}

export const AuthContext = React.createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthContextProvider');
    }
    return context;
};

export const useAuthService = () => {
    const context = useContext(AuthContext);
    if (context === null || !context.authService) {
        throw new Error('useAuthService must be used within an AuthContextProvider');
    }
    return context.authService;
};
