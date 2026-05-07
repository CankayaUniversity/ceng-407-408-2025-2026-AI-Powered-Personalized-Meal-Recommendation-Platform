package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;

import java.util.List;
import java.util.Optional;

public interface IngredientService {
    Ingredient save(Ingredient ingredient);
    void deleteById(Long id);
    List<Ingredient> searchByName(String query, int limit);
    Optional<Ingredient> findById(Long id);
    Optional<Ingredient> findByIdWithUnits(Long id);

    Ingredient updateIngredient(Long id, String name, String category, Double density, String physicalState, String preferredUnit, Double calories, Double protein, Double carbs, Double fat);

    Ingredient createIngredient(String name, String category, Double density, String physicalState, String preferredUnit, Double calories, Double protein, Double carbs, Double fat);
}
