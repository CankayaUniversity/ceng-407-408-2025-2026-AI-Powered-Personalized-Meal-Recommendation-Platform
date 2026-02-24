# 🏗️ 01-Infrastructure Modülleri

Bu dizin, uygulamanın teknik altyapısını ve test araçlarını içeren iki ayrı bağımsız modül barındırır. Eski `testFixtures` yapısından tam modüler yapıya geçilmiştir.

## 📂 Modüller

### 1. `infrastructure-core`
Üretim (prod) ortamında kullanılan çekirdek altyapı bileşenlerini içerir.
- **Sorumluluklar:**
  - **AI Prompt Engine:** Yapay zeka modelleri için prompt yönetimi.
  - **External Clients:** OpenAI, Gemini vb. dış servisler için ağ iletişimi.
  - **Persistence:** Veritabanı sürücüleri ve Flyway geçişleri.
- **Kullanım:** Diğer modüllerde `implementation(project(":infrastructure-core"))` olarak eklenir.

### 2. `infrastructure-test`
Tüm projenin paylaşılan test altyapısını sağlar.
- **Sorumluluklar:**
  - `PostgresSingleton`: Testcontainers ile paylaşımlı DB yönetimi.
  - `AbstractSpringTest`: Entegrasyon testleri için temel sınıf.
  - `AbstractMockMvcTest`: Web katmanı testleri için ortak araçlar.
- **Kullanım:** Diğer modüllerde `testImplementation(project(":infrastructure-test"))` olarak eklenir.

## 🔗 Bağımlılık Yönetimi
Artık `testFixtures(project(":01-infrastructure"))` kullanımı **geçersizdir**. Her iki modül de kendi `build.gradle.kts` dosyasına sahiptir ve birbirinden izole edilmiştir.
