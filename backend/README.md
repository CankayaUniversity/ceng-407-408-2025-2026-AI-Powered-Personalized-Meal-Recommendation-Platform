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
- **Hybrid AI Recommendation Engine:** A sophisticated recommendation system that combines SQL-based filtering (allergens, diets), scoring (inventory match, ratings), and LLM-based (OpenAI GPT-4o, Google Gemini) refinement.
- **Multi-Provider AI Support:** Flexible architecture supporting multiple AI engines (OpenAI, Gemini) with dynamic switching and fallback mechanisms.
- **Flexible Consumption Tracking:** Users can log meals as "home-made" (deducts ingredients from Minio-backed inventory) or "external" (AI estimates nutritional values).
- **Integrated Object Storage:** Full MinIO integration for managing recipe images and user-uploaded content with pre-signed URL support.
- **Robust AI Client:** Multi-provider integration (OpenAI, Gemini) with Spring Retry for high availability and token usage monitoring.
- **Keycloak Synchronization:** User IDs are centrally managed as `String` (UUID) type via the Keycloak `sub` value.
- **Automatic Profile Management:** User information is automatically synchronized with the backend database upon first login.
- **Secure API:** All endpoints are protected with JWT-based authentication.
- **Type Safety:** Backend and test codes are fully compatible with Keycloak integration.
- **Dynamic Dataset Support:** Handles 50,000+ recipes with real-time ranking and filtering capabilities.

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
- **02-domain:** Business rules, Entity definitions and user ID management (String ID).
- **03-application:** REST API (Controller), DTOs, MapStruct transformations and **i18n configuration**.
- **04-utilities:** Common utility tools and data population.

### 🌍 Internationalization (i18n) & Localization (l10n)
The project provides multi-language support using the Spring Boot `MessageSource` mechanism.
- **Configuration:** Dynamic language selection is performed based on the `Accept-Language` header via the `I18nConfig` class. The default language is English.
- **Usage:** Sensitive messages can be retrieved from the code by injecting the `MessageUtil` component.
- **Error Messages:** `GlobalExceptionHandler` returns all system errors according to the client's language using `MessageUtil`.
- **Translations:** New translations are defined by adding to the `messages.properties` (EN) and `messages_tr.properties` (TR) files under `src/main/resources`.

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
- **Hibrit AI Öneri Motoru:** SQL tabanlı filtreleme (alerjen, diyet), puanlama (envanter uyumu, rating) ve LLM tabanlı (OpenAI GPT-4o, Google Gemini, Anthropic Claude) rafine etme işlemlerini birleştiren gelişmiş bir öneri sistemi.
- **Çoklu AI Sağlayıcı Desteği:** OpenAI (ChatGPT), Google Gemini, Anthropic Claude ve OpenAI uyumlu diğer sağlayıcılar (Mistral, DeepSeek, Local LLM) üzerinden dinamik öneri alabilme.
- **Esnek Tüketim Takibi:** Öğünler "ev yapımı" (envanterden otomatik malzeme düşer) veya "dışarıdan" (AI tarafından besin değeri tahmini yapılır) olarak kaydedilebilir.
- **Entegre Nesne Depolama:** Tarif görselleri ve kullanıcı içerikleri için tam MinIO entegrasyonu ve geçici URL (pre-signed) desteği.
- **Dayanıklı AI İstemcisi:** Spring Retry ile güçlendirilmiş, çoklu sağlayıcı (OpenAI, Gemini) destekli ve token kullanım takibi yapan AI entegrasyonu.
- **Keycloak Senkronizasyonu:** Kullanıcı ID'leri, Keycloak `sub` değeri üzerinden merkezi olarak `String` (UUID) tipinde yönetilir.
- **Otomatik Profil Yönetimi:** Kullanıcı bilgileri, ilk girişte backend veritabanı ile otomatik olarak senkronize edilir.
- **Güvenli API:** Tüm uç noktalar JWT tabanlı kimlik doğrulama ile korunmaktadır.
- **Tip Güvenliği:** Backend ve test kodları Keycloak entegrasyonu ile tam uyumludur.
- **Dinamik Veri Seti Desteği:** 50.000+ tarif üzerinde gerçek zamanlı sıralama ve filtreleme yapabilen ölçeklenebilir yapı.

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
- **03-application:** REST API (Controller), DTO'lar, MapStruct dönüşümleri ve **i18n yapılandırması**.
- **04-utilities:** Ortak yardımcı araçlar ve veri popülasyonu.

### 🌍 Uluslararasılaştırma (i18n) ve Yerelleştirme (l10n)
Proje, Spring Boot `MessageSource` mekanizmasını kullanarak çok dilli destek sunar.
- **Yapılandırma:** `I18nConfig` sınıfı üzerinden `Accept-Language` header'ına göre dinamik dil seçimi yapılır. Varsayılan dil İngilizcedir.
- **Kullanım:** `MessageUtil` bileşeni enjekte edilerek kod içerisinden dile duyarlı mesajlar alınabilir.
- **Hata Mesajları:** `GlobalExceptionHandler` tüm sistem hatalarını `MessageUtil` kullanarak istemcinin diline göre döndürür.
- **Çeviriler:** `src/main/resources` altındaki `messages.properties` (EN) ve `messages_tr.properties` (TR) dosyalarına ekleme yapılarak yeni çeviriler tanımlanır.

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
