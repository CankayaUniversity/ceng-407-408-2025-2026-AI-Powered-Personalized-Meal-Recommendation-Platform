package com.mealapp.domain.recipe.service;

import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import com.mealapp.domain.recipe.repository.RecipeFavoriteRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeFavoriteServiceImplTest {

    @Mock
    private RecipeFavoriteRepository favoriteRepository;

    @Mock
    private RecipeRepository recipeRepository;

    @InjectMocks
    private RecipeFavoriteServiceImpl favoriteService;

    @Test
    void toggleFavorite_rejectsOtherUsersPrivateRevision() {
        Recipe otherUsersRevision = Recipe.builder()
            .id(25L)
            .parentId(10L)
            .createdBy("user2")
            .status(RecipeStatus.DRAFT)
            .build();
        otherUsersRevision.setActive(true);

        when(recipeRepository.findById(25L)).thenReturn(Optional.of(otherUsersRevision));

        assertThrows(ResourceNotFoundException.class,
            () -> favoriteService.toggleFavorite("user1", 25L));
        verify(favoriteRepository, never()).existsByUserIdAndRecipeFamily("user1", 10L);
    }

    @Test
    void toggleFavorite_fromOwnedRevisionStoresFavoriteOnRootRecipe() {
        Recipe root = Recipe.builder()
            .id(10L)
            .status(RecipeStatus.APPROVED)
            .build();
        root.setActive(true);
        Recipe revision = Recipe.builder()
            .id(25L)
            .parentId(10L)
            .createdBy("user1")
            .status(RecipeStatus.DRAFT)
            .build();
        revision.setActive(true);

        when(recipeRepository.findById(25L)).thenReturn(Optional.of(revision));
        when(favoriteRepository.existsByUserIdAndRecipeFamily("user1", 10L)).thenReturn(false);
        when(recipeRepository.findById(10L)).thenReturn(Optional.of(root));

        boolean result = favoriteService.toggleFavorite("user1", 25L);

        assertTrue(result);
        verify(favoriteRepository).save(argThat(favorite ->
            favorite.getUserId().equals("user1") && favorite.getRecipe().getId().equals(10L)
        ));
    }
}
