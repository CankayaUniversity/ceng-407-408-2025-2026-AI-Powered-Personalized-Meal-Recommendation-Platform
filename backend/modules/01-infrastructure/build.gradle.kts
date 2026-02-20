plugins {
    id("java-test-fixtures")
}

sourceSets {
    named("main") {
        java.srcDirs("infrastructure-core/src/main/java")
    }
    named("testFixtures") {
        java.srcDirs("infrastructure-test/src/main/java")
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    
    // Test dependencies
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    // Align Testcontainers to the same BOM as working YAKAP project
    testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.3"))
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")

    // Test Fixtures dependencies (shared with other modules)
    "testFixturesImplementation"(project.dependencies.enforcedPlatform("org.springframework.boot:spring-boot-dependencies:3.4.1"))
    // Import Testcontainers BOM for fixtures as well
    "testFixturesImplementation"(platform("org.testcontainers:testcontainers-bom:2.0.3"))
    "testFixturesImplementation"("org.springframework.boot:spring-boot-starter-data-jpa")
    "testFixturesImplementation"("org.springframework.boot:spring-boot-starter-test")
    "testFixturesImplementation"("org.springframework.boot:spring-boot-starter-web")
    "testFixturesImplementation"("org.springframework.boot:spring-boot-testcontainers")
    "testFixturesImplementation"("org.testcontainers:testcontainers")
    "testFixturesImplementation"("org.testcontainers:testcontainers-junit-jupiter")
    "testFixturesImplementation"("org.testcontainers:testcontainers-postgresql")
    "testFixturesImplementation"("com.zaxxer:HikariCP")
    "testFixturesImplementation"("org.postgresql:postgresql")
}
