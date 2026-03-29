package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;

import java.util.List;

public interface IngredientService {
    Ingredient save(Ingredient ingredient);
    void deleteById(Long id);
    List<Ingredient> searchByName(String query, int limit);
}
