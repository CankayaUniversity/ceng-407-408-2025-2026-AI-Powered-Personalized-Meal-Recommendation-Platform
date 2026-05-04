package com.mealapp.app.model.mapper.recipe;

import com.mealapp.app.model.dto.recipe.IngredientDTO;
import com.mealapp.domain.recipe.entity.Ingredient;
import org.springframework.stereotype.Component;

/**
 * Ingredient entity ve IngredientDTO arasındaki dönüşümleri yapar.
 */
@Component
public class IngredientMapper {

    public IngredientDTO toDTO(Ingredient ingredient) {
        if (ingredient == null) return null;
        
        var builder = IngredientDTO.builder()
                .id(ingredient.getId())
                .name(ingredient.getName())
                .category(ingredient.getCategory() != null ? ingredient.getCategory().name() : null)
                .physicalState(ingredient.getPhysicalState() != null ? ingredient.getPhysicalState().name() : null)
                .preferredUnit(ingredient.getPreferredUnit())
                .density(ingredient.getDensity());

        if (ingredient.getNutrition() != null) {
            var n = ingredient.getNutrition();
            builder.caloriesPer100g(n.getCaloriesPer100g())
                   .proteinPer100g(n.getProteinPer100g())
                   .carbsPer100g(n.getCarbsPer100g())
                   .fatPer100g(n.getFatPer100g());
        }
        
        return builder.build();
    }

    public Ingredient toEntity(IngredientDTO dto) {
        if (dto == null) return null;
        
        return Ingredient.builder()
                .id(dto.getId())
                .name(dto.getName())
                .preferredUnit(dto.getPreferredUnit())
                .category(dto.getCategory() != null ? Ingredient.Category.valueOf(dto.getCategory()) : null)
                .physicalState(dto.getPhysicalState() != null ? Ingredient.PhysicalState.valueOf(dto.getPhysicalState()) : null)
                .density(dto.getDensity() != null ? dto.getDensity() : 1.0)
                .build();
    }
}
