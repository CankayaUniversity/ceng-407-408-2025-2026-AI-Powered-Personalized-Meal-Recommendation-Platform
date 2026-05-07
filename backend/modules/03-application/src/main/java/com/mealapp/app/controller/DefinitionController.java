package com.mealapp.app.controller;

import com.mealapp.app.model.dto.common.EnumDefinitionsResponse;
import com.mealapp.app.util.MessageUtil;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.consumption.entity.DailyConsumption;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/definitions")
@RequiredArgsConstructor
public class DefinitionController {

    private final MessageUtil messageUtil;

    @GetMapping("/enums")
    public EnumDefinitionsResponse getEnumDefinitions() {
        return EnumDefinitionsResponse.builder()
                .dietTypes(toDefinitionList(User.DietType.values(), "dietType"))
                .dietaryGoals(toDefinitionList(User.DietaryGoal.values(), "dietaryGoal"))
                .genders(toDefinitionList(User.Gender.values(), "gender"))
                .activityLevels(toDefinitionList(User.ActivityLevel.values(), "activityLevel"))
                .difficulties(toDefinitionList(Recipe.Difficulty.values(), "difficulty"))
                .ingredientCategories(toDefinitionList(Ingredient.Category.values(), "ingredientCategory"))
                .physicalStates(toDefinitionList(Ingredient.PhysicalState.values(), "physicalState"))
                .mealTypes(toDefinitionList(DailyConsumption.MealType.values(), "mealType"))
                .portionSizes(toDefinitionList(DailyConsumption.PortionSize.values(), "portionSize"))
                .build();
    }

    private <E extends Enum<E>> List<EnumDefinitionsResponse.EnumDefinition> toDefinitionList(E[] values, String prefix) {
        return Arrays.stream(values)
                .map(e -> EnumDefinitionsResponse.EnumDefinition.builder()
                        .value(e.name())
                        .label(messageUtil.getMessage(prefix + "." + e.name()))
                        .build())
                .toList();
    }
}
