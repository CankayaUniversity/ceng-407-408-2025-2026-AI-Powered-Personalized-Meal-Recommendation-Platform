package com.mealapp.domain.recipe.service;

import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeFavorite;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import com.mealapp.domain.recipe.repository.RecipeFavoriteRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecipeFavoriteServiceImpl implements RecipeFavoriteService {

    private final RecipeFavoriteRepository favoriteRepository;
    private final RecipeRepository recipeRepository;

    @Override
    @Transactional
    public boolean toggleFavorite(String userId, Long recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
            .orElseThrow(() -> new ResourceNotFoundException("Recipe not found: " + recipeId));
        if (!canFavorite(recipe, userId)) {
            throw new ResourceNotFoundException("Recipe not found: " + recipeId);
        }
        Long rootId = recipe.getParentId() != null ? recipe.getParentId() : recipe.getId();

        if (favoriteRepository.existsByUserIdAndRecipeFamily(userId, rootId)) {
            favoriteRepository.deleteByUserIdAndRecipeFamily(userId, rootId);
            return false;
        } else {
            Recipe rootRecipe = recipe.getParentId() == null
                ? recipe
                : recipeRepository.findById(rootId)
                    .orElseThrow(() -> new ResourceNotFoundException("Recipe not found: " + rootId));
            
            RecipeFavorite favorite = RecipeFavorite.builder()
                .userId(userId)
                .recipe(rootRecipe)
                .build();
            
            favoriteRepository.save(favorite);
            return true;
        }
    }

    private boolean canFavorite(Recipe recipe, String userId) {
        if (recipe == null || !recipe.isActive()) {
            return false;
        }
        boolean isOwner = userId != null && userId.equals(recipe.getCreatedBy());
        if (recipe.getParentId() == null) {
            return recipe.getStatus() == RecipeStatus.APPROVED || isOwner;
        }
        return isOwner && recipe.getStatus() != RecipeStatus.SUPERSEDED;
    }
}
