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
        
        return IngredientDTO.builder()
                .id(ingredient.getId())
                .name(ingredient.getName())
                .amount(ingredient.getAmount())
                .unit(ingredient.getUnit())
                .build();
    }

    public Ingredient toEntity(IngredientDTO dto) {
        if (dto == null) return null;
        
        return Ingredient.builder()
                .id(dto.getId())
                .name(dto.getName())
                .amount(dto.getAmount())
                .unit(dto.getUnit())
                .build();
    }
}
