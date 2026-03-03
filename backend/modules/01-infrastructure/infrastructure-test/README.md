# 🧪 infrastructure-test (01-infrastructure)

Bu klasör, 01-infrastructure modülü içinde paylaşılan test altyapısını ve Testcontainers yapılandırmalarını barındırır. Diğer modüller (örn. `:modules:03-application`) bu altyapıyı testlerinde kullanır:
```gradle
testImplementation project(':modules:01-infrastructure:infrastructure-test')
```

## 📂 Yerleşim
- `src/main/java/com/mealapp/infrastructure/test/...`
  - `PostgresSingleton` & `KeycloakSingleton` & `MinioInitConfig`: Testcontainers servis yönetimi.
  - `TestDataSourceConfig`: `JdbcConnectionDetails` ile Spring’e dinamik JDBC bilgisini sağlar ve test loglarını detaylandırır.
  - `RecipeSeedService`: Test verisi hazırlama.
  - `AbstractSpringTest`: Entegrasyon test tabanı (`@SpringBootTest`, `@ActiveProfiles("test")`).
  - `AbstractMockMvcTest`: Web katmanı testleri için ortak araçlar.

## 🔗 Bağımlılıklar
- `spring-boot-starter-test` & `testcontainers` (Postgres, Minio, Keycloak)
- `io.minio:minio` (Nesne depolama testleri için)
- `com.github.dasniko:testcontainers-keycloak` (Kimlik yönetimi testleri için)

Not: Üretim kodları `infrastructure-core` klasöründedir; burada yalnızca test desteği bulunur.
