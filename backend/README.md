# 🥗 AI-Powered Personalized Meal Recommendation Platform

Bu proje, kullanıcıların tercihlerine ve elindeki malzemelere göre yapay zeka destekli kişiselleştirilmiş yemek önerileri sunan bir platformdur.

## 🛠️ Teknolojiler

- **Java 21 (Azul Zulu)**
- **Spring Boot 3.x**
- **PostgreSQL** (Veritabanı)
- **Keycloak** (Kimlik Doğrulama ve Yetkilendirme)
- **MinIO** (Nesne Depolama)
- **Docker & Docker Compose**

## 🚀 Hızlı Başlangıç (Docker ile)

Projeyi tüm bağımlılıkları ile birlikte ayağa kaldırmak için bilgisayarınızda sadece **Docker** yüklü olması yeterlidir.

1.  Projeyi klonlayın.
2.  Terminalde projenin kök dizinine gidin.
3.  Aşağıdaki komutu çalıştırın:

```bash
docker-compose up --build -d
```

Bu komut şunları yapar:
- PostgreSQL veritabanını başlatır (`54320` portu).
- MinIO nesne depolama sunucusunu başlatır (`9000` API, `9001` Console portu).
- Keycloak kimlik doğrulama sunucusunu başlatır (`8080` portu).
- Spring Boot backend uygulamasını derler ve başlatır (`8081` portu).

## 💻 Yerel Geliştirme Ortamı Kurulumu

Eğer uygulamayı IDE (IntelliJ IDEA vb.) üzerinden çalıştırmak isterseniz:

1.  **Java Sürümü:** Azul Zulu JDK 21 kullanılması önerilir. (`.sdkmanrc` dosyasında belirtilmiştir).
2.  **Bağımlı Servisler:** Sadece veritabanı ve diğer servisleri Docker ile başlatmak için:
    ```bash
    docker-compose up -d postgres-db minio-server keycloak-auth
    ```
3.  **Yapılandırma:** `modules/03-application/src/main/resources/application.yml` dosyasındaki ayarların yerel ortamınıza uygun olduğundan emin olun. (Varsayılan olarak Docker port yönlendirmelerine göre ayarlanmıştır).

## 🏗️ Proje Yapısı

Proje çok modüllü (multi-module) bir Gradle yapısına sahiptir:

- **01-infrastructure:** Teknik altyapı (DB, Storage, Test araçları).
- **02-domain:** İş mantığı, entity'ler ve servis arayüzleri.
- **03-application:** REST API, DTO'lar ve orkestrasyon katmanı.
- **04-utilities:** Ortak yardımcı sınıflar.

## 🔐 Kimlik Doğrulama (Keycloak)

Uygulama güvenliği için Keycloak kullanılmaktadır. 
- **URL:** http://localhost:8080
- **Admin Paneli:** admin / admin
- **Realm:** `meal-app-realm`

Detaylı kurulum ve realm import işlemleri için `modules/03-application/README.md` dosyasını inceleyebilirsiniz.

## 📦 Paketleme ve Dağıtım

Uygulamayı bir JAR dosyası olarak paketlemek için:

```bash
./gradlew :modules:03-application:bootJar
```

Oluşan JAR dosyası: `modules/03-application/build/libs/03-application.jar`
