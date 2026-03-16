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
  - `dashboard/`: Main screen with summary information.
  - `recipes/`: Recipe listing and details.
  - `profile/`: User profile settings.
  - `landing-page/`: Welcome page before login.
- `src/services/`: Common API services.
- `src/App.tsx`: Application entry point, DI registration, and route definitions.

### Current Status
- [x] Keycloak Integration (AuthService, AuthGate).
- [x] Dependency Injection Layer.
- [x] Modern MainLayout and Sidebar.
- [x] Axios Interceptor (Auto-token handling).
- [x] Page Skeletons (Dashboard, Recipes, Profile).

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
  - `dashboard/`: Özet bilgilerin yer aldığı ana ekran.
  - `recipes/`: Tarif listeleme ve detaylandırma.
  - `profile/`: Kullanıcı profil ayarları.
  - `landing-page/`: Giriş öncesi karşılama sayfası.
- `src/services/`: Ortak API servisleri.
- `src/App.tsx`: Uygulama girişi, DI kaydı ve route tanımları.

### Güncel Durum
- [x] Keycloak Entegrasyonu (AuthService, AuthGate).
- [x] Dependency Injection Katmanı.
- [x] Modern MainLayout ve Sidebar.
- [x] Axios Interceptor (Auto-token handling).
- [x] Sayfa İskeletleri (Dashboard, Tarifler, Profil).
