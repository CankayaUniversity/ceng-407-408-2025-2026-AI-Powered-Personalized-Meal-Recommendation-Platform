# Projeyi derlemek için kullanılan aşama (Build Stage)
FROM azul/zulu-openjdk:21-latest AS build
WORKDIR /app

# Gradle wrapper ve gerekli dosyaları kopyala
COPY gradlew .
COPY gradle gradle
COPY buildSrc buildSrc
COPY build.gradle .
COPY settings.gradle .
COPY gradle.properties .

# gradle.properties dosyasını kopyalayıp yerel Java pathini temizliyoruz (Docker içindeki Java kullanılacak)
RUN sed -i '/org.gradle.java.home/d' gradle.properties
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Gradle dağıtımını ve bağımlılıkları önceden indirmek için dummy bir adım
# Bu sayede sadece build.gradle dosyaları değiştiğinde bu katman yeniden çalışır
# COPY komutunu modül yapılarına göre parçalıyoruz
COPY modules/01-infrastructure/infrastructure-core/build.gradle modules/01-infrastructure/infrastructure-core/
COPY modules/01-infrastructure/infrastructure-test/build.gradle modules/01-infrastructure/infrastructure-test/
COPY modules/02-domain/build.gradle modules/02-domain/
COPY modules/03-application/build.gradle modules/03-application/

# Sadece bağımlılıkları indir (kaynak kodlar henüz kopyalanmadı)
RUN ./gradlew :modules:03-application:dependencies --no-daemon || true

# Tüm modülleri (kaynak kodları) kopyala
COPY modules modules

# Projeyi derle ve JAR dosyasını oluştur (testleri atlıyoruz build süresini kısaltmak için)
RUN ./gradlew :modules:03-application:bootJar -x test --no-daemon

# Uygulamayı çalıştırmak için hafifletilmiş aşama (Run Stage)
FROM azul/zulu-openjdk:21-jre-latest
WORKDIR /app

# Sadece oluşan JAR dosyasını kopyala
COPY --from=build /app/modules/03-application/build/libs/*.jar app.jar

# Uygulama portunu belirt
EXPOSE 8081

# Uygulamayı başlat
ENTRYPOINT ["java", "-jar", "app.jar"]
