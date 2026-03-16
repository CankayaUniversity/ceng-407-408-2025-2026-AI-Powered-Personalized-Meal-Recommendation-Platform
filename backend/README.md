# 🥗 AI-Powered Personalized Meal Recommendation Platform / AI Destekli Kişiselleştirilmiş Yemek Önerisi Platformu

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

This project is a platform that provides AI-powered personalized meal recommendations based on user preferences and available ingredients.

### 🛠️ Technologies
- **Java 21 (Spring Boot 3.4.x)**
- **Spring Boot 3.x**
- **PostgreSQL** (Port: `5432`)
- **Keycloak** (OIDC Resource Server, Port: `8080`)
- **MinIO** (Port: `9000/9001`)
- **Docker & Docker Compose**

### 🏗️ Architecture and Key Features
The project is developed using a **Multi-module** architecture in line with enterprise standards. With the latest updates:
- **Keycloak Synchronization:** User IDs are centrally managed as `String` (UUID) type via the Keycloak `sub` value.
- **Automatic Profile Management:** User information is automatically synchronized with the backend database upon first login.
- **Secure API:** All endpoints are protected with JWT-based authentication.
- **Type Safety:** Backend and test codes are fully compatible with Keycloak integration.

### 🚀 Quick Start (with Docker)
You can start the entire project (Frontend, Backend, Database, Keycloak, and MinIO) from the project root using a single command.

1. Go to the project root directory.
2. Run the following command:
   ```bash
   docker compose --profile full up --build -d
   ```
This command does the following:
- **Frontend (3030):** Serves the React application via Nginx.
- **PostgreSQL (5432):** Starts the `meal-app-db` container.
- **MinIO (9000/9001):** Starts the storage service.
- **Keycloak 26.1 (8080):** Starts and automatically loads settings.
- **Backend (8081):** Compiles and runs the Java application.

### 💻 Local Development Environment Setup
#### Prerequisites
- **Java 21** (SDKMAN recommended: `.sdkmanrc` available)
- **Gradle 8.14 Wrapper / 8.14.3 SDKMAN** (Wrapper is included)
- **Docker & Docker Compose** (For infrastructure services)

#### Setup Steps
If you want to run the backend code through an IDE (IntelliJ, etc.) while keeping databases in Docker:
1. **Start Infrastructure Services (from root):**
   ```bash
   docker compose --profile infra up -d
   ```
2. **Run Backend from IDE:**
   - Run the `MealRecommendationApplication` class in the `03-application` module.
   - The application will automatically connect to Keycloak on `localhost:8080` and the DB on port `5432` (with default `application.yml` settings).

### 🏗️ Project Structure
The project consists of 4 main modules:
- **01-infrastructure:** Database, MinIO, and AI service integrations.
- **02-domain:** Business rules, Entity definitions, and user ID management (String ID).
- **03-application:** REST API (Controller), DTOs, and MapStruct transformations.
- **04-utilities:** Common utility tools and data population.

### 🔐 Authentication (Keycloak)
Keycloak is used for application security.
- **URL:** http://localhost:8080
- **Admin Panel:** admin / admin
- **Test User:** user / password
- **Realm:** `meal-app-realm`
- **Frontend-Backend Compatibility:** JWT issuer and cert URLs are optimized for `localhost`.

### 📡 API Endpoints (Summary)
| Endpoint | Description |
| :--- | :--- |
| `POST /api/v1/users` | User registration and profile synchronization (Upsert). |
| `GET /api/v1/users/{id}` | Retrieve profile details. |
| `GET /api/v1/recommendations` | AI-assisted meal recommendations. |
| `POST /api/v1/consumption` | Daily calorie and consumption tracking. |

### 📦 Packaging and Deployment
To package the application as a JAR file:
```bash
./gradlew :modules:03-application:bootJar
```
Generated JAR file: `modules/03-application/build/libs/03-application.jar`

---

<a name="türkçe"></a>
## Türkçe

Bu proje, kullanıcıların tercihlerine ve elindeki malzemelere göre yapay zeka destekli kişiselleştirilmiş yemek önerileri sunan bir platformdur.

### 🛠️ Teknolojiler
- **Java 21 (Spring Boot 3.4.x uyumlu)**
- **Spring Boot 3.x**
- **PostgreSQL** (Port: `5432`)
- **Keycloak** (OIDC Resource Server, Port: `8080`)
- **MinIO** (Port: `9000/9001`)
- **Docker & Docker Compose**

### 🏗️ Mimari ve Önemli Özellikler
Proje, kurumsal standartlara uygun **Multi-module** mimari ile geliştirilmiştir. Yapılan son güncellemelerle birlikte:
- **Keycloak Senkronizasyonu:** Kullanıcı ID'leri Keycloak `sub` değeri üzerinden `String` (UUID) tipinde merkezi olarak yönetilir.
- **Otomatik Profil Yönetimi:** Kullanıcı ilk giriş yaptığında bilgileri otomatik olarak backend veritabanı ile senkronize edilir.
- **Güvenli API:** Tüm uç noktalar JWT tabanlı kimlik doğrulaması ile korunmaktadır.
- **Tip Güvenliği:** Backend ve test kodları, Keycloak entegrasyonuyla tam uyumlu hale getirilmiştir.

### 🚀 Hızlı Başlangıç (Docker ile)
Projeyi tüm bileşenleriyle (Frontend, Backend, Veritabanı, Keycloak ve MinIO) proje kök dizininden tek komutla ayağa kaldırabilirsiniz.

1. Terminalde projenin kök dizinine gidin.
2. Aşağıdaki komutu çalıştırın:
   ```bash
   docker compose --profile full up --build -d
   ```
Bu komut şunları yapar:
- **Frontend (3030):** React uygulamasını Nginx üzerinden servis eder.
- **PostgreSQL (5432):** Projeye ait `meal-app-db` konteynerini başlatır.
- **MinIO (9000/9001):** Depolama servisini başlatır.
- **Keycloak 26.1 (8080):** Başlatılır ve ayarları otomatik yükler.
- **Backend (8081):** Java uygulamasını derler ve çalıştırır.

### 💻 Yerel Geliştirme Ortamı Kurulumu
#### Ön Koşullar (Prerequisites)
- **Java 21** (SDKMAN önerilir: `.sdkmanrc` mevcut)
- **Gradle 8.14 Wrapper / 8.14.3 SDKMAN** (Wrapper dahil edilmiştir)
- **Docker & Docker Compose** (Altyapı servisleri için)

#### Kurulum Adımları
Eğer backend kodlarını IDE üzerinden (IntelliJ vb.) koşturmak, veritabanlarını ise Docker'da tutmak isterseniz:
1. **Altyapı Servislerini Başlatın (Kök dizinden):**
   ```bash
   docker compose --profile infra up -d
   ```
2. **Backend'i IDE'den Çalıştırın:**
   - `03-application` modülündeki `MealRecommendationApplication` sınıfını çalıştırın.
   - Uygulama `localhost:8080` üzerindeki Keycloak'a ve `5432` portundaki DB'ye otomatik bağlanacaktır (Varsayılan `application.yml` ayarları ile).

### 🏗️ Proje Yapısı
Proje 4 ana modülden oluşmaktadır:
- **01-infrastructure:** Veritabanı, Minio ve AI servis entegrasyonları.
- **02-domain:** İş kuralları, Entity tanımları ve kullanıcı ID yönetimi (String ID).
- **03-application:** REST API (Controller), DTO'lar ve MapStruct dönüşümleri.
- **04-utilities:** Ortak yardımcı araçlar ve veri popülasyonu.

### 🔐 Kimlik Doğrulama (Keycloak)
Uygulama güvenliği için Keycloak kullanılmaktadır.
- **URL:** http://localhost:8080
- **Admin Paneli:** admin / admin
- **Test Kullanıcısı:** user / password
- **Realm:** `meal-app-realm`
- **Frontend-Backend Uyumu:** JWT issuer ve cert URL'leri `localhost` üzerinden optimize edilmiştir.

### 📡 API Uç Noktaları (Özet)
| Endpoint | Açıklama |
| :--- | :--- |
| `POST /api/v1/users` | Kullanıcı kaydı ve profil senkronizasyonu (Upsert). |
| `GET /api/v1/users/{id}` | Profil detaylarını getirme. |
| `GET /api/v1/recommendations` | AI destekli yemek önerileri. |
| `POST /api/v1/consumption` | Günlük kalori ve tüketim takibi. |

### 📦 Paketleme ve Dağıtım
Uygulamayı bir JAR dosyası olarak paketlemek için:
```bash
./gradlew :modules:03-application:bootJar
```
Oluşan JAR dosyası: `modules/03-application/build/libs/03-application.jar`
