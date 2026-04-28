package com.mealapp.app.model.mapper.recipe;

import com.mealapp.app.model.dto.recipe.RecipeIngredientDTO;
import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.service.UnitConverterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class RecipeMapper {

    private final UnitConverterService unitConverterService;

    public RecipeResponse toResponse(Recipe recipe) {
        if (recipe == null) return null;

        return RecipeResponse.builder()
            .id(recipe.getId())
            .title(recipe.getTitle())
            .category("Genel")
            .calories(recipe.getTotalCalories())
            .protein(recipe.getTotalProtein())
            .carbs(recipe.getTotalCarbs())
            .fat(recipe.getTotalFat())
            .preparationTime(recipe.getPreparationTimeMinutes())
            .servings(recipe.getServings())
            .rating(recipe.getAverageRating())
            .imageUrl(recipe.getImageUrl())
            .instructions(recipe.getInstructions())
            .ingredients(mapIngredients(recipe))
            .build();
    }

    public List<RecipeResponse> toResponseList(List<Recipe> recipes) {
        if (recipes == null) return List.of();
        return recipes.stream()
            .map(this::toResponse)
            .toList();
    }

    private List<RecipeIngredientDTO> mapIngredients(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) {
            return List.of();
        }

        try {
            return recipe.getRecipeIngredients().stream()
                .filter(ri -> ri != null && ri.getIngredient() != null)
                .map(ri -> {
                    // Önemli: Service zaten grams'ı hesaplamış olmalı.
                    // Ama garantiye almak için 0 kontrolü yapıyoruz.
                    Double gramsValue = (ri.getGrams() != null) ? ri.getGrams() : 0.0;

                    var builder = RecipeIngredientDTO.builder()
                        .name(ri.getIngredient().getName())
                        .amount(ri.getAmount() != null ? ri.getAmount() : gramsValue)
                        .unit(ri.getUnit() != null ? ri.getUnit() : "g")
                        .grams(gramsValue)
                        .unitGramWeight(unitConverterService.getUnitGramWeight(ri.getUnit(), ri.getIngredient()));

                    if (ri.getIngredient().getNutrition() != null) {
                        var n = ri.getIngredient().getNutrition();
                        double factor = gramsValue / 100.0;
                        builder.calories(n.getCaloriesPer100g() * factor)
                            .protein(n.getProteinPer100g() * factor)
                            .carbs(n.getCarbsPer100g() * factor)
                            .fat(n.getFatPer100g() * factor);
                    }

                    return builder.build();
                })
                .collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }
}