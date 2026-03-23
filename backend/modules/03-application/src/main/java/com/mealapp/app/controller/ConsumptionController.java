package com.mealapp.app.controller;

import com.mealapp.app.model.dto.consumption.ConsumptionRequest;
import com.mealapp.app.model.dto.consumption.ConsumptionResponse;
import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Günlük tüketim (yemek) kayıtlarını yöneten uç noktalar.
 * Not: Dışarıda yenen öğünlerde estimatedCalories alanı AI tarafından daha sonra doldurulacaktır.
 */
@RestController
@RequestMapping("/api/v1/consumptions")
@RequiredArgsConstructor
public class ConsumptionController {

    private final DailyConsumptionService dailyConsumptionService;
    private final UserService userService;
    private final RecipeService recipeService;

    /**
     * Günlük tüketim kaydı oluşturur.
     */
    @PostMapping
    public ConsumptionResponse log(@RequestBody ConsumptionRequest request) {
        User user = userService.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + request.getUserId()));

        Recipe recipe = null;
        if (request.getRecipeId() != null) {
            recipe = recipeService.findById(request.getRecipeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tarif bulunamadı ID: " + request.getRecipeId()));
        }

        DailyConsumption entity = DailyConsumption.builder()
                .user(user)
                .foodName(request.getFoodName())
                .recipe(recipe)
                .mealType(request.getMealType())
                .portionSize(request.getPortionSize())
                .isCustomEntry(Boolean.TRUE.equals(request.getIsCustomEntry()))
                .isFromInventory(Boolean.TRUE.equals(request.getIsFromInventory()))
                .build();

        DailyConsumption saved = dailyConsumptionService.logConsumption(entity);

        ConsumptionResponse response = new ConsumptionResponse();
        response.setId(saved.getId());
        response.setEstimatedCalories(saved.getEstimatedCalories());
        response.setConsumedAt(saved.getConsumedAt());
        return response;
    }
}
