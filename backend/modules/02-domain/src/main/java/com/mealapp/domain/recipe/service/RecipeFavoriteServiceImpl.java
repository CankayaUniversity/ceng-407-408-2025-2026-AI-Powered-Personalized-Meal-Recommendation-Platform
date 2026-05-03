package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeFavorite;
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
        if (favoriteRepository.existsByUserIdAndRecipeId(userId, recipeId)) {
            favoriteRepository.deleteByUserIdAndRecipeId(userId, recipeId);
            return false;
        } else {
            Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + recipeId));
            
            RecipeFavorite favorite = RecipeFavorite.builder()
                .userId(userId)
                .recipe(recipe)
                .build();
            
            favoriteRepository.save(favorite);
            return true;
        }
    }
}
