plugins {
    `java-library`
}

dependencies {
    implementation(project(":infrastructure-core"))

    // --- PROTOKOL VE GÜVENLİK DÜZELTMELERİ ---
    constraints {
        // Docker v29+ üzerindeki Status 400 (Bad Request) hatasını çözen ana düzeltme
        implementation("org.apache.commons:commons-compress:1.26.1") {
            because("Docker v29+ ile iletişim protokolü uyumluluğu sağlar.")
        }
        // Güvenlik açığı düzeltmesi
        implementation("org.apache.commons:commons-lang3:3.17.0")
    }

    // --- SPRING BOOT & TEST ---
    implementation("org.springframework.boot:spring-boot-starter-test")
    implementation("org.springframework.security:spring-security-test")
    implementation("org.springframework.security:spring-security-oauth2-jose")
    implementation("org.springframework.boot:spring-boot-starter-web")

    // --- TESTCONTAINERS ---
    // Diğer projende çalışan sürüm neyse onu kullanmak en iyisidir (Genelde 1.20.4 stabildir)
    implementation("org.testcontainers:postgresql:1.20.4")
    implementation("org.testcontainers:junit-jupiter:1.20.4")
    implementation("org.springframework.boot:spring-boot-testcontainers")

    // --- macOS TRANSPORT ---
    // Docker socket ile konuşmayı sağlayan kütüphane
    implementation("com.github.docker-java:docker-java-transport-zerodep:3.4.0")

    // --- DATABASE ---
    implementation("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("com.zaxxer:HikariCP")
    implementation("com.fasterxml.jackson.core:jackson-databind")
}

tasks.test {
    useJUnitPlatform()

    // BU KISIM ÇOK ÖNEMLİ:
    // Diğer projende muhtemelen sistem genelinde tanımlı bir DOCKER_HOST var.
    // Eğer Testcontainers otomatik bulamıyorsa, Gradle üzerinden bu yolu gösterelim.
    // Bu, kodun içine statik olarak yol yazmaktan çok daha temizdir.

    val dockerSocket = "unix:///Users/berkmemis/.docker/run/docker.sock"

    environment("DOCKER_HOST", dockerSocket)
    systemProperty("DOCKER_HOST", dockerSocket)

    // Testlerin paralel çalışıp Docker'ı yormasını engeller
    maxParallelForks = 1
}