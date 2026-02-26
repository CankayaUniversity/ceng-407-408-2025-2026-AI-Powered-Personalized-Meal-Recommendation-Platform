package com.mealapp.infrastructure.test;

import com.mealapp.TestApplication;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
    classes = TestApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.MOCK
)
@Import({TestDataSourceConfig.class, MinioInitConfig.class}) // MinIO init konfigürasyonu
@ActiveProfiles({"local", "junit"})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Testcontainers
public abstract class AbstractSpringTest extends Assertions {

    private static final String MINIO_IMAGE = "minio/minio:latest";

    // MinIO container singleton
    static MinIOContainer minio = new MinIOContainer(MINIO_IMAGE)
        .withUserName("admin")
        .withPassword("MealApp123!");

    static {
        minio.start();
    }

    @DynamicPropertySource
    static void registerContainerProperties(DynamicPropertyRegistry registry) {

        // MinIO
        registry.add("com.mealapp.infrastructure.storage.minio.endpoint", minio::getS3URL);
        registry.add("com.mealapp.infrastructure.storage.minio.access-key", minio::getUserName);
        registry.add("com.mealapp.infrastructure.storage.minio.secret-key", minio::getPassword);
        registry.add("com.mealapp.infrastructure.storage.bucket.name", () -> "meal-app-test-bucket");
        // Keycloak (JWT / OAuth2)
        String authServerUrl = KeycloakSingleton.INSTANCE.getAuthServerUrl();
        String issuerUri = authServerUrl + "/realms/mealapp"; // realm adı MealApp projen için
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> issuerUri);
        registry.add("spring.security.oauth2.client.registration.external-services.client-secret", KeycloakSingleton::getClientSecret);
        registry.add("spring.security.oauth2.client.provider.keycloak.issuer-uri", () -> issuerUri);

        // Postgres container bağlantısı (PostgresSingleton kullanıyorsan gerek yok)
        registry.add("spring.datasource.url", () -> PostgresSingleton.INSTANCE.getJdbcUrl());
        registry.add("spring.datasource.username", () -> PostgresSingleton.INSTANCE.getUsername());
        registry.add("spring.datasource.password", () -> PostgresSingleton.INSTANCE.getPassword());
    }
}