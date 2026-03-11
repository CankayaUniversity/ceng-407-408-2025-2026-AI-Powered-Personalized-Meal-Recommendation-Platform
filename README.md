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

2. **Setup Infrastructure (Docker):**
   Ensure Docker is running, then start the required services (DB, Keycloak, MinIO):
   ```bash
   cd backend
   docker-compose up -d
   ```

3. **Configure Backend:**
   Create your local `application.yml` by copying the example file:
   ```bash
   cp modules/03-application/src/main/resources/application.yml.example modules/03-application/src/main/resources/application.yml
   ```
   *(Note: You can update the passwords or keys in `application.yml` if necessary.)*

4. **Run Backend:**
   You can run it from your IDE (Run `MealRecommendationApplication`) or via terminal:
   ```bash
   ./gradlew :modules:03-application:bootRun
   ```

5. **Setup & Run Frontend:**
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. **Access the App:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:8081](http://localhost:8081)
   - **Keycloak:** [http://localhost:8080](http://localhost:8080) (Admin: `admin/admin`)

---

### Project Motivation
Many existing meal recommendation platforms rely on static recipe lists or simple filtering mechanisms. Nutritional analysis is often handled by separate tools, and personalization is usually limited. This project aims to bring these features together in a unified system that adapts recommendations according to individual user profiles.

### Key Features
- User profile management (diet goals, liked/disliked foods)
- Ingredient-based recipe recommendations
- Nutritional value calculation (calories, protein, fat, carbohydrates)
- AI-assisted personalized meal and diet suggestions
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
- JaCoCo & SonarClube (Code Quality and Test Coverage)
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
- Prompt-based communication with an online AI service
- AI is accessed via REST API
- All prompt construction and result processing are handled in the backend

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
- Docker & Docker Compose (Required for DB, MinIO, and Keycloak)
- Java 21 (SDKMAN recommended: `.sdkmanrc` available)
- Gradle 8.14 (Wrapper) / 8.14.3 (SDKMAN) (Wrapper is included)
- Node.js 18+ & npm (For frontend development)

#### Local Setup (Full Stack with Docker)
Follow the **"🚀 Quick Start for Developers"** section above for a fast setup. Alternatively, manual steps are:

1. Start Docker services in the root directory:
   ```bash
   cd backend
   docker-compose up -d
   ```
2. Create `application.yml` for the backend (copy from example):
   `backend/modules/03-application/src/main/resources/application.yml`
3. Start the Frontend:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

#### Backend Manual Run
1. Ensure your infrastructure is running via Docker.
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

2. **Altyapıyı Kurun (Docker):**
   Docker'ın çalıştığından emin olun, ardından gerekli servisleri (DB, Keycloak, MinIO) başlatın:
   ```bash
   cd backend
   docker-compose up -d
   ```

3. **Backend'i Yapılandırın:**
   Örnek dosyayı kopyalayarak yerel `application.yml` dosyanızı oluşturun:
   ```bash
   cp modules/03-application/src/main/resources/application.yml.example modules/03-application/src/main/resources/application.yml
   ```
   *(Not: Gerekirse `application.yml` içindeki şifreleri veya anahtarları güncelleyebilirsiniz.)*

4. **Backend'i Çalıştırın:**
   IDE'nizden (`MealRecommendationApplication`'ı çalıştırın) veya terminal üzerinden çalıştırabilirsiniz:
   ```bash
   ./gradlew :modules:03-application:bootRun
   ```

5. **Frontend'i Kurun ve Çalıştırın:**
   Yeni bir terminal penceresi açın:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. **Uygulamaya Erişin:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:8081](http://localhost:8081)
   - **Keycloak:** [http://localhost:8080](http://localhost:8080) (Admin: `admin/admin`)

---

### Proje Motivasyonu
Mevcut birçok yemek öneri platformu, statik tarif listelerine veya basit filtreleme mekanizmalarına dayanmaktadır. Besinsel analiz genellikle ayrı araçlar tarafından yönetilir ve kişiselleştirme genellikle sınırlıdır. Bu proje, bu özellikleri bireysel kullanıcı profillerine göre önerileri uyarlayan birleşik bir sistemde bir araya getirmeyi amaçlamaktadır.

### Temel Özellikler
- Kullanıcı profil yönetimi (diyet hedefleri, sevilen/sevilmeyen yiyecekler)
- Malzeme bazlı tarif önerileri
- Besin değeri hesaplama (kalori, protein, yağ, karbonhidrat)
- Yapay zeka destekli kişiselleştirilmiş yemek ve diyet önerileri
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
- Çevrimiçi bir yapay zeka servisi ile prompt tabanlı iletişim
- Yapay zekaya REST API üzerinden erişim
- Tüm prompt oluşturma ve sonuç işleme süreçleri backend tarafında yönetilir

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
- Docker & Docker Compose (DB, MinIO ve Keycloak için gereklidir)
- Java 21 (SDKMAN önerilir: `.sdkmanrc` mevcuttur)
- Gradle 8.14 (Wrapper) / 8.14.3 (SDKMAN) (Wrapper dahildir)
- Node.js 18+ & npm (Frontend geliştirme için)

#### Yerel Kurulum (Docker ile Tam Yığın)
Hızlı kurulum için yukarıdaki **"🚀 Geliştiriciler İçin Hızlı Başlangıç"** bölümünü takip edin. Alternatif olarak, manuel adımlar şunlardır:

1. Kök dizinde Docker servislerini başlatın:
   ```bash
   cd backend
   docker-compose up -d
   ```
2. Backend için `application.yml` dosyasını oluşturun (örnekten kopyalayarak):
   `backend/modules/03-application/src/main/resources/application.yml`
3. Frontend'i başlatın:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

#### Backend Manuel Çalıştırma
1. Altyapınızın Docker üzerinden çalıştığından emin olun.
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
