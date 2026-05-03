package com.mealapp.infrastructure.test;

import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SuperAdminSeedServiceTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(SuperAdminSeedService.class))
            .withBean(UserRepository.class, () -> mock(UserRepository.class));

    @Test
    void shouldBeLoadedWhenPropertyEnabled() {
        contextRunner
                .withPropertyValues("com.mealapp.infrastructure.super-admin.enabled=true")
                .run(context -> assertThat(context).hasSingleBean(SuperAdminSeedService.class));
    }

    @Test
    void shouldNotBeLoadedWhenPropertyDisabled() {
        contextRunner
                .withPropertyValues("com.mealapp.infrastructure.super-admin.enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(SuperAdminSeedService.class));
    }

    @Test
    void shouldBeLoadedWhenPropertyMissing() {
        contextRunner
                .run(context -> assertThat(context).hasSingleBean(SuperAdminSeedService.class));
    }
}
