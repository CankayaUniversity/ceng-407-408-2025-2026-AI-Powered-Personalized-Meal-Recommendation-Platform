# 🏗️ 01-Infrastructure Modules / 01-Infrastructure Modülleri

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

This directory contains two separate independent modules including the technical infrastructure and test tools of the application. Thanks to the modular structure, production and test codes are separated from each other.

### 📂 Modules

#### 1. `infrastructure-core`
Contains core infrastructure components used in the production (prod) environment.
- **Responsibilities:**
  - **AI Prompt Engine:** Prompt management for AI models.
  - **External Clients:** Network communication for external services like OpenAI, Gemini, etc.
  - **Persistence:** Database drivers and Flyway migrations.
  - **Object Storage (MinIO):** File upload, deletion, and URL generation operations with `MinioFileStorageService`.
- **Usage:** Added as `implementation(project(":infrastructure-core"))` in other modules.

#### 2. `infrastructure-test`
Provides shared test infrastructure and Testcontainers configuration for the entire project.
- **Responsibilities:**
  - `PostgresSingleton`, `MinioInitConfig`, `KeycloakSingleton`: Manages database, storage (MinIO), and identity management services as singletons using Testcontainers. Prevents conflicts by performing dynamic port assignment during tests.
  - `AbstractSpringTest`: Provides the base configuration for integration tests.
  - `RecipeSeedService`: Test data preparation service.
- **Usage:** Added as `testImplementation project(":modules:01-infrastructure:infrastructure-test")` in other modules.

### 🔗 Dependency Management
Both modules have their own `build.gradle` file and are isolated from each other. Modules are included in other parts of the project as `implementation` or `testImplementation` according to their responsibilities.

---

<a name="türkçe"></a>
## Türkçe

Bu dizin, uygulamanın teknik altyapısını ve test araçlarını içeren iki ayrı bağımsız modül barındırır. Modüler yapı sayesinde üretim ve test kodları birbirinden ayrılmıştır.

### 📂 Modüller

#### 1. `infrastructure-core`
Üretim (prod) ortamında kullanılan çekirdek altyapı bileşenlerini içerir.
- **Sorumluluklar:**
  - **AI Prompt Engine:** Yapay zeka modelleri için prompt yönetimi.
  - **External Clients:** OpenAI, Gemini vb. dış servisler için ağ iletişimi.
  - **Persistence:** Veritabanı sürücüleri ve Flyway geçişleri.
  - **Object Storage (MinIO):** `MinioFileStorageService` ile dosya yükleme, silme ve URL oluşturma işlemleri.
- **Kullanım:** Diğer modüllerde `implementation(project(":infrastructure-core"))` olarak eklenir.

#### 2. `infrastructure-test`
Tüm projenin paylaşılan test altyapısını ve Testcontainers yapılandırmasını sağlar.
- **Sorumluluklar:**
  - `PostgresSingleton`, `MinioInitConfig`, `KeycloakSingleton`: Testcontainers ile veritabanı, depolama (MinIO) ve kimlik yönetimi servislerini tekil (singleton) olarak yönetir. Testler sırasında dinamik port ataması yaparak çakışmaları önler.
  - `AbstractSpringTest`: Entegrasyon testleri için temel yapılandırmayı sağlar.
  - `RecipeSeedService`: Test verisi hazırlama servisidir.
- **Kullanım:** Diğer modüllerde `testImplementation project(":modules:01-infrastructure:infrastructure-test")` olarak eklenir.

### 🔗 Bağımlılık Yönetimi
Her iki modül de kendi `build.gradle` dosyasına sahiptir ve birbirinden izole edilmiştir. Modüller, sorumluluklarına göre `implementation` veya `testImplementation` olarak projenin diğer kısımlarına dahil edilir.
