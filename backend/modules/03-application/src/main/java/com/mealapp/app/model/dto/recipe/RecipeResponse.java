package com.mealapp.app.model.dto.recipe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeResponse {
    private Long id;
    private String title;
    private String category;
    private Double calories;
    private Integer preparationTime;
    private Double rating;
    private String imageUrl;
}
