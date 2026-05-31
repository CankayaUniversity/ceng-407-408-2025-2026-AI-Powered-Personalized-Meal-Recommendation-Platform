package com.mealapp.domain.recipe.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeRating;
import com.mealapp.domain.recipe.repository.RecipeRatingRepository;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Tarif değerlendirme işlemlerini yöneten servis.
 */
@Service
@RequiredArgsConstructor
public class RecipeRatingService {

    private final RecipeRatingRepository recipeRatingRepository;
    private final RecipeService recipeService;
    private final UserService userService;

    /**
     * Yeni bir değerlendirme kaydeder veya mevcut olanı günceller.
     */
    @Transactional
    public RecipeRating rateRecipe(String userId, Long recipeId, Integer rating, String comment) {
        if (rating < 1 || rating > 10) {
            throw MealAppDomainException.withCode("domain.recipe.rating_range");
        }

        User user = userService.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.user.not_found", userId));

        Recipe recipe = recipeService.findById(recipeId)
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.recipe.not_found", recipeId));

        // Eğer kullanıcı daha önce bu tarife puan verdiyse onu güncelle, yoksa yeni oluştur.
        RecipeRating recipeRating = recipeRatingRepository.findByUserIdAndRecipeId(userId, recipeId)
                .stream().findFirst()
                .orElse(RecipeRating.builder()
                        .user(user)
                        .recipe(recipe)
                        .build());

        recipeRating.setRating(rating);
        recipeRating.setComment(comment);

        RecipeRating savedRating = recipeRatingRepository.save(recipeRating);
        
        // Tarif istatistiklerini güncelle
        updateRecipeRatingStats(recipe);
        
        return savedRating;
    }

    private void updateRecipeRatingStats(Recipe recipe) {
        List<RecipeRating> ratings = recipeRatingRepository.findByRecipeId(recipe.getId());
        int count = ratings.size();
        double average = ratings.stream()
                .mapToInt(RecipeRating::getRating)
                .average()
                .orElse(0.0);
        
        recipe.setRatingCount(count);
        recipe.setAverageRating(average);
        recipeService.save(recipe);
    }

    /**
     * Belirli bir tarife ait değerlendirmeleri listeler.
     */
    @Transactional(readOnly = true)
    public List<RecipeRating> getRatingsByRecipe(Long recipeId) {
        return recipeRatingRepository.findByRecipeId(recipeId);
    }

    /**
     * Belirli bir kullanıcının yaptığı değerlendirmeleri listeler.
     */
    @Transactional(readOnly = true)
    public List<RecipeRating> getRatingsByUser(String userId) {
        return recipeRatingRepository.findByUserId(userId);
    }
}
