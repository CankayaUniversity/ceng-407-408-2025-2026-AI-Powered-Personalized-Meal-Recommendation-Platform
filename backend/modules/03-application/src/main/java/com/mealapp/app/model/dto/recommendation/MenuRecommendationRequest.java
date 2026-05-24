package com.mealapp.app.model.dto.recommendation;

import com.mealapp.domain.recipe.entity.RecipeCategory;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class MenuRecommendationRequest {
    @NotEmpty(message = "At least one menu category must be selected.")
    private List<RecipeCategory> selectedCategories;
    private Long inventoryGroupId;
    private String cravings;
    private String aiModel;
    private String apiKey;
}
