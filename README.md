# AI-Powered Personalized Meal Recommendation Platform / AI Destekli Kişiselleştirilmiş Yemek Önerisi Platformu

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

This project is a web-based application that provides personalized meal and diet recommendations based on users’ available ingredients, dietary preferences, and nutrition goals. The system aims to combine recipe management, nutritional analysis, and AI-assisted recommendations within a single integrated platform.

### 🚀 Quick Start for Developers (Step-by-Step)

If you are new to the project, follow these steps to get everything running on your local machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/AI-Powered-Personalized-Meal-Recommendation-Platform.git
   cd AI-Powered-Personalized-Meal-Recommendation-Platform
   ```

2. **Setup & Run Everything (Docker):**
   Ensure Docker is running, then start all services (Frontend, Backend, DB, Keycloak, MinIO) with a single command:
   ```bash
   docker compose --profile full up --build -d
   ```

3. **Access the App:**
   - **Frontend:** [http://localhost:3030](http://localhost:3030)
   - **Backend API:** [http://localhost:8081](http://localhost:8081)
   - **Keycloak:** [http://localhost:8080](http://localhost:8080) (Admin: `admin/admin`)
   - **Database:** `localhost:5432`

4. **Test Credentials:**
   - **Username:** `user`
   - **Password:** `password`

---

### 💻 Infrastructure-Only Setup (For Local Development)

If you want to run the frontend or backend in **development mode** (Vite/IDE) while keeping the databases and auth server in Docker:

1. **Start Infrastructure Services:**
   ```bash
   docker compose --profile infra up -d
   ```
   *This starts only: PostgreSQL, Keycloak, and MinIO.*

2. **Run Backend (IDE):** Run `MealRecommendationApplication` from your IDE.
3. **Run Frontend (Vite):**
   ```bash
   cd frontend
   npm run dev
   ```
   *The app will be available at [http://localhost:3000](http://localhost:3000).*

---

### Project Motivation
Many existing meal recommendation platforms rely on static recipe lists or simple filtering mechanisms. Nutritional analysis is often handled by separate tools, and personalization is usually limited. This project aims to bring these features together in a unified system that adapts recommendations according to individual user profiles.

### Key Features
- User profile management (diet goals, liked/disliked foods)
- Ingredient-based recipe recommendations
- Hybrid AI Recommendation Engine (SQL Filtering + Custom Scoring + LLM Refinement)
- Daily Food Logging and Consumption Tracking (Flexible stock deduction: home-made vs external meals)
- Dynamic Dataset Support (Efficiently handling 50,000+ recipes)
- Nutritional value calculation (calories, protein, fat, carbohydrates)
- AI-assisted personalized meal and diet suggestions (Powered by OpenAI GPT-4o)
- Integrated File Storage (MinIO) for recipe images and user uploads
- Web-based, modular and extensible architecture

### Technology Stack
#### Backend
- Java 21
- Spring Boot 3.4.3
- Gradle 8.14 (Wrapper), 8.14.3 (SDKMAN) (buildSrc structure for central management and libs.versions.toml support)
- RESTful API architecture
- PostgreSQL (Database)
- MinIO (Object Storage)
- Keycloak (Identity Management)
- OpenAI API (GPT-4o integration with Spring Retry)
- JaCoCo & SonarQube (Code Quality and Test Coverage)
- Testcontainers (For PostgreSQL, MinIO, Keycloak integration tests)

#### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios for API communication
- Keycloak JS (Centralized Auth)

#### Database & Infrastructure
- PostgreSQL
- MinIO (Object Storage)
- Keycloak (Identity & Access Management)

### AI Integration
- Prompt-based communication with OpenAI (GPT-4o)
- Integrated with Spring Retry for robust connectivity
- Token usage logging and monitoring
- All prompt construction and result processing are handled in the backend (AiPromptEngine & AiServiceClient)

### Project Structure
- `backend/`: Java Spring Boot backend application (Multi-module Architecture)
  - `buildSrc/`: Centralized Gradle configuration and dependency management
  - `modules/01-infrastructure/`: Technical infrastructure, external service clients, and test utilities
  - `modules/02-domain/`: Business logic, entities, and repository interfaces
  - `modules/03-application/`: API layer, configuration, and application entry point
  - `modules/04-utilities/`: Common utility tools and data population
- `frontend/`: React-based frontend application (Modular Architecture with DI)
  - `src/infrastructure/`: Core services (DI, Auth, API clients)
  - `src/features/`: Functional modules (Dashboard, Recipes, etc.)
  - `src/shared/`: Common components and layouts
- `docs/`: Architecture and AI design documentation

### Development and Deployment
#### Prerequisites
- Docker & Docker Compose
- Java 21 (SDKMAN recommended: `.sdkmanrc` available)
- Gradle 8.14 (Wrapper) / 8.14.3 (SDKMAN) (Wrapper is included)
- Node.js 18+ & npm (For frontend development)

#### Local Setup (Full Stack with Docker)
Follow the **"🚀 Quick Start for Developers"** section above for a fast setup. Alternatively, manual steps are:

1. Start all services in the root directory:
   ```bash
   docker compose --profile full up --build -d
   ```
2. Create `application.yml` for the backend (copy from example):
   `backend/modules/03-application/src/main/resources/application.yml`
3. Start the Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

#### Backend Manual Run
1. Ensure your infrastructure is running via Docker (`docker compose --profile infra up -d`).
2. Build and package:
```bash
cd backend
./gradlew clean bootJar -x test
```
3. Run:
```bash
java -jar modules/03-application/build/libs/03-application-1.0-SNAPSHOT.jar
```

### Project Scope
This project is developed as a senior graduation project (CENG 407 & CENG 408) and focuses on software architecture, system design, and applied AI integration rather than large-scale data science or model training.

---

<a name="türkçe"></a>
## Türkçe

Bu proje, kullanıcıların ellerindeki malzemelere, diyet tercihlerine ve beslenme hedeflerine göre kişiselleştirilmiş yemek ve diyet önerileri sunan web tabanlı bir uygulamadır. Sistem, tarif yönetimini, besinsel analizi ve yapay zeka destekli önerileri tek bir entegre platformda birleştirmeyi amaçlamaktadır.

### 🚀 Geliştiriciler İçin Hızlı Başlangıç (Adım Adım)

Projeye yeniyseniz, her şeyi yerel makinenizde çalıştırmak için şu adımları izleyin:

1. **Depoyu Klonlayın:**
   ```bash
   git clone https://github.com/your-username/AI-Powered-Personalized-Meal-Recommendation-Platform.git
   cd AI-Powered-Personalized-Meal-Recommendation-Platform
   ```

2. **Her Şeyi Kurun ve Çalıştırın (Docker):**
   Docker'ın çalıştığından emin olun, ardından tüm servisleri (Frontend, Backend, DB, Keycloak, MinIO) tek bir komutla başlatın:
   ```bash
   docker compose --profile full up --build -d
   ```

3. **Uygulamaya Erişin:**
   - **Frontend:** [http://localhost:3030](http://localhost:3030)
   - **Backend API:** [http://localhost:8081](http://localhost:8081)
   - **Keycloak:** [http://localhost:8080](http://localhost:8080) (Admin: `admin/admin`)
   - **Veritabanı:** `localhost:5432`

4. **Test Kullanıcı Bilgileri:**
   - **Kullanıcı Adı:** `user`
   - **Şifre:** `password`

---

### 💻 Sadece Altyapı Kurulumu (Yerel Geliştirme İçin)

Frontend veya backend'i **geliştirme modunda** (Vite/IDE) çalıştırırken veritabanı ve auth sunucusunu Docker'da tutmak isterseniz:

1. **Altyapı Servislerini Başlatın:**
   ```bash
   docker compose --profile infra up -d
   ```
   *Bu sadece PostgreSQL, Keycloak ve MinIO bileşenlerini başlatır.*

2. **Backend'i Çalıştırın (IDE):** IDE'nizden `MealRecommendationApplication` sınıfını çalıştırın.
3. **Frontend'i Çalıştırın (Vite):**
   ```bash
   cd frontend
   npm run dev
   ```
   *Uygulama [http://localhost:3000](http://localhost:3000) adresinde hazır olacaktır.*

---

### Proje Motivasyonu
Mevcut birçok yemek öneri platformu, statik tarif listelerine veya basit filtreleme mekanizmalarına dayanmaktadır. Besinsel analiz genellikle ayrı araçlar tarafından yönetilir ve kişiselleştirme genellikle sınırlıdır. Bu proje, bu özellikleri bireysel kullanıcı profillerine göre önerileri uyarlayan birleşik bir sistemde bir araya getirmeyi amaçlamaktadır.

### Temel Özellikler
- Kullanıcı profil yönetimi (diyet hedefleri, sevilen/sevilmeyen yiyecekler)
- Malzeme bazlı tarif önerileri
- Hibrit AI Öneri Motoru (SQL Filtreleme + Özel Puanlama + LLM Rafine Etme)
- Günlük Yemek Günlüğü ve Tüketim Takibi (Esnek stok düşümü: Evde yapım vs. dışarıdan tüketim)
- Dinamik Veri Seti Desteği (50.000+ tarifin verimli yönetimi)
- Besin değeri hesaplama (kalori, protein, yağ, karbonhidrat)
- Yapay zeka destekli kişiselleştirilmiş yemek ve diyet önerileri (OpenAI GPT-4o Destekli)
- Entegre Dosya Depolama (MinIO) - Tarif görselleri ve kullanıcı yüklemeleri için
- Web tabanlı, modüler ve genişletilebilir mimari

### Teknoloji Yığını
#### Backend
- Java 21
- Spring Boot 3.4.3
- Gradle 8.14 (Wrapper), 8.14.3 (SDKMAN) (Merkezi yönetim ve libs.versions.toml desteği için buildSrc yapısı)
- RESTful API mimarisi
- PostgreSQL (Veritabanı)
- MinIO (Nesne Depolama)
- Keycloak (Kimlik Yönetimi)
- OpenAI API (GPT-4o entegrasyonu ve Spring Retry)
- JaCoCo & SonarQube (Kod Kalitesi ve Test Kapsamı)
- Testcontainers (PostgreSQL, MinIO, Keycloak entegrasyon testleri için)

#### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- API iletişimi için Axios
- Keycloak JS (Merkezi Kimlik Doğrulama)

#### Veritabanı ve Altyapı
- PostgreSQL
- MinIO (Nesne Depolama)
- Keycloak (Kimlik ve Erişim Yönetimi)

### Yapay Zeka Entegrasyonu
- OpenAI (GPT-4o) ile prompt tabanlı iletişim
- Kesintisiz bağlantı için Spring Retry entegrasyonu
- Token kullanım takibi ve loglama
- Tüm prompt oluşturma ve sonuç işleme süreçleri backend (AiPromptEngine & AiServiceClient) tarafında yönetilir

### Proje Yapısı
- `backend/`: Java Spring Boot backend uygulaması (Çok Modüllü Mimari)
  - `buildSrc/`: Merkezi Gradle yapılandırması ve bağımlılık yönetimi
  - `modules/01-infrastructure/`: Teknik altyapı, harici servis istemcileri ve test araçları
  - `modules/02-domain/`: İş mantığı, entity'ler ve repository arayüzleri
  - `modules/03-application/`: API katmanı, yapılandırma ve uygulama giriş noktası
  - `modules/04-utilities/`: Ortak yardımcı araçlar ve veri popülasyonu
- `frontend/`: React tabanlı frontend uygulaması (DI ile Modüler Mimari)
  - `src/infrastructure/`: Çekirdek servisler (DI, Auth, API istemcileri)
  - `src/features/`: Fonksiyonel modüller (Dashboard, Tarifler vb.)
  - `src/shared/`: Ortak bileşenler ve layout'lar
- `docs/`: Mimari ve yapay zeka tasarım dokümantasyonu

### Geliştirme ve Dağıtım
#### Ön Koşullar
- Docker & Docker Compose
- Java 21 (SDKMAN önerilir: `.sdkmanrc` mevcuttur)
- Gradle 8.14 (Wrapper) / 8.14.3 (SDKMAN) (Wrapper dahildir)
- Node.js 18+ & npm (Frontend geliştirme için)

#### Yerel Kurulum (Docker ile Tam Yığın)
Hızlı kurulum için yukarıdaki **"🚀 Geliştiriciler İçin Hızlı Başlangıç"** bölümünü takip edin. Alternatif olarak, manuel adımlar şunlardır:

1. Kök dizinde tüm servisleri başlatın:
   ```bash
   docker compose --profile full up --build -d
   ```
2. Backend için `application.yml` dosyasını oluşturun (örnekten kopyalayarak):
   `backend/modules/03-application/src/main/resources/application.yml`
3. Frontend'i başlatın:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

#### Backend Manuel Çalıştırma
1. Altyapınızın Docker üzerinden çalıştığından emin olun (`docker compose --profile infra up -d`).
2. Derleyin ve paketleyin:
```bash
cd backend
./gradlew clean bootJar -x test
```
3. Çalıştırın:
```bash
java -jar modules/03-application/build/libs/03-application-1.0-SNAPSHOT.jar
```

### Proje Kapsamı
Bu proje, bir bitirme projesi (CENG 407 & CENG 408) olarak geliştirilmiştir ve büyük ölçekli veri bilimi veya model eğitiminden ziyade yazılım mimarisi, sistem tasarımı ve uygulamalı yapay zeka entegrasyonuna odaklanmaktadır.


