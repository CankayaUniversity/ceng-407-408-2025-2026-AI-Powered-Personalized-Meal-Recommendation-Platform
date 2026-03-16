# 🧱 infrastructure-core (01-infrastructure)

[English](#english) | [Türkçe](#türkçe)

---

<a name="english"></a>
## English

This folder contains the production (prod) code within the `01-infrastructure` module.

### 📂 Layout
- `src/main/java/com/mealapp/infrastructure/...`
  - `ai/promptengine/AiPromptEngine`
  - `network/client/AiServiceClient`
  - `storage/MinioFileStorageService`: Manages file storage operations via MinIO.

### 🔗 Core Dependencies
- `spring-boot-starter-data-jpa`
- `org.postgresql:postgresql`
- `org.flywaydb:flyway-core`
- `org.flywaydb:flyway-database-postgresql`
- `io.minio:minio`: MinIO client for object storage access.
- (optional) `spring-boot-starter-webflux`

Test infrastructure and Testcontainers are not in this folder, but are kept in the `infrastructure-test` folder.

---

<a name="türkçe"></a>
## Türkçe

Bu klasör, 01-infrastructure modülü içinde üretim (prod) kodlarını barındırır.

### 📂 Yerleşim
- `src/main/java/com/mealapp/infrastructure/...`
  - `ai/promptengine/AiPromptEngine`
  - `network/client/AiServiceClient`
  - `storage/MinioFileStorageService`: MinIO üzerinden dosya depolama işlemlerini yönetir.

### 🔗 Çekirdek Bağımlılıklar
- `spring-boot-starter-data-jpa`
- `org.postgresql:postgresql`
- `org.flywaydb:flyway-core`
- `org.flywaydb:flyway-database-postgresql`
- `io.minio:minio`: Object storage erişimi için MinIO istemcisi.
- (gerekiyorsa) `spring-boot-starter-webflux`

Test altyapısı ve Testcontainers bu klasörde değil, `infrastructure-test` klasöründe tutulur.
