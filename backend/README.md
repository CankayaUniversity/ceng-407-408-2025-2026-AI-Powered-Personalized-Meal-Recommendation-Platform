# 🥗 AI-Powered Personalized Meal Recommendation Platform

Bu proje, kullanıcıların tercihlerine ve elindeki malzemelere göre yapay zeka destekli kişiselleştirilmiş yemek önerileri sunan bir platformdur.

## 🛠️ Teknolojiler

- **Java 17+ (Spring Boot 3.4.x uyumlu)**
- **Spring Boot 3.x**
- **PostgreSQL** (Port: `54320`)
- **Keycloak** (OIDC Resource Server, Port: `8080`)
- **MinIO** (Port: `9000/9001`)
- **Docker & Docker Compose**

## 🏗️ Mimari ve Önemli Özellikler

Proje, kurumsal standartlara uygun **Multi-module** mimari ile geliştirilmiştir. Yapılan son güncellemelerle birlikte:

- **Keycloak Senkronizasyonu:** Kullanıcı ID'leri Keycloak `sub` değeri üzerinden `String` (UUID) tipinde merkezi olarak yönetilir.
- **Otomatik Profil Yönetimi:** Kullanıcı ilk giriş yaptığında bilgileri otomatik olarak backend veritabanı ile senkronize edilir.
- **Güvenli API:** Tüm uç noktalar JWT tabanlı kimlik doğrulaması ile korunmaktadır.
- **Tip Güvenliği:** Backend ve test kodları, Keycloak entegrasyonuyla tam uyumlu hale getirilmiştir.

## 🚀 Hızlı Başlangıç (Docker ile)

Projeyi tüm bağımlılıkları (Veritabanı, Keycloak, MinIO ve Backend) ile birlikte tek komutla ayağa kaldırabilirsiniz. Yapılan son güncelleme ile **Keycloak yapılandırması (Realm ve Client) otomatik olarak içe aktarılmaktadır.**

1.  Terminalde projenin kök dizinine gidin.
2.  Aşağıdaki komutu çalıştırın:

```bash
docker-compose up --build -d
```

Bu komut şunları yapar:
- **PostgreSQL (54320):** Veritabanını başlatır.
- **MinIO (9000/9001):** Depolama servisini başlatır.
- **Keycloak 26.1 (8080):** Başlatılır ve `keycloak/meal-app-realm.json` dosyasındaki ayarları otomatik yükler.
- **Backend (8081):** Uygulamayı derler ve Docker ağında çalıştırır.

## 💻 Yerel Geliştirme Ortamı Kurulumu

Eğer backend kodlarını IDE üzerinden (IntelliJ vb.) koşturmak isterseniz:

1.  **Sadece Bağımlı Servisleri Başlatın:**
    ```bash
    docker-compose up -d postgres-db minio-server keycloak-auth
    ```
2.  **Backend'i IDE'den Çalıştırın:**
    - `03-application` modülündeki `MealRecommendationApplication` sınıfını çalıştırın.
    - Uygulama `localhost:8080` üzerindeki Keycloak'a ve `54320` portundaki DB'ye otomatik bağlanacaktır.

## 🏗️ Proje Yapısı

Proje 4 ana modülden oluşmaktadır:

- **01-infrastructure:** Veritabanı, Minio ve AI servis entegrasyonları.
- **02-domain:** İş kuralları, Entity tanımları ve kullanıcı ID yönetimi (String ID).
- **03-application:** REST API (Controller), DTO'lar ve MapStruct dönüşümleri.
- **04-utilities:** Ortak yardımcı araçlar.

## 🔐 Kimlik Doğrulama (Keycloak)

Uygulama güvenliği için Keycloak kullanılmaktadır. 
- **URL:** http://localhost:8080
- **Admin Paneli:** admin / admin
- **Realm:** `meal-app-realm`
- **Frontend-Backend Uyumu:** JWT issuer ve cert URL'leri `localhost` üzerinden optimize edilmiştir.

## 📡 API Uç Noktaları (Özet)

| Endpoint | Açıklama |
| :--- | :--- |
| `POST /api/v1/users` | Kullanıcı kaydı ve profil senkronizasyonu (Upsert). |
| `GET /api/v1/users/{id}` | Profil detaylarını getirme. |
| `GET /api/v1/recommendations` | AI destekli yemek önerileri. |
| `POST /api/v1/consumption` | Günlük kalori ve tüketim takibi. |

## 📦 Paketleme ve Dağıtım

Uygulamayı bir JAR dosyası olarak paketlemek için:

```bash
./gradlew :modules:03-application:bootJar
```

Oluşan JAR dosyası: `modules/03-application/build/libs/03-application.jar`
