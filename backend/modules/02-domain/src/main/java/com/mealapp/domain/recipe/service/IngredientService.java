package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;


public interface IngredientService {
    Ingredient save(Ingredient ingredient);
    void deleteById(Long id);
}
