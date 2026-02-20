# 🏗️ 01-Infrastructure Modülü

Bu modül, uygulamanın dış dünyaya açılan teknik pencerelerini ve altyapı detaylarını yönetir. **Domain** katmanının "ne yapılması gerektiğini" bildiği durumlarda, bu modül "nasıl yapılacağını" teknik olarak çözer.

## 📂 Klasör Yapısı (Tek Modül Altında Ayrışım)
- `infrastructure-core/`: Üretim (prod) kodları
  - `src/main/java/...`
- `infrastructure-test/`: Paylaşılan test altyapısı (yalnızca test sırasında diğer modüller tarafından tüketilir)
  - `src/main/java/...`

Gradle `sourceSets` ile:
- `main.java.srcDirs = [ "infrastructure-core/src/main/java" ]`
- `testFixtures.java.srcDirs = [ "infrastructure-test/src/main/java" ]`

Diğer modüller (ör. `:03-application`) paylaşılan test altyapısını şöyle kullanır:
```
testImplementation(testFixtures(project(":01-infrastructure")))
```

## 📦 Sorumluluklar (Core)
- **AI Prompt Engine:** Yapay zeka modellerine gönderilecek promptların şablonlanması ve yönetimi.
- **External Clients:** OpenAI, Gemini gibi dış servislerle HTTP iletişimi.
- **Persistence:** Veritabanı sürücüleri ve göç (Flyway) gibi altyapı kütüphaneleri.

## 🧪 Paylaşılan Test Altyapısı (infrastructure-test)
- `PostgresSingleton`: Testcontainers ile tek seferde PostgreSQL konteyneri açar ve tüm testler boyunca paylaşır.
- `TestDataSourceConfig`: `JdbcConnectionDetails` üzerinden Spring'e konteyner JDBC bilgilerini enjekte eder.
- `AbstractSpringTest`: Entegrasyon testleri için temel sınıf; `@SpringBootTest`, `@ActiveProfiles("test")` ve Testcontainers entegrasyonu içerir.
- `AbstractMockMvcTest`: Web katmanı testleri için ortak `MockMvc`/`ObjectMapper` kurulumu ve filtreleri içerir.

## 🔗 Bağımlılıklar
- Core: `spring-boot-starter-data-jpa`, `postgresql`, `flyway-core`, `flyway-database-postgresql`, (gerekiyorsa) `spring-boot-starter-webflux`
- Test (fixtures): `spring-boot-starter-test`, `spring-boot-starter-web`, `testcontainers-junit-jupiter`, `testcontainers-postgresql`
