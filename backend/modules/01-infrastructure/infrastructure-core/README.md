# 🧱 infrastructure-core (01-infrastructure)

Bu klasör, 01-infrastructure modülü içinde üretim (prod) kodlarını barındırır.

## 📂 Yerleşim
- `src/main/java/com/mealapp/infrastructure/...`
  - `ai/promptengine/AiPromptEngine`
  - `network/client/AiServiceClient`

## 🔗 Çekirdek Bağımlılıklar
- `spring-boot-starter-data-jpa`
- `org.postgresql:postgresql`
- `org.flywaydb:flyway-core`
- `org.flywaydb:flyway-database-postgresql`
- (gerekiyorsa) `spring-boot-starter-webflux`

Test altyapısı ve Testcontainers bu klasörde değil, `infrastructure-test` klasöründe tutulur.
