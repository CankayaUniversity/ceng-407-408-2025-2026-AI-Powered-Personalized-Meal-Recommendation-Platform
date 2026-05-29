package com.mealapp.domain.consumption.repository;

import com.mealapp.domain.consumption.entity.DailyConsumption;
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

import java.time.LocalDateTime;
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
class DailyConsumptionRepositoryTest {

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
    private DailyConsumptionRepository dailyConsumptionRepository;

    private User user;
    private User otherUser;
    private DailyConsumption breakfast;
    private DailyConsumption lunch;

    @BeforeEach
    void setUp() {
        user = em.persistAndFlush(user("user-1", "User One"));
        otherUser = em.persistAndFlush(user("user-2", "User Two"));

        breakfast = persist(consumption(user, "Breakfast", LocalDateTime.of(2026, 5, 26, 8, 0)));
        lunch = persist(consumption(user, "Lunch", LocalDateTime.of(2026, 5, 26, 13, 0)));
        persist(consumption(user, "Yesterday snack", LocalDateTime.of(2026, 5, 25, 22, 0)));
        persist(consumption(otherUser, "Other user dinner", LocalDateTime.of(2026, 5, 26, 19, 0)));

        em.flush();
        em.clear();
    }

    @Test
    void findByUserIdAndConsumedAtBetweenShouldReturnUserEntriesInsideRange() {
        List<DailyConsumption> result = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(
                user.getId(),
                LocalDateTime.of(2026, 5, 26, 0, 0),
                LocalDateTime.of(2026, 5, 26, 23, 59)
        );

        assertThat(result)
                .extracting(DailyConsumption::getFoodName)
                .containsExactlyInAnyOrder("Breakfast", "Lunch");
    }

    @Test
    void findByUserIdAndConsumedAtBetweenShouldIncludeBoundaryTimes() {
        LocalDateTime start = breakfast.getConsumedAt();
        LocalDateTime end = lunch.getConsumedAt();

        List<DailyConsumption> result = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(
                user.getId(),
                start,
                end
        );

        assertThat(result)
                .extracting(DailyConsumption::getId)
                .containsExactlyInAnyOrder(breakfast.getId(), lunch.getId());
    }

    @Test
    void findByUserIdAndConsumedAtBetweenShouldReturnEmptyWhenNothingMatches() {
        List<DailyConsumption> result = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(
                user.getId(),
                LocalDateTime.of(2026, 5, 27, 0, 0),
                LocalDateTime.of(2026, 5, 27, 23, 59)
        );

        assertThat(result).isEmpty();
    }

    private DailyConsumption persist(DailyConsumption consumption) {
        return em.persistAndFlush(consumption);
    }

    private static User user(String id, String name) {
        return User.builder()
                .id(id)
                .name(name)
                .email(id + "@example.com")
                .active(true)
                .build();
    }

    private static DailyConsumption consumption(User user, String foodName, LocalDateTime consumedAt) {
        return DailyConsumption.builder()
                .user(user)
                .foodName(foodName)
                .mealType(DailyConsumption.MealType.LUNCH)
                .portionSize(DailyConsumption.PortionSize.MEDIUM)
                .consumedAt(consumedAt)
                .isCustomEntry(true)
                .build();
    }

}
