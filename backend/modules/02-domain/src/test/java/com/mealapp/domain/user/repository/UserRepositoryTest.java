package com.mealapp.domain.user.repository;

import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create",
        "spring.flyway.enabled=false"
})
@Testcontainers
@Tag("integration")
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestEntityManager em;

    @Autowired
    private UserRepository userRepository;

    private User activeUser;
    private User inactiveUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAllInBatch();

        activeUser = persist(user("user-1", "Alice Cook", "alice@example.com", User.UserRole.USER, true));
        inactiveUser = persist(user("user-2", "Inactive User", "inactive@example.com", User.UserRole.USER, false));
        adminUser = persist(user("admin-1", "Admin Chef", "admin@example.com", User.UserRole.ADMIN, true));

        em.flush();
        em.clear();
    }

    @Test
    void findByEmailAndActiveTrueShouldReturnOnlyActiveUser() {
        assertThat(userRepository.findByEmailAndActiveTrue("alice@example.com"))
                .isPresent()
                .get()
                .extracting(User::getId)
                .isEqualTo(activeUser.getId());

        assertThat(userRepository.findByEmailAndActiveTrue("inactive@example.com")).isEmpty();
    }

    @Test
    void findByIdAndActiveTrueShouldReturnOnlyActiveUser() {
        assertThat(userRepository.findByIdAndActiveTrue(activeUser.getId())).isPresent();
        assertThat(userRepository.findByIdAndActiveTrue(inactiveUser.getId())).isEmpty();
    }

    @Test
    void searchByQueryShouldMatchActiveUsersByNameOrEmail() {
        List<User> byName = userRepository.searchByQuery("alice");
        List<User> byEmail = userRepository.searchByQuery("admin@example");
        List<User> inactive = userRepository.searchByQuery("inactive");

        assertThat(byName).extracting(User::getId).containsExactly(activeUser.getId());
        assertThat(byEmail).extracting(User::getId).containsExactly(adminUser.getId());
        assertThat(inactive).isEmpty();
    }

    @Test
    void findAllActiveShouldExcludeInactiveUsers() {
        assertThat(userRepository.findAllActive())
                .extracting(User::getId)
                .containsExactlyInAnyOrder(activeUser.getId(), adminUser.getId())
                .doesNotContain(inactiveUser.getId());
    }

    @Test
    void findAllAdminsShouldReturnOnlyActiveAdmins() {
        assertThat(userRepository.findAllAdmins())
                .extracting(User::getId)
                .containsExactly(adminUser.getId());
    }

    @Test
    void softDeleteShouldMarkUserInactive() {
        userRepository.softDelete(activeUser.getId());
        em.flush();
        em.clear();

        assertThat(userRepository.findById(activeUser.getId()))
                .isPresent()
                .get()
                .extracting(User::isActive)
                .isEqualTo(false);
        assertThat(userRepository.findByIdAndActiveTrue(activeUser.getId())).isEmpty();
    }

    @Test
    void relinkUserIdShouldUpdatePrimaryKey() {
        int updatedRows = userRepository.relinkUserId(activeUser.getId(), "user-1-new");
        em.flush();
        em.clear();

        assertThat(updatedRows).isEqualTo(1);
        assertThat(userRepository.findById(activeUser.getId())).isEmpty();
        assertThat(userRepository.findById("user-1-new")).isPresent();
    }

    private User persist(User user) {
        return em.persistAndFlush(user);
    }

    private static User user(String id, String name, String email, User.UserRole role, boolean active) {
        return User.builder()
                .id(id)
                .name(name)
                .email(email)
                .role(role)
                .active(active)
                .build();
    }

}
