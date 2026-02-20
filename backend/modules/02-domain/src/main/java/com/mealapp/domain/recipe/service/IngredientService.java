package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import java.util.List;

public interface IngredientService {
    Ingredient save(Ingredient ingredient);
    List<Ingredient> findByRecipeId(Long recipeId);
    void deleteById(Long id);
}
