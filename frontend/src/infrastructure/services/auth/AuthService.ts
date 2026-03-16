import {AuthUser} from "../../auth/AuthContext";

export interface AuthService {
    init(): Promise<void>;
    isInitialized(): boolean;
    isAuthenticated(): boolean;
    getAccessToken(): Promise<string | null>;
    getUser(): AuthUser | undefined;
    login(redirectUri?: string): Promise<void>;
    logout(redirectUri?: string): Promise<void>;
    addAuthSuccessListener(listener: () => void): void;
    removeAuthSuccessListener(listener: () => void): void;
    addAuthFailureListener(listener: () => void): void;
    removeAuthFailureListener(listener: () => void): void;
    addTokenRefreshSuccessListener(listener: () => void): void;
    removeTokenRefreshSuccessListener(listener: () => void): void;
    addTokenRefreshErrorListener(listener: () => void): void;
    removeTokenRefreshErrorListener(listener: () => void): void;
    addUnauthorizedErrorListener(listener: () => void): void;
    removeUnauthorizedErrorListener(listener: () => void): void;
    addForbiddenErrorListener(listener: () => void): void;
    removeForbiddenErrorListener(listener: () => void): void;
    handleUnauthorizedError(): void;
    handleForbiddenError(): void;
}
