# AI Meal App Frontend

Bu klasör, AI-Powered Personalized Meal Recommendation Platform projesinin frontend yapısını içermektedir. Proje mimarisi, kurumsal standartlara uygun, modüler ve ölçeklenebilir bir yapı olan "Dependency Injection (DI)" ve "Katmanlı Mimari" prensiplerine göre modernize edilmiştir.

## Kullanılan Teknolojiler
- **React 18**: Modern UI geliştirme.
- **TypeScript**: Tam tip güvenliği.
- **Vite**: Ultra hızlı build ve geliştirme aracı.
- **Keycloak JS**: Merkezi kimlik doğrulama (OIDC).
- **Tailwind CSS**: Modern ve hızlı stil yönetimi.
- **Lucide React**: Modern ikon seti.
- **Axios**: Özelleştirilmiş HTTP interceptor desteği ile API yönetimi.
- **React Router 6**: Gelişmiş sayfa yönlendirme ve Private Route yönetimi.

## Öne Çıkan Özellikler & Mimari
- **Dependency Injection (DI):** Servisler (Auth, Http, Logging) merkezi bir `ServiceRegistry` üzerinden yönetilir. Bileşenler `useService` hook'u ile bu servislere gevşek bağlı (loosely coupled) şekilde erişir.
- **Merkezi Auth Yönetimi:** `AuthService` ve `AuthContextProvider` ile Keycloak entegrasyonu sağlandı. Token yenileme (refresh), asenkron interceptor'lar ile şeffaf bir şekilde yönetilir.
- **Katmanlı Yapı:**
    - `infrastructure/`: DI, Auth, Http ve Logging gibi temel servisleri içerir.
    - `shared/`: Uygulama genelinde kullanılan Layout, Sidebar ve ortak bileşenleri barındırır.
    - `features/`: Uygulamanın ana işlevsel sayfaları (Dashboard, Recipes, Profile) ve bu sayfalara ait mantığı içerir.
- **Modern Layout:** Daralabilir (collapsible) Sidebar, dinamik navigasyon ve kurumsal görünümlü `MainLayout`.

## Başlangıç

1.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

2.  **Keycloak Ayarları:**
    `src/keycloak-config.json` dosyasındaki sunucu bilgilerinin doğruluğunu kontrol edin.

3.  **Geliştirme sunucusunu başlatın:**
    ```bash
    npm run dev
    ```

## Proje Yapısı
- `src/infrastructure/`: Uygulamanın çekirdek servisleri (DI, Auth, Services).
- `src/shared/layout/`: Ana uygulama iskeleti ve Sidebar.
- `src/pages/`: Uygulama sayfaları (Dashboard, RecipeList, Profile).
- `src/services/`: API servisleri (RecipeService, UserService).
- `src/App.tsx`: Uygulama girişi, DI kaydı ve route tanımları.

## Güncel Durum
- [x] Keycloak Entegrasyonu (AuthService, AuthGate).
- [x] Dependency Injection Katmanı.
- [x] Modern MainLayout ve Sidebar.
- [x] Axios Interceptor (Auto-token handling).
- [x] Sayfa İskeletleri (Dashboard, Tarifler, Profil).
