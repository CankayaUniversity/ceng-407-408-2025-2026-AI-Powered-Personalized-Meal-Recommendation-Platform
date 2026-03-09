# 🚀 03-Application Modülü

Uygulamanın giriş kapısı ve dış dünya ile iletişim katmanıdır. Spring Boot burada başlar.

## 📦 Sorumluluklar
- **REST API (Controllers):** HTTP isteklerini karşılar ve yanıtları döner.
- **DTO (Data Transfer Objects):** Dış dünyaya veri sunarken kullanılan modeller.
- **Mappers:** Domain Entity'leri ile API DTO'ları arasındaki dönüşümler.
- **Orchestration:** Birden fazla Domain servisini çağırarak karmaşık API akışlarını yönetir.

## 📂 Önemli Birimler
- `controller/`: API uç noktaları.
- `model.dto/`: Request ve Response nesneleri.
- `exception/`: Global hata yönetimi.

## 🔗 Bağımlılıklar
Bu modül **Domain** ve **Infrastructure** modüllerini kullanır. Sistemin orkestra şefidir.

---

## 🛠 Keycloak Kurulum ve Ayar Import Rehberi
Bu rehber, projedeki Keycloak ayarlarını (Realm, Client, Roles) tek seferde kendi Docker ortamınıza kurmanuzu sağlar.

### 1. Hazırlık
`realm-export.json` dosyasını proje klasörünüzün (`backend/modules/03-application/src/main/resources/` veya uygun bir yer) içine koyun.

### 2. PostgreSQL Veritabanını Hazırlama
Keycloak verilerinin kalıcı olması için önce Postgres içinde veritabanını oluşturun:

```bash
docker exec -it postgresql psql -U postgres -c "CREATE DATABASE keycloak_db;"
```

### 3. Keycloak'ı Başlatma (Geliştirme Modu)
Keycloak'ı modern sürümüyle (v26+) başlatmak için `start-dev` komutu kullanılır.

```bash
docker run -d --name keycloak-auth \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

### 4. Keycloak Manuel Yapılandırma
Otomatik import yerine manuel kurulum yapacaksanız:
1. Sol üstten **Create Realm** diyerek `meal-app-realm` oluşturun.
2. **Clients** sekmesinden `meal-app-backend` isimli bir istemci oluşturun.
3. Client ayarlarında:
   - **Client Authentication:** OFF
   - **Authentication Flow:** Standard Flow & Direct Access Grants
   - **Valid Redirect URIs:** `http://localhost:3000/*`
   - **Web Origins (CORS):** `http://localhost:3000` (veya `*`)

### 5. Backend (Spring Boot) Ayarı
`application.yml` dosyasında Issuer URI ve JWK Set URI değerlerinin `localhost` üzerinden yapılandırıldığından emin olun:
- **Issuer URI:** `http://localhost:8080/realms/meal-app-realm`
- **JWK Set URI:** `http://localhost:8080/realms/meal-app-realm/protocol/openid-connect/certs`

> **Not:** Kullanıcı ID'leri `String` tipindedir. Keycloak sub değeri veritabanında birincil anahtar (Primary Key) olarak saklanır.
