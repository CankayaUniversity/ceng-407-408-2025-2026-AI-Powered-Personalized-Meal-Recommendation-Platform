package com.mealapp.app.controller;

import com.mealapp.app.model.dto.RecipeRatingRequest;
import com.mealapp.app.model.dto.RecipeRatingResponse;
import com.mealapp.app.model.mapper.RecipeRatingMapper;
import com.mealapp.domain.recipe.entity.RecipeRating;
import com.mealapp.domain.recipe.service.RecipeRatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tarif değerlendirmeleri için API uç noktası.
 */
@RestController
@RequestMapping("/api/v1/ratings")
@RequiredArgsConstructor
public class RecipeRatingController {

    private final RecipeRatingService recipeRatingService;
    private final RecipeRatingMapper recipeRatingMapper;

    /**
     * Yeni bir değerlendirme ekler veya mevcut olanı günceller.
     */
    @PostMapping
    public RecipeRatingResponse rateRecipe(@RequestBody RecipeRatingRequest request) {
        RecipeRating rating = recipeRatingService.rateRecipe(
                request.getUserId(),
                request.getRecipeId(),
                request.getRating(),
                request.getComment()
        );
        return recipeRatingMapper.toResponse(rating);
    }

    /**
     * Belirli bir tarife ait tüm değerlendirmeleri getirir.
     */
    @GetMapping("/recipe/{recipeId}")
    public List<RecipeRatingResponse> getRatingsByRecipe(@PathVariable Long recipeId) {
        List<RecipeRating> ratings = recipeRatingService.getRatingsByRecipe(recipeId);
        return recipeRatingMapper.toResponseList(ratings);
    }

    /**
     * Belirli bir kullanıcının yaptığı tüm değerlendirmeleri getirir.
     */
    @GetMapping("/user/{userId}")
    public List<RecipeRatingResponse> getRatingsByUser(@PathVariable Long userId) {
        List<RecipeRating> ratings = recipeRatingService.getRatingsByUser(userId);
        return recipeRatingMapper.toResponseList(ratings);
    }
}
