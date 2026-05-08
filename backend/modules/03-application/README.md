# 🚀 03-Application Module / 03-Application Modülü

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

The entry point of the application and the communication layer with the outside world. Spring Boot starts here.

### 📦 Responsibilities
- **REST API (Controllers):** Handles HTTP requests and returns responses.
- **DTO (Data Transfer Objects):** Models used when presenting data to the outside world.
- **Mappers:** Conversions between Domain Entities and API DTOs.
- **Orchestration:** Manages complex API flows by calling multiple Domain services.

### 📂 Key Components
- `controller/`: REST API endpoints:
  - `UserController` — profile upsert and retrieval
  - `RecommendationController` — AI recommendations, history, and per-recommendation rating
  - `RecipeController` — recipe search and listing
  - `RecipeRatingController` — catalog recipe ratings
  - `ConsumptionController` — daily food logging and consumption tracking
  - `InventoryController` — inventory CRUD
  - `InventoryInvitationController` — inventory sharing and invitation flow
  - `IngredientController` — ingredient search and lookup
  - `NotificationController` — notification management (list, read, delete)
  - `AdminController` — role-based admin operations (user/role management, ingredient editing)
  - `DefinitionController` — unit and category definitions
- `model.dto/`: Request and Response objects (e.g., `ConsumptionRequest`, `RecommendationResponse`, `RecommendationHistoryResponse`).
- `config/`: Application-wide configurations including Security, WebClient, Swagger, and i18n (`I18nConfig`).
- `exception/`: Global Exception Handling logic with i18n-aware error messages.

### 🔗 Dependencies
This module uses the **Domain** and **Infrastructure** modules. It is the conductor of the system.

---

### 🛠 Keycloak Setup and Configuration Import Guide

This guide allows you to set up Keycloak configurations (Realm, Client, Roles) in your Docker environment at once.

#### 1. Preparation
Place the `realm-export.json` file inside your project folder (e.g., `backend/modules/03-application/src/main/resources/`).

#### 2. Preparing the PostgreSQL Database
First, create the database in Postgres for Keycloak data to be persistent:

```bash
docker exec -it postgresql psql -U postgres -c "CREATE DATABASE keycloak_db;"
```

#### 3. Starting Keycloak (Development Mode)
Use the `start-dev` command to start Keycloak with its modern version (v26+).

```bash
docker run -d --name keycloak-auth \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

#### 4. Keycloak Manual Configuration
If you prefer manual setup instead of automatic import:
1. Create `meal-app-realm` by clicking **Create Realm** from the top left.
2. Create a client named `meal-app-backend` from the **Clients** tab.
3. In client settings:
   - **Client Authentication:** OFF
   - **Authentication Flow:** Standard Flow & Direct Access Grants
   - **Valid Redirect URIs:** `http://localhost:3000/*`
   - **Web Origins (CORS):** `http://localhost:3000` (or `*`)

#### 5. Backend (Spring Boot) Configuration
Ensure that the Issuer URI and JWK Set URI values are configured via `localhost` in the `application.yml` file:
- **Issuer URI:** `http://localhost:8080/realms/meal-app-realm`
- **JWK Set URI:** `http://localhost:8080/realms/meal-app-realm/protocol/openid-connect/certs`

> **Note:** User IDs are of type `String`. The Keycloak sub value is stored as the primary key in the database.

---

<a name="türkçe"></a>
## Türkçe

Uygulamanın giriş kapısı ve dış dünya ile iletişim katmanıdır. Spring Boot burada başlar.

### 📦 Sorumluluklar
- **REST API (Controllers):** HTTP isteklerini karşılar ve yanıtları döner.
- **DTO (Data Transfer Objects):** Dış dünyaya veri sunarken kullanılan modeller.
- **Mappers:** Domain Entity'leri ile API DTO'ları arasındaki dönüşümler.
- **Orchestration:** Birden fazla Domain servisini çağırarak karmaşık API akışlarını yönetir.

### 📂 Önemli Birimler
- `controller/`: REST API uç noktaları:
  - `UserController` — profil upsert ve getirme
  - `RecommendationController` — AI önerileri, geçmiş ve öneriye özel değerlendirme
  - `RecipeController` — tarif arama ve listeleme
  - `RecipeRatingController` — katalog tarif değerlendirmeleri
  - `ConsumptionController` — günlük yemek günlüğü ve tüketim takibi
  - `InventoryController` — envanter CRUD
  - `InventoryInvitationController` — envanter paylaşımı ve davet akışı
  - `IngredientController` — malzeme arama ve sorgulama
  - `NotificationController` — bildirim yönetimi (listeleme, okundu, silme)
  - `AdminController` — rol tabanlı admin operasyonları (kullanıcı/rol yönetimi, malzeme düzenleme)
  - `DefinitionController` — birim ve kategori tanımlamaları
- `model.dto/`: İstek ve Yanıt nesneleri (Örn: `ConsumptionRequest`, `RecommendationResponse`, `RecommendationHistoryResponse`).
- `config/`: Güvenlik, WebClient, Swagger ve i18n (`I18nConfig`) dahil uygulama genelindeki yapılandırmalar.
- `exception/`: i18n farkında hata mesajları ile Global Hata Yönetimi mantığı.

### 🔗 Bağımlılıklar
Bu modül **Domain** ve **Infrastructure** modüllerini kullanır. Sistemin orkestra şefidir.

---

### 🛠 Keycloak Kurulum ve Ayar Import Rehberi

Bu rehber, projedeki Keycloak ayarlarını (Realm, Client, Roles) tek seferde kendi Docker ortamınıza kurmanuzu sağlar.

#### 1. Hazırlık
`realm-export.json` dosyasını proje klasörünüzün (`backend/modules/03-application/src/main/resources/` veya uygun bir yer) içine koyun.

#### 2. PostgreSQL Veritabanını Hazırlama
Keycloak verilerinin kalıcı olması için önce Postgres içinde veritabanını oluşturun:

```bash
docker exec -it postgresql psql -U postgres -c "CREATE DATABASE keycloak_db;"
```

#### 3. Keycloak'ı Başlatma (Geliştirme Modu)
Keycloak'ı modern sürümüyle (v26+) başlatmak için `start-dev` komutu kullanılır.

```bash
docker run -d --name keycloak-auth \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

#### 4. Keycloak Manuel Yapılandırma
Otomatik import yerine manuel kurulum yapacaksanız:
1. Sol üstten **Create Realm** diyerek `meal-app-realm` oluşturun.
2. **Clients** sekmesinden `meal-app-backend` isimli bir istemci oluşturun.
3. Client ayarlarında:
   - **Client Authentication:** OFF
   - **Authentication Flow:** Standard Flow & Direct Access Grants
   - **Valid Redirect URIs:** `http://localhost:3000/*`
   - **Web Origins (CORS):** `http://localhost:3000` (veya `*`)

#### 5. Backend (Spring Boot) Ayarı
`application.yml` dosyasında Issuer URI ve JWK Set URI değerlerinin `localhost` üzerinden yapılandırıldığından emin olun:
- **Issuer URI:** `http://localhost:8080/realms/meal-app-realm`
- **JWK Set URI:** `http://localhost:8080/realms/meal-app-realm/protocol/openid-connect/certs`

> **Note:** Kullanıcı ID'leri `String` tipindedir. Keycloak sub değeri veritabanında birincil anahtar (Primary Key) olarak saklanır.
