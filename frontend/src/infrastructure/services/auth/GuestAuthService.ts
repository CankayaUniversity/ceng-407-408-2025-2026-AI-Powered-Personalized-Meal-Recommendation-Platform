import {AuthService} from "./AuthService";
import {AuthUser} from "../../auth/AuthContext";
import type {LoggerService} from "../logging/LoggerService";

export class GuestAuthService implements AuthService {
    private readonly logger: LoggerService;
    private initialized = false;
    private authenticated = false;

    private authSuccessListeners: (() => void)[] = [];
    private authFailureListeners: (() => void)[] = [];
    private tokenRefreshSuccessListeners: (() => void)[] = [];
    private tokenRefreshErrorListeners: (() => void)[] = [];
    private unauthorizedErrorListeners: (() => void)[] = [];
    private forbiddenErrorListeners: (() => void)[] = [];

    private readonly guestUser: AuthUser = {
        id: "guest-id",
        username: "misafir",
        email: "guest@example.com",
        firstName: "Misafir",
        lastName: "Kullanıcı",
        roles: ["GUEST"]
    };

    constructor(logger: LoggerService) {
        this.logger = logger;
    }

    async init(): Promise<void> {
        this.logger.info("GuestAuthService initialized in guest mode.");
        this.initialized = true;
        // Misafir modunda başlangıçta authenticated false olsun, login butonuna basınca true olsun
        this.authenticated = false;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    isAuthenticated(): boolean {
        return this.authenticated;
    }

    async getAccessToken(): Promise<string | null> {
        return "guest-token";
    }

    getUser(): AuthUser | undefined {
        return this.authenticated ? this.guestUser : undefined;
    }

    async login(redirectUri?: string): Promise<void> {
        this.authenticated = true;
        this.authSuccessListeners.forEach(l => l());
        if (redirectUri) window.location.href = redirectUri;
    }

    async logout(redirectUri?: string): Promise<void> {
        this.authenticated = false;
        if (redirectUri) {
            window.location.href = redirectUri;
        } else {
            window.location.href = window.location.origin + "/";
        }
    }

    addAuthSuccessListener(listener: () => void): void { this.authSuccessListeners.push(listener); }
    removeAuthSuccessListener(listener: () => void): void { this.authSuccessListeners = this.authSuccessListeners.filter(l => l !== listener); }
    addAuthFailureListener(listener: () => void): void { this.authFailureListeners.push(listener); }
    removeAuthFailureListener(listener: () => void): void { this.authFailureListeners = this.authFailureListeners.filter(l => l !== listener); }
    addTokenRefreshSuccessListener(listener: () => void): void { this.tokenRefreshSuccessListeners.push(listener); }
    removeTokenRefreshSuccessListener(listener: () => void): void { this.tokenRefreshSuccessListeners = this.tokenRefreshSuccessListeners.filter(l => l !== listener); }
    addTokenRefreshErrorListener(listener: () => void): void { this.tokenRefreshErrorListeners.push(listener); }
    removeTokenRefreshErrorListener(listener: () => void): void { this.tokenRefreshErrorListeners = this.tokenRefreshErrorListeners.filter(l => l !== listener); }
    addUnauthorizedErrorListener(listener: () => void): void { this.unauthorizedErrorListeners.push(listener); }
    removeUnauthorizedErrorListener(listener: () => void): void { this.unauthorizedErrorListeners = this.unauthorizedErrorListeners.filter(l => l !== listener); }
    addForbiddenErrorListener(listener: () => void): void { this.forbiddenErrorListeners.push(listener); }
    removeForbiddenErrorListener(listener: () => void): void { this.forbiddenErrorListeners = this.forbiddenErrorListeners.filter(l => l !== listener); }
    handleUnauthorizedError(): void { this.unauthorizedErrorListeners.forEach(l => l()); }
    handleForbiddenError(): void { this.forbiddenErrorListeners.forEach(l => l()); }
}
