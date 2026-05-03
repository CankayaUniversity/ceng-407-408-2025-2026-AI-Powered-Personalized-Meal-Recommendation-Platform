package com.mealapp.infrastructure.test;

import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.ws.rs.core.Response;
import java.util.Collections;
import java.util.List;

/**
 * Uygulama her ayağa kalktığında bir superadmin kullanıcısının varlığını garanti eden servis.
 * Hem veritabanında hem de Keycloak üzerinde kullanıcının oluşmasını sağlar.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "com.mealapp.infrastructure.super-admin.enabled", havingValue = "true", matchIfMissing = true)
public class SuperAdminSeedService implements CommandLineRunner {

    private final UserRepository userRepository;

    @Value("${com.mealapp.infrastructure.super-admin.keycloak.server-url}")
    private String serverUrl;

    @Value("${com.mealapp.infrastructure.super-admin.keycloak.realm}")
    private String realm;

    @Value("${com.mealapp.infrastructure.super-admin.keycloak.admin-username}")
    private String adminUsername;

    @Value("${com.mealapp.infrastructure.super-admin.keycloak.admin-password}")
    private String adminPassword;

    @Value("${com.mealapp.infrastructure.super-admin.keycloak.client-id}")
    private String clientId;

    private static final String SUPER_ADMIN_ID = "superadmin-static-id";
    private static final String SUPER_ADMIN_EMAIL = "superadmin@mealapp.com";
    private static final String SUPER_ADMIN_USERNAME = "superadmin";
    private static final String SUPER_ADMIN_PASSWORD = "admin";

    @Override
    @Transactional
    public void run(String... args) {
        ensureUserInDatabase();
        try {
            ensureUserInKeycloak();
        } catch (Exception e) {
            log.warn("Keycloak üzerinde superadmin kullanıcısı oluşturulurken hata oluştu. " +
                    "Keycloak ayakta olmayabilir veya erişim bilgileri hatalı olabilir: {}", e.getMessage());
        }
    }

    private void ensureUserInDatabase() {
        if (userRepository.findById(SUPER_ADMIN_ID).isEmpty()) {
            log.info("SuperAdmin kullanıcısı veritabanında bulunamadı, oluşturuluyor...");

            User superAdmin = User.builder()
                    .id(SUPER_ADMIN_ID)
                    .name("Super Admin")
                    .email(SUPER_ADMIN_EMAIL)
                    .role(User.UserRole.ADMIN)
                    .active(true)
                    .build();

            userRepository.save(superAdmin);
            log.info("SuperAdmin kullanıcısı veritabanına başarıyla eklendi. ID: {}", SUPER_ADMIN_ID);
        } else {
            userRepository.findById(SUPER_ADMIN_ID).ifPresent(user -> {
                if (user.getRole() != User.UserRole.ADMIN) {
                    user.setRole(User.UserRole.ADMIN);
                    userRepository.save(user);
                    log.info("SuperAdmin kullanıcısının veritabanındaki rolü ADMIN olarak güncellendi.");
                }
            });
        }
    }

    private void ensureUserInKeycloak() {
        log.info("Keycloak üzerinde superadmin kullanıcısı kontrol ediliyor... URL: {}", serverUrl);

        try (Keycloak keycloak = KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm("master")
                .username(adminUsername)
                .password(adminPassword)
                .clientId(clientId)
                .build()) {

            UsersResource usersResource = keycloak.realm(realm).users();
            List<UserRepresentation> users = usersResource.search(SUPER_ADMIN_USERNAME, true);

            if (users.isEmpty()) {
                log.info("Keycloak üzerinde {} kullanıcısı bulunamadı, oluşturuluyor...", SUPER_ADMIN_USERNAME);

                UserRepresentation user = new UserRepresentation();
                user.setId(SUPER_ADMIN_ID);
                user.setUsername(SUPER_ADMIN_USERNAME);
                user.setEmail(SUPER_ADMIN_EMAIL);
                user.setFirstName("Super");
                user.setLastName("Admin");
                user.setEnabled(true);
                user.setEmailVerified(true);

                CredentialRepresentation credential = new CredentialRepresentation();
                credential.setType(CredentialRepresentation.PASSWORD);
                credential.setValue(SUPER_ADMIN_PASSWORD);
                credential.setTemporary(false);
                user.setCredentials(Collections.singletonList(credential));

                try (Response response = usersResource.create(user)) {
                    if (response.getStatus() == 201) {
                        log.info("Keycloak üzerinde {} kullanıcısı başarıyla oluşturuldu.", SUPER_ADMIN_USERNAME);
                    } else {
                        log.error("Keycloak kullanıcısı oluşturulamadı. Status: {}, Error: {}", 
                                response.getStatus(), response.readEntity(String.class));
                    }
                }
            } else {
                log.info("Keycloak üzerinde {} kullanıcısı zaten mevcut.", SUPER_ADMIN_USERNAME);
            }
        }
    }
}
