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

### 3. Keycloak'ı Import Ederek Başlatma (Bağımsız Docker Komutu)
Eğer sadece Keycloak'ı tek başına başlatmak isterseniz aşağıdaki komutu kullanabilirsiniz. Ancak **tavsiye edilen yöntem**, kök dizindeki `docker-compose.yml` dosyasını kullanmaktır.

Aşağıdaki komutta `/path/to/realm-export.json` kısmını, dosyanın bilgisayarınızdaki tam yoluyla değiştirin.

```bash
docker run -d --name keycloak-auth \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -v /path/to/realm-export.json:/opt/keycloak/data/import/realm.json \
  quay.io/keycloak/keycloak:22.0.1 \
  start-dev --import-realm
```

### 4. Docker Compose ile Hepsi Bir Arada
Tüm sistemi (Postgres, MinIO, Keycloak ve Backend) tek seferde başlatmak için projenin kök dizininde şu komutu çalıştırın:

```bash
docker-compose up --build -d
```

### 5. Kurulum Sonrası Kontroller
Konteyner açıldıktan sonra şu adresten giriş yapabilirsiniz:
- **URL:** http://localhost:8080
- **Kullanıcı/Şifre:** admin / admin
- **Realm:** `meal-app-realm` alanının sol üstte seçili olduğunu teyit edin.

#### ⚠️ Önemli: SSL Engeline Takılmamak İçin (MacOS/Linux)
Keycloak ilk kurulumda lokalde çalışırken bile HTTPS zorunluluğu isteyebilir. Eğer http://localhost:8080 adresine girdiğinizde bağlantı hatası alırsanız, şu komutu terminale yapıştırarak SSL zorunluluğunu kapatın:

```bash
docker exec -it keycloak-auth /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin && \
docker exec -it keycloak-auth /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE
```

### 6. Backend (Spring Boot) Ayarı
`application.yml` dosyanızda şu değerlerin export dosyasındakiyle aynı olduğundan emin olun:
- **Client Secret:** `2Kk9655lvRibJVxXpqxxVYxNkrW1DO8y`
- **Issuer URI:** `http://127.0.0.1:8080/realms/meal-app-realm`

> **Not:** Eğer daha önce oluşturulan `berk` kullanıcısı JSON içine dahil edilmediyse, Users sekmesinden kendi kullanıcılarınızı oluşturup **ADMIN** rolünü atamanız gerekebilir.
