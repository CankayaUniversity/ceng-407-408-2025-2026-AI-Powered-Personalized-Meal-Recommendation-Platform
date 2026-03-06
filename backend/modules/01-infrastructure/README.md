# 🏗️ 01-Infrastructure Modülleri

Bu dizin, uygulamanın teknik altyapısını ve test araçlarını içeren iki ayrı bağımsız modül barındırır. Modüler yapı sayesinde üretim ve test kodları birbirinden ayrılmıştır.

## 📂 Modüller

### 1. `infrastructure-core`
Üretim (prod) ortamında kullanılan çekirdek altyapı bileşenlerini içerir.
- **Sorumluluklar:**
  - **AI Prompt Engine:** Yapay zeka modelleri için prompt yönetimi.
  - **External Clients:** OpenAI, Gemini vb. dış servisler için ağ iletişimi.
  - **Persistence:** Veritabanı sürücüleri ve Flyway geçişleri.
  - **Object Storage (MinIO):** `MinioFileStorageService` ile dosya yükleme, silme ve URL oluşturma işlemleri.
- **Kullanım:** Diğer modüllerde `implementation(project(":infrastructure-core"))` olarak eklenir.

### 2. `infrastructure-test`
Tüm projenin paylaşılan test altyapısını ve Testcontainers yapılandırmasını sağlar.
- **Sorumluluklar:**
  - `PostgresSingleton`, `MinioInitConfig`, `KeycloakSingleton`: Testcontainers ile veritabanı, depolama (MinIO) ve kimlik yönetimi servislerini tekil (singleton) olarak yönetir. Testler sırasında dinamik port ataması yaparak çakışmaları önler.
  - `AbstractSpringTest`: Entegrasyon testleri için temel yapılandırmayı sağlar.
  - `RecipeSeedService`: Test verisi hazırlama servisidir.
- **Kullanım:** Diğer modüllerde `testImplementation project(":modules:01-infrastructure:infrastructure-test")` olarak eklenir.

## 🔗 Bağımlılık Yönetimi
Her iki modül de kendi `build.gradle` dosyasına sahiptir ve birbirinden izole edilmiştir. Modüller, sorumluluklarına göre `implementation` veya `testImplementation` olarak projenin diğer kısımlarına dahil edilir.
