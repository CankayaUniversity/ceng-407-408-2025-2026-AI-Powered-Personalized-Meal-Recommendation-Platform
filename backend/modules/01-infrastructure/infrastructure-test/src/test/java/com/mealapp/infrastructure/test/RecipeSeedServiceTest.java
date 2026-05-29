package com.mealapp.infrastructure.test;

import com.mealapp.domain.inventory.repository.InventoryGroupRepository;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RecipeSeedServiceTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RecipeSeedService.class))
            .withBean(UserRepository.class, () -> mock(UserRepository.class))
            .withBean(RecipeRepository.class, () -> mock(RecipeRepository.class))
            .withBean(IngredientRepository.class, () -> mock(IngredientRepository.class))
            .withBean(InventoryRepository.class, () -> mock(InventoryRepository.class))
            .withBean(InventoryGroupRepository.class, () -> mock(InventoryGroupRepository.class));

    @Test
    void shouldBeLoadedWhenSeedPropertyEnabled() {
        contextRunner
                .withPropertyValues("app.seed.enabled=true")
                .run(context -> assertThat(context).hasSingleBean(RecipeSeedService.class));
    }

    @Test
    void shouldNotBeLoadedWhenSeedPropertyDisabled() {
        contextRunner
                .withPropertyValues("app.seed.enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(RecipeSeedService.class));
    }

    @Test
    void shouldNotBeLoadedWhenSeedPropertyMissing() {
        contextRunner
                .run(context -> assertThat(context).doesNotHaveBean(RecipeSeedService.class));
    }

    @Test
    void runShouldSkipSeedingWhenUsersAlreadyExist() {
        UserRepository userRepository = mock(UserRepository.class);
        RecipeRepository recipeRepository = mock(RecipeRepository.class);
        IngredientRepository ingredientRepository = mock(IngredientRepository.class);
        InventoryRepository inventoryRepository = mock(InventoryRepository.class);
        InventoryGroupRepository inventoryGroupRepository = mock(InventoryGroupRepository.class);
        RecipeSeedService seedService = new RecipeSeedService(
                userRepository,
                recipeRepository,
                ingredientRepository,
                inventoryRepository,
                inventoryGroupRepository
        );
        when(userRepository.count()).thenReturn(1L);

        seedService.run();

        verify(userRepository).count();
        verifyNoInteractions(recipeRepository, ingredientRepository, inventoryRepository, inventoryGroupRepository);
    }
}
