# AI Meal App Frontend / AI Yemek Uygulaması Frontend

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

This folder contains the frontend structure of the AI-Powered Personalized Meal Recommendation Platform project. The project architecture has been modernized according to "Dependency Injection (DI)" and "Layered Architecture" principles, providing a modular and scalable structure suitable for enterprise standards.

### Technologies Used
- **React 18**: Modern UI development.
- **TypeScript**: Full type safety.
- **Vite**: Ultra-fast build and development tool.
- **Keycloak JS**: Centralized authentication (OIDC).
- **Tailwind CSS**: Modern and fast style management.
- **Lucide React**: Modern icon set.
- **Axios**: API management with custom HTTP interceptor support.
- **React Router 6**: Advanced page routing and Private Route management.

### 🌍 Internationalization (i18n)
The project uses `i18next` and `react-i18next` for multi-language support.
- **Configuration:** Initialized in `src/i18n/index.ts` and imported in `main.tsx`. It supports language detection from the browser.
- **Usage:** Use the `useTranslation` hook in functional components:
  ```tsx
  const { t } = useTranslation();
  return <h1>{t('welcome')}</h1>;
  ```
- **Language Switcher:** A language selector is integrated into the `MainLayout` sidebar for manual switching between English (EN) and Turkish (TR).
- **Adding Translations:** Translation files are located in `public/locales/{{lng}}/translation.json`. Add new keys to both `en` and `tr` files to maintain consistency.

### Key Features & Architecture
- **Dependency Injection (DI):** Services (Auth, Http, Logging) are managed through a central `ServiceRegistry`. Components access these services in a loosely coupled manner using the `useService` hook.
- **Centralized Auth Management:** Keycloak integration is provided with `AuthService` and `AuthContextProvider`. Token refreshing is handled transparently with asynchronous interceptors.
- **Layered Structure:**
    - `infrastructure/`: Contains core services like DI, Auth, Http, and Logging.
    - `shared/`: Houses the Layout, Sidebar, and common components used throughout the application.
    - `features/`: Includes the main functional modules of the application (Dashboard, Recipes, Profile, Landing Page) and their logic. Each module can contain its own components and services.
- **Modern Layout:** Collapsible Sidebar, dynamic navigation, and enterprise-look `MainLayout`.

### Getting Started
1. **Setup via Docker (Recommended):**
    The easiest way to run the frontend is using the main `docker-compose.yml` in the project root directory. This will serve the frontend via Nginx on port 3030.
    ```bash
    docker compose --profile full up --build -d
    ```
    Access the app at: [http://localhost:3030](http://localhost:3030)

2. **Local Development Mode:**
    If you want to run the frontend separately for development (with Hot Module Replacement on port 3000):
    1. **Start Infrastructure (from root):**
       ```bash
       docker compose --profile infra up -d
       ```
    2. **Run Vite:**
       ```bash
       npm install
       npm run dev
       ```
    Default Vite port: [http://localhost:3000](http://localhost:3000) (Note: Proxy to backend is configured in `vite.config.ts`).

3. **Keycloak and Backend Settings:**
    - Verify the server information in `src/keycloak-config.json` (Default: `http://localhost:8080`).
    - Backend API address is managed via Nginx in Docker or Vite proxy in local dev.

### Project Structure
- `src/infrastructure/`: Core application services (DI, Auth, API Clients).
- `src/shared/layout/`: Main application skeleton and Sidebar.
- `src/features/`: Application modules:
  - `dashboard/`: Main screen with daily summary and nutrition overview.
  - `recipes/`: Recipe listing, search, details, and "Prepare This Recipe" flow.
  - `recommendations/`: AI-powered recommendation engine UI with model/provider selector, craving input, and persistent history list.
  - `inventory/`: Inventory management (add, edit, remove items) with sharing and invitation support.
  - `consumption/`: Daily food logging and consumption tracking.
  - `notifications/`: Notification center with sidebar badge and read/unread management.
  - `admin/`: Admin panel for user/role management and ingredient material editing.
  - `profile/`: User profile settings (diet goals, allergens, preferences).
  - `about/`: Project and platform information page.
  - `landing-page/`: Welcome page before login.
- `src/services/`: Common API services.
- `src/i18n/`: i18next configuration and translation loader.
- `src/App.tsx`: Application entry point, DI registration, and route definitions.

### Current Status
- [x] Keycloak Integration (AuthService, AuthGate).
- [x] Dependency Injection Layer.
- [x] Modern MainLayout and Sidebar with notification badge.
- [x] Axios Interceptor (Auto-token handling).
- [x] i18n (EN/TR) via i18next + react-i18next.
- [x] Dashboard, Recipes, Profile, Inventory, Consumption.
- [x] Recommendation page with AI provider/model selector and craving input.
- [x] Persistent Recommendation History at the bottom of the recommendations page.
- [x] "Prepare This Recipe" direct consumption modal from recipe cards.
- [x] Notifications page with sidebar integration.
- [x] Admin panel (user management, ingredient material editing).

---

<a name="türkçe"></a>
## Türkçe

Bu klasör, AI-Powered Personalized Meal Recommendation Platform projesinin frontend yapısını içermektedir. Proje mimarisi, kurumsal standartlara uygun, modüler ve ölçeklenebilir bir yapı olan "Dependency Injection (DI)" ve "Katmanlı Mimari" prensiplerine göre modernize edilmiştir.

### Kullanılan Teknolojiler
- **React 18**: Modern UI geliştirme.
- **TypeScript**: Tam tip güvenliği.
- **Vite**: Ultra hızlı build ve geliştirme aracı.
- **Keycloak JS**: Merkezi kimlik doğrulama (OIDC).
- **Tailwind CSS**: Modern ve hızlı stil yönetimi.
- **Lucide React**: Modern ikon seti.
- **Axios**: Özelleştirilmiş HTTP interceptor desteği ile API yönetimi.
- **React Router 6**: Gelişmiş sayfa yönlendirme ve Private Route yönetimi.

### 🌍 Uluslararasılaştırma (i18n)
Proje, çok dilli destek için `i18next` ve `react-i18next` kütüphanelerini kullanır.
- **Yapılandırma:** `src/i18n/index.ts` dosyasında yapılandırılmış ve `main.tsx` içinde içe aktarılmıştır. Tarayıcı dilini otomatik algılama desteği mevcuttur.
- **Kullanım:** Fonksiyonel bileşenlerde `useTranslation` hook'u kullanılır:
  ```tsx
  const { t } = useTranslation();
  return <h1>{t('welcome')}</h1>;
  ```
- **Dil Seçici:** `MainLayout` sidebar'ına entegre edilmiş bir dil seçici ile İngilizce (EN) ve Türkçe (TR) arasında manuel geçiş yapılabilir.
- **Çeviri Ekleme:** Çeviri dosyaları `public/locales/{{lng}}/translation.json` dizininde yer alır. Yeni bir metin eklemek için hem `en` hem de `tr` klasöründeki JSON dosyalarına karşılık gelen anahtarları ekleyin.

### Öne Çıkan Özellikler & Mimari
- **Dependency Injection (DI):** Servisler (Auth, Http, Logging) merkezi bir `ServiceRegistry` üzerinden yönetilir. Bileşenler `useService` hook'u ile bu servislere gevşek bağlı (loosely coupled) şekilde erişir.
- **Merkezi Auth Yönetimi:** `AuthService` ve `AuthContextProvider` ile Keycloak entegrasyonu sağlandı. Token yenileme (refresh), asenkron interceptor'lar ile şeffaf bir şekilde yönetilir.
- **Katmanlı Yapı:**
    - `infrastructure/`: DI, Auth, Http ve Logging gibi temel servisleri içerir.
    - `shared/`: Uygulama genelinde kullanılan Layout, Sidebar ve ortak bileşenleri barındırır.
    - `features/`: Uygulamanın ana işlevsel modülleri (Dashboard, Recipes, Profile, Landing Page) ve bu modüllere ait mantığı içerir. Her modül kendi içinde bileşenlerini ve servislerini barındırabilir.
- **Modern Layout:** Daralabilir (collapsible) Sidebar, dinamik navigasyon ve kurumsal görünümlü `MainLayout`.

### Başlangıç
1. **Docker ile Kurulum (Önerilen):**
    Frontend'i çalıştırmanın en kolay yolu, proje kök dizinindeki ana `docker-compose.yml` dosyasını kullanmaktır. Bu, frontend'i Nginx üzerinden 3030 portunda servis edecektir.
    ```bash
    docker compose --profile full up --build -d
    ```
    Uygulamaya şuradan erişebilirsiniz: [http://localhost:3030](http://localhost:3030)

2. **Yerel Geliştirme Modu:**
    Frontend'i geliştirme amacıyla (3000 portunda HMR desteği ile) ayrı çalıştırmak isterseniz:
    1. **Altyapıyı Başlatın (Kök dizinden):**
       ```bash
       docker compose --profile infra up -d
       ```
    2. **Vite'i Çalıştırın:**
       ```bash
       npm install
       npm run dev
       ```
    Varsayılan Vite portu: [http://localhost:3000](http://localhost:3000) (Not: Backend proxy ayarı `vite.config.ts` içinde yapılandırılmıştır).

3. **Keycloak ve Backend Ayarları:**
    - `src/keycloak-config.json` dosyasındaki sunucu bilgilerinin doğruluğunu kontrol edin (Varsayılan: `http://localhost:8080`).
    - Backend API adresi, Docker'da Nginx üzerinden, yerel geliştirmede ise Vite proxy üzerinden yönetilir.

### Proje Yapısı
- `src/infrastructure/`: Uygulamanın çekirdek servisleri (DI, Auth, API Clients).
- `src/shared/layout/`: Ana uygulama iskeleti ve Sidebar.
- `src/features/`: Uygulama modülleri:
  - `dashboard/`: Günlük özet ve beslenme genel görünümü ana ekranı.
  - `recipes/`: Tarif listeleme, arama, detaylar ve "Bu Tarifi Hazırla" akışı.
  - `recommendations/`: Model/sağlayıcı seçici, arzu girişi ve kalıcı geçmiş listesi içeren AI öneri motoru arayüzü.
  - `inventory/`: Envanter yönetimi (ekleme, düzenleme, silme) ve paylaşım/davet desteği.
  - `consumption/`: Günlük yemek günlüğü ve tüketim takibi.
  - `notifications/`: Sidebar rozeti ve okundu/okunmadı yönetimi içeren bildirim merkezi.
  - `admin/`: Kullanıcı/rol yönetimi ve malzeme düzenleme için admin paneli.
  - `profile/`: Kullanıcı profil ayarları (diyet hedefleri, alerjenler, tercihler).
  - `about/`: Proje ve platform bilgi sayfası.
  - `landing-page/`: Giriş öncesi karşılama sayfası.
- `src/services/`: Ortak API servisleri.
- `src/i18n/`: i18next yapılandırması ve çeviri yükleyici.
- `src/App.tsx`: Uygulama girişi, DI kaydı ve route tanımları.

### Güncel Durum
- [x] Keycloak Entegrasyonu (AuthService, AuthGate).
- [x] Dependency Injection Katmanı.
- [x] Bildirim rozeti ile Modern MainLayout ve Sidebar.
- [x] Axios Interceptor (Auto-token handling).
- [x] i18n (TR/EN) — i18next + react-i18next.
- [x] Dashboard, Tarifler, Profil, Envanter, Tüketim.
- [x] AI sağlayıcı/model seçici ve arzu girişi ile Öneri sayfası.
- [x] Öneriler sayfasının altında Kalıcı Öneri Geçmişi.
- [x] Tarif kartlarından doğrudan "Bu Tarifi Hazırla" tüketim modalı.
- [x] Sidebar entegrasyonlu Bildirimler sayfası.
- [x] Admin paneli (kullanıcı yönetimi, malzeme düzenleme).
