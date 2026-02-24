plugins {
    `java-library`
}
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    // Docker iletişimi ve JSON serileştirme için çalışan projeden gelen kritik bağımlılıklar
    implementation("org.apache.httpcomponents.client5:httpclient5")
    implementation("org.springframework.security:spring-security-oauth2-jose")
}
