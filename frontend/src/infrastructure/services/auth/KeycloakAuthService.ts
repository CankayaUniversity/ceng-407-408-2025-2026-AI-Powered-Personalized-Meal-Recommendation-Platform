import Keycloak from 'keycloak-js';
import type {LoggerService} from '../logging/LoggerService';
import type {AuthService} from './AuthService';
import {AuthUser} from "../../auth/AuthContext";

interface ServiceConfig {
    url: string;
    realm: string;
    clientId: string;
    logging: boolean;
}

export class KeycloakAuthService implements AuthService {

    private readonly config: ServiceConfig;
    private readonly logger: LoggerService;

    private readonly keycloak: Keycloak;
    private initialized = false;
    private authenticated = false;

    private authSuccessListeners: (() => void)[] = [];
    private authFailureListeners: (() => void)[] = [];

    private tokenRefreshSuccessListeners: (() => void)[] = [];
    private tokenRefreshErrorListeners: (() => void)[] = [];

    private unauthorizedErrorListeners: (() => void)[] = [];
    private forbiddenErrorListeners: (() => void)[] = [];

    private initPromise: Promise<void> | null = null;

    constructor(cfg: ServiceConfig, logger: LoggerService) {
        this.config = cfg;
        this.logger = logger;

        this.keycloak = new Keycloak({
            url: cfg.url,
            realm: cfg.realm,
            clientId: cfg.clientId,
        });

        this.keycloak.onAuthSuccess = () => {
            this.authSuccessListeners.forEach(listener => listener());
        }

        this.keycloak.onAuthError = () => {
            this.authFailureListeners.forEach(listener => listener());
        }
    }

    async init(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = this.doInit();
        }

        return this.initPromise;
    }

    private async doInit(): Promise<void> {
        try {
            const authenticated = await this.keycloak.init({
                onLoad: 'check-sso',
                silentCheckSsoRedirectUri: (globalThis.location?.origin ?? '') + '/silent-check-sso.html',
                pkceMethod: 'S256',
                checkLoginIframe: false,
                enableLogging: this.config.logging,
            });

            this.initialized = true;
            this.authenticated = authenticated;

            if (!authenticated) {
                return;
            }

            this.keycloak.onAuthRefreshSuccess = () => {
                this.authenticated = true;
                this.tokenRefreshSuccessListeners.forEach(listener => listener());
            };

            this.keycloak.onAuthRefreshError = () => {
                this.authenticated = false;
                this.tokenRefreshErrorListeners.forEach(listener => listener());
            }

            this.keycloak.onTokenExpired = async () => {
                try {
                    await this.keycloak.updateToken(60);
                }
                catch (_err) {
                    this.authenticated = false;
                }
            };
        }
        catch (e) {
            this.logger.error('KeycloakAuthService initialization failed', e);
            throw e;
        }
    }

    isInitialized(): boolean {
        return !!this.keycloak && this.initialized;
    }

    isAuthenticated(): boolean {
        return this.authenticated && !!this.keycloak.token;
    }

    async getAccessToken(): Promise<string | null> {
        if (!this.keycloak.token) {
            return null;
        }
        await this.ensureToken(30);
        return this.keycloak.token || null;
    }

    getUser(): AuthUser | undefined {
        if (!this.keycloak.tokenParsed) {
            return undefined;
        }

        const tp = this.keycloak.tokenParsed as any;
        return {
            id: tp.sub,
            username: tp.preferred_username,
            email: tp.email,
            firstName: tp.given_name,
            lastName: tp.family_name,
            roles: tp.realm_access?.roles || [],
        };
    }

    private async ensureToken(minValiditySeconds: number = 30): Promise<string | null> {
        try {
            await this.keycloak.updateToken(minValiditySeconds);
            this.authenticated = true;
            return this.keycloak.token || null;
        }
        catch (_err) {
            this.authenticated = false;
            return null;
        }
    }

    async login(redirectUri?: string): Promise<void> {
        await this.keycloak.login({redirectUri});
    }

    /**
     * Logout akışında cookie/storage temizliği
     *
     * Mevcut davranış (minimal ve güvenli):
     * - Sadece auth ile ilişkili anahtarlar hedeflenir: localStorage('auth','user'), sessionStorage (tam temizlik).
     * - Çerez tarafında best-effort silme yapılır (JSESSIONID, KC_RESTART ve mevcut origin altındaki diğer isimler için path=/ ve domain=host denemeleri).
     * - Nihai bitiş Keycloak `logout()` ile sunucu tarafında session/token geçersizleştirmedir (HttpOnly çerezler tarayıcıdan silinemez; sunucu sonlandırır).
     *
     * İleride özelleştirme yapmanız gerekirse:
     * - Hedefli sessionStorage temizliği: `sessionStorage.clear()` yerine yalnızca auth anahtarlarını kaldırın (örn. 'kc_token', 'kc_id_token').
     * - Kullanıcı tercihlerini koruma: localStorage içinde tema/dil vb. için farklı adlandırma kullanın (örn. 'pref.theme','pref.lang') ve burada sadece 'auth','user' silinmeye devam edin.
     * - Çerez listesi: Best-effort yerine yalnızca bilinen auth çerezlerini silmek için `COOKIE_WHITELIST` gibi bir sabit dizi tanımlayıp aşağıdaki döngüde sadece o isimleri deneyin.
     * - Kurumsal ortamlar: Domain önekleri (örn. .example.com) ve farklı path’ler için ek varyasyonlar ekleyebilirsiniz.
     * - Güvenlik: Silme operasyonlarında hata alınsa bile logout bloklanmaz; Keycloak `logout()` çağrısı mutlaka çalışır.
     *
     * Dikkat:
     * - "Oturumu açık tut" davranışı logout ile kasıtlı olarak sonlandırılır; bu fonksiyonu etkilemek istemiyorsanız logout’u tetiklemeyin.
     * - HttpOnly çerezler JS ile silinemez; temizliği sunucu tarafı yapar.
     */
    async logout(redirectUri?: string): Promise<void> {
        this.authenticated = false;

        // Minimal ve güvenli: Uygulama kapsamındaki storage ve temel çerezleri temizle
        try {
            // Local/Session storage temizliği (yalnızca mevcut origin için)
            globalThis.sessionStorage?.clear();
            // Uygulama verilerini korumak isterseniz burada belirli anahtarları seçerek de silebilirsiniz
            globalThis.localStorage?.removeItem('auth');
            globalThis.localStorage?.removeItem('user');
        } catch (e) {
            this.logger.warn?.('Storage clear failed (non-blocking)', e as Error);
        }

        try {
            // Basit çerez temizliği: path ve domain varyasyonları için best-effort
            const cookieStr = globalThis.document?.cookie ?? '';
            const cookies = cookieStr ? cookieStr.split(';') : [];
            for (const raw of cookies) {
                const name = raw.split('=')[0]?.trim();
                if (!name) continue;
                // Uygulama ile ilişkili yaygın çerezleri hedefleyelim (genel temizlik)
                const candidates = ['JSESSIONID', 'KC_RESTART', name];
                for (const c of candidates) {
                    if (globalThis.document) { globalThis.document.cookie = `${c}=; Max-Age=0; path=/;`; }
                    // Domain varyasyonu (mevcut host)
                    if (globalThis.document) { globalThis.document.cookie = `${c}=; Max-Age=0; path=/; domain=${globalThis.location?.hostname}`; }
                }
            }
        } catch (e) {
            this.logger.warn?.('Cookie clear failed (non-blocking)', e as Error);
        }

        await this.keycloak.logout({
            redirectUri: redirectUri || globalThis.location?.origin
        });
    }

    private removeListener(listeners: (() => void)[], listener: () => void): void {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
            listeners.splice(index, 1);
        }
    }

    addAuthSuccessListener(listener: () => void): void {
        this.authSuccessListeners.push(listener);
    }

    removeAuthSuccessListener(listener: () => void): void {
        this.removeListener(this.authSuccessListeners, listener);
    }

    addAuthFailureListener(listener: () => void): void {
        this.authFailureListeners.push(listener);
    }

    removeAuthFailureListener(listener: () => void): void {
        this.removeListener(this.authFailureListeners, listener);
    }

    addTokenRefreshSuccessListener(listener: () => void): void {
        this.tokenRefreshSuccessListeners.push(listener);
    }

    removeTokenRefreshSuccessListener(listener: () => void): void {
        this.removeListener(this.tokenRefreshSuccessListeners, listener);
    }

    addTokenRefreshErrorListener(listener: () => void): void {
        this.tokenRefreshErrorListeners.push(listener);
    }

    removeTokenRefreshErrorListener(listener: () => void): void {
        this.removeListener(this.tokenRefreshErrorListeners, listener);
    }

    addUnauthorizedErrorListener(listener: () => void): void {
        this.unauthorizedErrorListeners.push(listener);
    }

    removeUnauthorizedErrorListener(listener: () => void): void {
        this.removeListener(this.unauthorizedErrorListeners, listener);
    }

    addForbiddenErrorListener(listener: () => void): void {
        this.forbiddenErrorListeners.push(listener);
    }

    removeForbiddenErrorListener(listener: () => void): void {
        this.removeListener(this.forbiddenErrorListeners, listener);
    }

    handleUnauthorizedError(): void {
        this.unauthorizedErrorListeners.forEach(listener => listener());
    }

    handleForbiddenError(): void {
        this.forbiddenErrorListeners.forEach(listener => listener());
    }

}
