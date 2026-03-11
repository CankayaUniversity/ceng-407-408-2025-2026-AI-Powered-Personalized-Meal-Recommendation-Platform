# 🧪 infrastructure-test (01-infrastructure)

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

This folder contains the shared test infrastructure and Testcontainers configurations within the `01-infrastructure` module. Other modules (e.g., `:modules:03-application`) use this infrastructure in their tests:

```gradle
testImplementation project(':modules:01-infrastructure:infrastructure-test')
```

### 📂 Layout
- `src/main/java/com/mealapp/infrastructure/test/...`
  - `PostgresSingleton` & `KeycloakSingleton` & `MinioInitConfig`: Testcontainers service management.
  - `TestDataSourceConfig`: Provides dynamic JDBC information to Spring via `JdbcConnectionDetails` and details test logs.
  - `RecipeSeedService`: Test data preparation.
  - `AbstractSpringTest`: Integration test base (`@SpringBootTest`, `@ActiveProfiles("test")`).
  - `AbstractMockMvcTest`: Shared tools for web layer tests.

### 🔗 Dependencies
- `spring-boot-starter-test` & `testcontainers` (Postgres, Minio, Keycloak)
- `io.minio:minio` (For object storage tests)
- `com.github.dasniko:testcontainers-keycloak` (For identity management tests)

**Note:** Production code is in the `infrastructure-core` folder; only test support is provided here.

---

<a name="türkçe"></a>
## Türkçe

Bu klasör, 01-infrastructure modülü içinde paylaşılan test altyapısını ve Testcontainers yapılandırmalarını barındırır. Diğer modüller (örn. `:modules:03-application`) bu altyapıyı testlerinde kullanır:

```gradle
testImplementation project(':modules:01-infrastructure:infrastructure-test')
```

### 📂 Yerleşim
- `src/main/java/com/mealapp/infrastructure/test/...`
  - `PostgresSingleton` & `KeycloakSingleton` & `MinioInitConfig`: Testcontainers servis yönetimi.
  - `TestDataSourceConfig`: `JdbcConnectionDetails` ile Spring’e dinamik JDBC bilgisini sağlar ve test loglarını detaylandırır.
  - `RecipeSeedService`: Test verisi hazırlama.
  - `AbstractSpringTest`: Entegrasyon test tabanı (`@SpringBootTest`, `@ActiveProfiles("test")`).
  - `AbstractMockMvcTest`: Web katmanı testleri için ortak araçlar.

### 🔗 Bağımlılıklar
- `spring-boot-starter-test` & `testcontainers` (Postgres, Minio, Keycloak)
- `io.minio:minio` (Nesne depolama testleri için)
- `com.github.dasniko:testcontainers-keycloak` (Kimlik yönetimi testleri için)

**Not:** Üretim kodları `infrastructure-core` klasöründedir; burada yalnızca test desteği bulunur.
