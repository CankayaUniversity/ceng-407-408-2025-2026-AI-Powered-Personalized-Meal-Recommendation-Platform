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
- **Thin Client Architecture:** All business logic, scoring, filtering, and unit calculations are handled exclusively in the backend (Single Source of Truth). Frontend only renders and handles user interaction.
- **Recipe / Recommendation Separation:** `Recipe` (permanent catalog entry) and `Recommendation` (ephemeral AI suggestion with per-user history) are distinct domain concepts. Recommendation history stores AI insights and per-recommendation ratings permanently.
- **Hybrid AI Recommendation Engine:** Combines SQL-based filtering (allergens, diets), mathematical scoring (inventory match, ratings, craving match), and LLM-based refinement with configurable fallback.
- **Negative Craving Detection:** Smart scoring detects and penalizes recipes that match user exclusion preferences (e.g., "no onion" correctly down-scores recipes with onion in the ingredient list).
- **Craving Matching Against Full Ingredient List:** User cravings are matched against the complete ingredient list of each recipe, not just the title or category.
- **Multi-Provider AI Support:** Flexible architecture supporting OpenAI (GPT-4o), Google Gemini, Anthropic Claude, Mistral, DeepSeek, and local LLM endpoints — dynamic switching with fallback.
- **Flexible Consumption Tracking:** Users can log meals as "home-made" (deducts ingredients from inventory) or "external" (AI estimates nutritional values).
- **Admin Panel Backend:** Role-based admin endpoints for user management, ingredient material editing, recipe/ingredient deletion, and test inventory seeding.
- **Inventory Invitations:** Users can share inventories and accept/reject invitations via a dedicated invitation flow.
- **Notification System:** Full notification management (create, list, mark as read/unread, delete) with sidebar badge support.
- **Recipe & Recommendation Ratings:** Separate rating systems — `RecipeRating` on the recipe catalog and `RecommendationRating` on individual recommendation history entries.
- **Integrated Object Storage:** Full MinIO integration for managing recipe images and user-uploaded content with pre-signed URL support.
- **Robust AI Client:** Multi-provider integration with Spring Retry for high availability and token usage monitoring.
- **Keycloak Synchronization:** User IDs are centrally managed as `String` (UUID) type via the Keycloak `sub` value.
- **Automatic Profile Management:** User information is automatically synchronized with the backend database upon first login.
- **Secure API:** All endpoints are protected with JWT-based authentication.
- **Expanded Unit Converter:** Covers all measurement units present in the 50,000+ recipe dataset.
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
| `GET /api/v1/recommendations` | AI-assisted meal recommendations (with scoring + LLM refinement). |
| `GET /api/v1/recommendations/history` | Persistent recommendation history for the current user. |
| `POST /api/v1/recommendations/{id}/rate` | Rate a specific recommendation entry. |
| `POST /api/v1/consumption` | Daily calorie and consumption tracking. |
| `GET /api/v1/consumption` | Retrieve daily/range consumption logs. |
| `GET /api/v1/inventory` | Get user inventory items. |
| `POST /api/v1/inventory` | Add item to inventory. |
| `POST /api/v1/inventory/invitations` | Share inventory via invitation. |
| `GET /api/v1/recipes` | Search and list recipes. |
| `POST /api/v1/recipes/{id}/ratings` | Rate a recipe in the catalog. |
| `GET /api/v1/ingredients` | Search ingredients (used in inventory and admin). |
| `GET /api/v1/notifications` | List user notifications. |
| `PATCH /api/v1/notifications/{id}/read` | Mark notification as read. |
| `GET /api/v1/admin/users` | *(Admin)* List all users. |
| `PUT /api/v1/admin/users/{id}/role` | *(Admin)* Change user role. |
| `PUT /api/v1/admin/ingredients/{id}` | *(Admin)* Edit ingredient material properties. |
| `DELETE /api/v1/admin/recipes/{id}` | *(Admin)* Delete a recipe. |

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
- **İnce İstemci (Thin Client) Mimarisi:** Tüm iş mantığı, puanlama, filtreleme ve birim hesaplamaları backend'de merkezi olarak yönetilir (Tek Doğruluk Kaynağı). Frontend yalnızca sunum ve kullanıcı etkileşiminden sorumludur.
- **Tarif / Öneri Ayrımı:** `Recipe` (kalıcı katalog girişi) ve `Recommendation` (AI tarafından üretilen, kullanıcıya özel geçmiş kaydı) ayrı domain kavramlarıdır. Öneri geçmişi; AI içgörülerini ve öneriye özel değerlendirmeleri kalıcı olarak saklar.
- **Hibrit AI Öneri Motoru:** SQL tabanlı filtreleme (alerjen, diyet), matematiksel puanlama (envanter uyumu, rating, arzu eşleştirmesi) ve fallback destekli LLM rafine etme işlemlerini birleştiren gelişmiş bir öneri sistemi.
- **Negatif Arzu Tespiti:** "Soğansız" gibi dışlama tercihlerini akıllıca tespit eden ve malzeme listesinde eşleşen tarifleri penalize eden puanlama mantığı.
- **Tam Malzeme Listesiyle Arzu Eşleştirmesi:** Kullanıcı arzuları yalnızca başlık/kategori değil, tarifin tüm malzeme listesiyle karşılaştırılır.
- **Çoklu AI Sağlayıcı Desteği:** OpenAI (GPT-4o), Google Gemini, Anthropic Claude, Mistral, DeepSeek ve yerel LLM uç noktaları — fallback destekli dinamik geçiş.
- **Esnek Tüketim Takibi:** Öğünler "ev yapımı" (envanterden otomatik malzeme düşer) veya "dışarıdan" (AI tarafından besin değeri tahmini yapılır) olarak kaydedilebilir.
- **Admin Paneli Backend:** Rol tabanlı admin uç noktaları ile kullanıcı/rol yönetimi, malzeme düzenleme, tarif/malzeme silme ve test envanteri oluşturma.
- **Envanter Davetleri:** Kullanıcılar envanter paylaşabilir ve davetleri kabul/reddedebilir.
- **Bildirim Sistemi:** Tam bildirim yönetimi (oluşturma, listeleme, okundu işaretleme, silme) ve sidebar rozet desteği.
- **Tarif ve Öneri Değerlendirme:** İki ayrı değerlendirme sistemi — tarif kataloğu üzerinde `RecipeRating`, öneri geçmişi girişleri üzerinde `RecommendationRating`.
- **Entegre Nesne Depolama:** Tarif görselleri ve kullanıcı içerikleri için tam MinIO entegrasyonu ve pre-signed URL desteği.
- **Dayanıklı AI İstemcisi:** Spring Retry ile güçlendirilmiş, çoklu sağlayıcı destekli ve token kullanım takibi yapan AI entegrasyonu.
- **Keycloak Senkronizasyonu:** Kullanıcı ID'leri, Keycloak `sub` değeri üzerinden merkezi olarak `String` (UUID) tipinde yönetilir.
- **Otomatik Profil Yönetimi:** Kullanıcı bilgileri, ilk girişte backend veritabanı ile otomatik olarak senkronize edilir.
- **Güvenli API:** Tüm uç noktalar JWT tabanlı kimlik doğrulama ile korunmaktadır.
- **Genişletilmiş Birim Dönüştürücü:** 50.000+ tarif veri setindeki tüm ölçü birimlerini kapsar.
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
| `GET /api/v1/recommendations` | AI destekli yemek önerileri (puanlama + LLM rafine). |
| `GET /api/v1/recommendations/history` | Kullanıcının kalıcı öneri geçmişi. |
| `POST /api/v1/recommendations/{id}/rate` | Belirli bir öneri kaydını değerlendirme. |
| `POST /api/v1/consumption` | Günlük kalori ve tüketim takibi. |
| `GET /api/v1/consumption` | Günlük/aralıklı tüketim kayıtlarını getirme. |
| `GET /api/v1/inventory` | Kullanıcı envanterini getirme. |
| `POST /api/v1/inventory` | Envantere ürün ekleme. |
| `POST /api/v1/inventory/invitations` | Envanter paylaşım daveti gönderme. |
| `GET /api/v1/recipes` | Tarifleri arama ve listeleme. |
| `POST /api/v1/recipes/{id}/ratings` | Katalogdaki bir tarifi değerlendirme. |
| `GET /api/v1/ingredients` | Malzeme arama (envanter ve admin için). |
| `GET /api/v1/notifications` | Kullanıcı bildirimlerini listeleme. |
| `PATCH /api/v1/notifications/{id}/read` | Bildirimi okundu olarak işaretleme. |
| `GET /api/v1/admin/users` | *(Admin)* Tüm kullanıcıları listeleme. |
| `PUT /api/v1/admin/users/{id}/role` | *(Admin)* Kullanıcı rolünü değiştirme. |
| `PUT /api/v1/admin/ingredients/{id}` | *(Admin)* Malzeme özelliklerini düzenleme. |
| `DELETE /api/v1/admin/recipes/{id}` | *(Admin)* Tarif silme. |

### 📦 Paketleme ve Dağıtım
Uygulamayı bir JAR dosyası olarak paketlemek için:
```bash
./gradlew :modules:03-application:bootJar
```
Oluşan JAR dosyası: `modules/03-application/build/libs/03-application.jar`
