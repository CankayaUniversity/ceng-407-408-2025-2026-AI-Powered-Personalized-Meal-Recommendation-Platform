# Meal App Frontend

Bu klasör, AI-Powered Personalized Meal Recommendation Platform projesinin frontend iskeletini içermektedir.

## Kullanılan Teknolojiler
- **React**: Arayüz kütüphanesi.
- **TypeScript**: Tip güvenliği.
- **Vite**: Hızlı geliştirme ortamı ve build aracı.
- **Tailwind CSS**: Modern ve hızlı stil yönetimi.
- **Lucide React**: İkon seti.
- **Axios**: HTTP istekleri için (hazırlandı).
- **React Router**: Sayfa yönlendirmeleri için (hazırlandı).

## Başlangıç

1.  Bağımlılıkları yükleyin:
    ```bash
    npm install
    ```

2.  Geliştirme sunucusunu başlatın:
    ```bash
    npm run dev
    ```

## Proje Yapısı
- `src/App.tsx`: Ana uygulama bileşeni ve başlangıç teması.
- `vite.config.ts`: Backend proxy ayarları (port 8081).
- `tailwind.config.js`: Stil özelleştirmeleri.

## İlerleme Planı
1.  **Keycloak Entegrasyonu**: Backend'deki `/api/test/anonymous` dışındaki endpointler authentication gerektirir. `keycloak-js` ve `@react-keycloak/web` ile giriş sistemi kurulmalıdır.
2.  **Sayfa Yapısı**: `src/pages` klasörü oluşturulup (Dashboard, RecipeList, Profile) sayfaları ayrılmalıdır.
3.  **Servis Katmanı**: `src/services` altında API çağrıları için merkezi servisler oluşturulmalıdır.
