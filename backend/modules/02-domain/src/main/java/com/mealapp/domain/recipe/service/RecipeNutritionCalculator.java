package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Recipe;

public final class RecipeNutritionCalculator {

    public static final double NEUTRAL_SCORE = 0.5;
    public static final double CALORIE_PROXIMITY_THRESHOLD = 250.0;

    private RecipeNutritionCalculator() {
    }

    public static int safeServings(Recipe recipe) {
        Integer servings = recipe != null ? recipe.getServings() : null;
        return servings != null && servings > 0 ? servings : 1;
    }

    public static Double kcalPerServing(Recipe recipe) {
        if (recipe == null || recipe.getTotalCalories() == null) {
            return null;
        }
        return recipe.getTotalCalories() / safeServings(recipe);
    }

    public static Double percentageOfTarget(Double kcalPerServing, Double targetKcalPerMeal) {
        if (kcalPerServing == null || targetKcalPerMeal == null || targetKcalPerMeal <= 0) {
            return null;
        }
        return (kcalPerServing / targetKcalPerMeal) * 100.0;
    }

    public static double calorieProximityScore(Double kcalPerServing, Double targetKcalPerMeal) {
        if (kcalPerServing == null) {
            return NEUTRAL_SCORE;
        }
        if (targetKcalPerMeal == null || targetKcalPerMeal <= 0) {
            return 1.0;
        }

        double deviation = Math.abs(kcalPerServing - targetKcalPerMeal);
        return Math.max(0.0, 1.0 - (deviation / CALORIE_PROXIMITY_THRESHOLD));
    }
}
