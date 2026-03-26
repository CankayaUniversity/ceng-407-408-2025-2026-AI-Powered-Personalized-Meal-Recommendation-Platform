import React, {useCallback, useEffect, useState, useMemo} from 'react';
import {AuthContext, AuthUser} from './AuthContext';
import {useService} from '../di';
import {AuthServiceKey, LoggerServiceKey} from '../services';

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const authService = useService(AuthServiceKey);
    const logger = useService(LoggerServiceKey);

    const [initialized, setInitialized] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthUser | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const updateState = useCallback(() => {
        setInitialized(authService.isInitialized());
        setAuthenticated(authService.isAuthenticated());
        setUser(authService.getUser());
    }, [authService]);

    useEffect(() => {
        const successListener = () => {
            logger.info('Auth success');
            updateState();
        };
        const failureListener = () => {
            logger.error('Auth failure');
            updateState();
        };

        authService.addAuthSuccessListener(successListener);
        authService.addAuthFailureListener(failureListener);
        authService.addTokenRefreshSuccessListener(updateState);
        authService.addTokenRefreshErrorListener(updateState);

        authService.init()
            .then(() => {
                updateState();
            })
            .catch(err => {
                logger.error('Auth init error', err);
                // err null veya undefined olabilir, ya da message alanı olmayabilir
                const errorMessage = err?.message || (typeof err === 'string' ? err : 'Keycloak bağlantısı kurulamadı.');
                setError(errorMessage);
                // initialization bitti ama hata ile bitti
                setInitialized(true);
            });

        return () => {
            authService.removeAuthSuccessListener(successListener);
            authService.removeAuthFailureListener(failureListener);
            authService.removeTokenRefreshSuccessListener(updateState);
            authService.removeTokenRefreshErrorListener(updateState);
        };
    }, [updateState]);

    const login = useCallback(async () => {
        await authService.login(window.location.href);
    }, [authService]);

    const register = useCallback(async () => {
        await authService.register(window.location.href);
    }, [authService]);

    const logout = useCallback(async () => {
        await authService.logout(window.location.origin);
    }, [authService]);

    const value = useMemo(() => ({
        initialized,
        authenticated,
        user,
        login,
        register,
        logout,
        error,
        authService
    }), [initialized, authenticated, user, login, register, logout, error]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
