plugins {
    `java-library`
}

dependencies {
    implementation(project(":infrastructure-core"))

    // Spring Boot & Test
    implementation("org.springframework.boot:spring-boot-starter-test")
    implementation("org.springframework.security:spring-security-test")
    implementation("org.springframework.security:spring-security-oauth2-jose")

    // Testcontainers - Versiyonları çalışan projeye göre sabitleyelim (Örn: 1.20.4)
    implementation("org.testcontainers:postgresql:1.20.4")
    implementation("org.testcontainers:junit-jupiter:1.20.4")
    implementation("org.springframework.boot:spring-boot-testcontainers")

    // KRİTİK: macOS Status 400 hatasını çözen taşıma katmanı
    implementation("com.github.docker-java:docker-java-transport-zerodep:3.4.0")

    // DB Sürücüleri
    implementation("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("com.zaxxer:HikariCP")

    // JSON & Web (MockMvc için gerekli)
    implementation("com.fasterxml.jackson.core:jackson-databind")
    implementation("org.springframework.boot:spring-boot-starter-web")
}