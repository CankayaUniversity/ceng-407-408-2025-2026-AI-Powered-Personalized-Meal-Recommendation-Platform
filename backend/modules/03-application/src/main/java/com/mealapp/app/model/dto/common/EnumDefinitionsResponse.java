package com.mealapp.app.model.dto.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnumDefinitionsResponse {
    private List<EnumDefinition> dietTypes;
    private List<EnumDefinition> dietaryGoals;
    private List<EnumDefinition> genders;
    private List<EnumDefinition> activityLevels;
    private List<EnumDefinition> difficulties;
    private List<EnumDefinition> ingredientCategories;
    private List<EnumDefinition> physicalStates;
    private List<EnumDefinition> mealTypes;
    private List<EnumDefinition> portionSizes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnumDefinition {
        private String value;
        private String label;
    }
}
