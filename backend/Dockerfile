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

# Tüm modülleri kopyala
COPY modules modules

# Projeyi derle ve JAR dosyasını oluştur (testleri atlıyoruz build süresini kısaltmak için)
RUN ./gradlew :modules:03-application:bootJar -x test

# Uygulamayı çalıştırmak için hafifletilmiş aşama (Run Stage)
FROM azul/zulu-openjdk:21-jre-latest
WORKDIR /app

# Sadece oluşan JAR dosyasını kopyala
COPY --from=build /app/modules/03-application/build/libs/*.jar app.jar

# Uygulama portunu belirt
EXPOSE 8081

# Uygulamayı başlat
ENTRYPOINT ["java", "-jar", "app.jar"]
