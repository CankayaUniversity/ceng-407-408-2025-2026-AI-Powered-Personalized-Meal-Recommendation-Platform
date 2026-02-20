# 🧪 infrastructure-test (01-infrastructure)

Bu klasör, 01-infrastructure modülü içinde paylaşılan test altyapısını barındırır. Diğer modüller (örn. `:03-application`) bu altyapıyı yalnızca test sırasında tüketir:
```
testImplementation(testFixtures(project(":01-infrastructure")))
```

## 📂 Yerleşim
- `src/main/java/com/mealapp/infrastructure/test/...`
  - `PostgresSingleton`: Testcontainers PostgreSQL’i tekil (singleton) olarak ayağa kaldırır.
  - `TestDataSourceConfig`: `JdbcConnectionDetails` ile Spring’e dinamik JDBC bilgisini sağlar.
  - `AbstractSpringTest`: Entegrasyon test tabanı (`@SpringBootTest`, `@ActiveProfiles("test")`).
  - `AbstractMockMvcTest`: Web katmanı testleri için ortak `MockMvc`/`ObjectMapper` kurulumu ve filtreler.

## 🔗 Bağımlılıklar (test fixtures)
- `spring-boot-starter-test`
- `spring-boot-starter-web` (MockMvc ve Jackson için)
- `org.testcontainers:junit-jupiter`
- `org.testcontainers:postgresql`
- `org.postgresql:postgresql`

Not: Üretim kodları `infrastructure-core` klasöründedir; burada yalnızca test desteği bulunur.
