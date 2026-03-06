# 🧱 infrastructure-core (01-infrastructure)

Bu klasör, 01-infrastructure modülü içinde üretim (prod) kodlarını barındırır.

## 📂 Yerleşim
- `src/main/java/com/mealapp/infrastructure/...`
  - `ai/promptengine/AiPromptEngine`
  - `network/client/AiServiceClient`
  - `storage/MinioFileStorageService`: MinIO üzerinden dosya depolama işlemlerini yönetir.

## 🔗 Çekirdek Bağımlılıklar
- `spring-boot-starter-data-jpa`
- `org.postgresql:postgresql`
- `org.flywaydb:flyway-core`
- `org.flywaydb:flyway-database-postgresql`
- `io.minio:minio`: Object storage erişimi için MinIO istemcisi.
- (gerekiyorsa) `spring-boot-starter-webflux`

Test altyapısı ve Testcontainers bu klasörde değil, `infrastructure-test` klasöründe tutulur.
