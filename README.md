

# AI-Powered Personalized Meal Recommendation Platform / AI Destekli Kişiselleştirilmiş Yemek Önerisi Platformu

<p align="center">
  <!-- Sola Amblem (Yüksekliği sabitlendi, genişlik otomatik oranlandı) -->
  <img alt="Me-Al Amblem" src="frontend/src/assets/meal_amblem.png" height="140" style="vertical-align: middle; margin-right: 25px; display: inline-block;">
  <!-- Sağa Temaya Duyarlı Logo (Yüksekliği amblem ile birebir eşitlendi) -->
  <span style="display: inline-block; vertical-align: middle;">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="frontend/src/assets/meal_logo_dark.png">
      <source media="(prefers-color-scheme: light)" srcset="frontend/src/assets/meal_logo_light.png">
      <img alt="Me-Al Logo" src="frontend/src/assets/meal_logo_light.png" height="140" style="vertical-align: middle;">
    </picture>
  </span>
</p>



<p align="center">
  <strong>Advanced Software Architecture & Multi-Provider AI Integration Framework</strong><br>
  Developed as a Senior Graduation Project (CENG 407 & CENG 408)
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 21"/>
  <img src="https://img.shields.io/badge/Spring_Boot-3.4.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot"/>
  <img src="https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 18"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Keycloak-OIDC-CH0000?style=for-the-badge&logo=keycloak&logoColor=white" alt="Keycloak"/>
  <img src="https://img.shields.io/badge/Docker-Infrastructure-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

---

## 🗺️ Navigation / Dil Seçimi
[English Documentation](#english) | [Türkçe Dokümantasyon](#türkçe)
---

<a name="english"></a>
## 🇺🇸 / 🇬🇧 EN - English Documentation

**Me-Al** is a web-based, production-ready application that delivers personalized meal and diet recommendations based on real-time ingredient inventories, explicit dietary preferences, and distinct user nutrition goals. 

Instead of relying on static filtering or basic data science models, this project showcases a rigorous approach to **enterprise software engineering**: standardizing complex multi-provider AI communication, enforcing a strict backend-driven business layer, and managing a robust containerized infrastructure environment.

### 🚀 Quick Start for Developers

#### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/AI-Powered-Personalized-Meal-Recommendation-Platform.git](https://github.com/your-username/AI-Powered-Personalized-Meal-Recommendation-Platform.git)
cd AI-Powered-Personalized-Meal-Recommendation-Platform

```

#### 2. Full Stack Bootstrapping (All-in-One Docker)

Ensure Docker is active, then execute the following profile command to launch the entire ecosystem (Frontend, Backend, DB, Keycloak, MinIO) simultaneously:

```bash
docker compose --profile full up --build -d

```

#### 3. Access Matrix & Default Credentials

* **Frontend Client:** [http://localhost:3030](https://www.google.com/search?q=http://localhost:3030)
* **Backend REST API:** [http://localhost:8081](https://www.google.com/search?q=http://localhost:8081)
* **Keycloak Server:** [http://localhost:8080](https://www.google.com/search?q=http://localhost:8080) (Admin: `admin/admin`)
* **PostgreSQL Instance:** `localhost:5432`
* **Default App Account:** Username: `user` | Password: `password`

---

### 💻 Infrastructure-Isolated Local Development

If you prefer executing the frontend or backend in **hot-reload development mode** (via IDE / Vite) while maintaining structural storage and auth servers inside Docker:

```bash
# Step 1: Spin up only the auxiliary infrastructure
docker compose --profile infra up -d

# Step 2: Run Backend Application
# Execute 'MealRecommendationApplication' from your favorite Java IDE (IntelliJ/Eclipse)

# Step 3: Run Frontend Client
cd frontend
npm install
npm run dev
# The client runtime shifts to: http://localhost:3000

```

---

### 🌟 Core Architecture & Engineering Highlights

* **Thin Client Architecture:** Absolute centralization of business parameters, nutritional conversions, and computational state. The React client functions strictly as a presentation tier (Single Source of Truth paradigm).
* **Hybrid AI Recommendation Engine:** Executes a three-tiered evaluation pipeline:
1. Fast relational SQL pre-filtering against available datasets.
2. Dynamic algorithmic scoring based on nutritional thresholds.
3. LLM Refinement utilizing context-aware prompt payloads.


* **Negative Craving & Deep Matching:** Negative filters (e.g., *"no onion"*) actively penalize scores rather than breaking queries. Cravings are mapped across the complete, nested structural ingredient manifests of **50,000+ recipes**, bypassing superficial title string matches.
* **Multi-Provider Multi-Model AI Client:** Built-in dynamic runtime switching and reliable fallback handling across OpenAI (GPT-4o), Google Gemini, Anthropic Claude, Mistral, and DeepSeek. Integrated with `Spring Retry` mechanisms to counteract external throttling.
* **Isolated Ephemeral Testing:** Implements `Testcontainers` within the integration testing suite to programmatically manage real PostgreSQL, MinIO, and Keycloak behaviors during continuous integration.

---

### 📂 Technical Project Structure

The project explicitly ditches generic monolithic styles for a highly decoupled, modular application footprint:

```markdown
├── backend/                             # Multi-Module Gradle Enterprise Architecture
│   ├── buildSrc/                        # Structural build plugins & centralized dependency tracking (libs.versions.toml)
│   └── modules/
│       ├── 01-infrastructure/           # Drivers, object clients (MinIO), and external LLM API abstractions
│       ├── 02-domain/                   # Isolated Pure Core Business Entities & Domain Contracts
│       ├── 03-application/              # Web Controller endpoints, global security filters, & application main runner
│       └── 04-utilities/                # Shared data-seeding engines & migration scripts
├── frontend/                            # Modular UI Framework via TypeScript & Vite
│   └── src/
│       ├── infrastructure/              # Contextual DI containers, Auth providers, and API Interceptors
│       ├── features/                    # Independent domain visual units (Dashboard, Inventory, Recipes)
│       └── shared/                      # Global UI building blocks & theme layouts
└── docs/                                # Technical Blueprints & AI Interaction schemas

```

---

### 🛠️ Production Technology Stack

#### Backend Tier

* **Runtime & Framework:** Java 21, Spring Boot 3.4.3, Gradle 8.14+ (Wrapper structure)
* **Data Layout:** PostgreSQL, MinIO (Object Storage framework for image distribution)
* **Security Architecture:**  Keycloak OIDC (Standalone custom client themes embedded)
* **Quality Metrics:** JaCoCo & SonarQube automation for target assertion tracking

#### Frontend Tier

* **Core UI Engine:** React 18, TypeScript, Vite Bundler
* **Styles & Interactivity:** Tailwind CSS, Axios Client, Keycloak JS Adaptor, Full client-side Internationalization (i18n)

---

<a name="türkçe"></a>
## 🇹🇷 TR - Türkçe Dokümantasyon

**Me-Al**, kullanıcıların anlık malzeme envanterlerine, beslenme tercihlerine ve kişisel sağlık hedeflerine göre uyarlanmış dinamik yemek önerileri sunan, üretime hazır bir web uygulamasıdır.

Statik filtrelemeler veya geleneksel veri bilimi yaklaşımları yerine bu proje, **ileri düzey yazılım mühendisliği** prensiplerine odaklanır: Çoklu yapay zeka servis sağlayıcılarının standartlaştırılması, iş mantığının tamamen backend odaklı yönetimi ve izole dockerize edilmiş altyapı mimarisi projenin temelini oluşturur.

### 🚀 Geliştiriciler İçin Hızlı Başlangıç

#### 1. Depoyu Klonlayın

```bash
git clone [https://github.com/your-username/AI-Powered-Personalized-Meal-Recommendation-Platform.git](https://github.com/your-username/AI-Powered-Personalized-Meal-Recommendation-Platform.git)
cd AI-Powered-Personalized-Meal-Recommendation-Platform

```

#### 2. Tam Yığın Kurulumu (Docker ile Tek Seferde)

Docker'ın çalıştığından emin olduktan sonra, tüm ekosistemi (Frontend, Backend, DB, Keycloak, MinIO) tek bir hamlede ayağa kaldırmak için aşağıdaki profilli komutu çalıştırın:

```bash
docker compose --profile full up --build -d

```

#### 3. Erişim Matrisi ve Varsayılan Bilgiler

* **Frontend Arayüzü:** [http://localhost:3030](https://www.google.com/search?q=http://localhost:3030)
* **Backend REST API:** [http://localhost:8081](https://www.google.com/search?q=http://localhost:8081)
* **Keycloak Paneli:** [http://localhost:8080](https://www.google.com/search?q=http://localhost:8080) (Admin: `admin/admin`)
* **PostgreSQL Veritabanı:** `localhost:5432`
* **Varsayılan Test Hesabı:** Kullanıcı Adı: `user` | Şifre: `password`

---

### 💻 Sadece Altyapı Kurulumu (Yerel Geliştirme İçin)

Frontend veya backend kodlarında **anlık değişim takibiyle** (IDE veya Vite üzerinden) çalışırken, veritabanı ve kimlik doğrulama sunucularını Docker üzerinde sabit tutmak isterseniz:

```bash
# 1. Adım: Sadece yapısal altyapı servislerini başlatın
docker compose --profile infra up -d

# 2. Adım: Backend'i Çalıştırın
# Favori Java IDE'niz üzerinden 'MealRecommendationApplication' sınıfını doğrudan çalıştırın

# 3. Adım: Frontend'i Çalıştırın
cd frontend
npm install
npm run dev
# Yerel arayüz çalışma adresi: http://localhost:3000

```

---

### 🌟 Öne Çıkan Mimari ve Mühendislik Detayları

* **İnce İstemci (Thin Client) Mimarisi:** Tüm iş kuralları, kalori/besin hesaplamaları ve birim dönüşüm metrikleri tamamen backend üzerinde merkezileştirilmiştir. React arayüzü yalnızca veriyi görselleştirmekle yükümlüdür (Single Source of Truth).
* **Hibrit Yapay Zeka Öneri Motoru:** Öneriler üç aşamalı bir hattan geçer:
1. İlişkisel veritabanı (SQL) üzerinde hızlı ön filtreleme.
2. Besinsel eşiklere göre matematiksel puanlama.
3. LLM (Büyük Dil Modeli) katmanında bağlama uygun prompt rafine etme süreci.


* **Negatif Arzu Tespiti (Negative Craving):** Kullanıcının istemediği malzemeler (*Örn: "soğan istemiyorum"*) listeyi tamamen bozmaz, akıllı penalizasyon algoritmasıyla ilgili tariflerin puanını düşürür. Eşleştirmeler tarif başlıklarından değil, **50.000+ tarifin** derin malzeme ağaçları taranarak yapılır.
* **Çoklu AI Sağlayıcı ve Akıllı Geçiş (Multi-Provider):** OpenAI (GPT-4o), Google Gemini, Anthropic Claude, Mistral ve DeepSeek modelleri arasında çalışma zamanında dinamik geçiş ve hata durumlarında bir sonrakine devretme (fallback) mekanizması. Dış servis kesintilerine karşı `Spring Retry` entegrasyonu mevcuttur.
* **Testcontainers ile İzole Test Ortamı:** Entegrasyon testleri sırasında gerçek PostgreSQL, MinIO ve Keycloak davranışları, lokal bağımlılık yaratılmaksızın `Testcontainers` kütüphanesi aracılığıyla dockerize edilerek ayağa kaldırılır ve test edilir.

---

### 📂 Proje Klasör Yapısı

Geleneksel monolitik katmanlı yapılar yerine, sorumlulukların net ayrıldığı çok modüllü (multi-module) bir yapı tercih edilmiştir:

```markdown
├── backend/                             # Çok Modüllü Kurumsal Gradle Mimarisi
│   ├── buildSrc/                        # Merkezi Gradle eklentileri & merkezi bağımlılık yönetimi (libs.versions.toml)
│   └── modules/
│       ├── 01-infrastructure/           # Sürücüler, nesne depolama (MinIO) ve dış LLM API soyutlamaları
│       ├── 02-domain/                   # Dış dünyadan tamamen izole Saf İş Mantığı Modeli ve Repository Arayüzleri
│       ├── 03-application/              # REST Kontrolörleri, global güvenlik filtreleri ve uygulama ana tetikleyicisi
│       └── 04-utilities/                # Veritabanı popülasyon motorları ve migrasyon betikleri
├── frontend/                            # Bağımlılık Enjeksiyonlu (DI) Modüler TypeScript & Vite Yapısı
│   └── src/
│       ├── infrastructure/              # Global DI konteynerleri, Auth sağlayıcıları ve API Interceptor katmanları
│       ├── features/                    # Birbirinden bağımsız çalışan işlevsel modüller (Dashboard, Stok, Tarifler)
│       └── shared/                      # Ortak UI bileşenleri, logolar ve tema şablonları
└── docs/                                # Sistem mimarisi ve yapay zeka entegrasyon şemaları

```

---

### 🛠️ Kullanılan Teknoloji Yığını

#### Backend Katmanı

* **Çalışma Zamanı ve Framework:** Java 21, Spring Boot 3.4.3, Gradle 8.14+ (Wrapper sistemi)
* **Veri Yönetimi:** PostgreSQL, MinIO (Görsel ve kullanıcı yüklemeleri için yerel nesne depolama katmanı)
* **Güvenlik:**  Keycloak OIDC (Projeye özel entegre edilmiş yerel kullanıcı temaları ile)
* **Kalite Metrikleri:** Sürekli entegrasyon hatları için JaCoCo ve SonarQube test kapsamı otomasyonu

#### Frontend Katmanı

* **Arayüz Motoru:** React 18, TypeScript, Vite Derleyicisi
* **Tasarım ve İletişim:** Tailwind CSS, Axios İstemcisi, Keycloak JS Adaptörü, Frontend ve Backend genelinde tam çoklu dil (i18n) desteği.
---
