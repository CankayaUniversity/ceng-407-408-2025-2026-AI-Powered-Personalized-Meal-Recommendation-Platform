package com.mealapp.domain.recipe.service;

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
    public RecipeRating rateRecipe(Long userId, Long recipeId, Integer rating, String comment) {
        if (rating < 1 || rating > 10) {
            throw new IllegalArgumentException("Puan 1 ile 10 arasında olmalıdır.");
        }

        User user = userService.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));

        Recipe recipe = recipeService.findById(recipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarif bulunamadı: " + recipeId));

        // Eğer kullanıcı daha önce bu tarife puan verdiyse onu güncelle, yoksa yeni oluştur.
        RecipeRating recipeRating = recipeRatingRepository.findByUserIdAndRecipeId(userId, recipeId)
                .stream().findFirst()
                .orElse(RecipeRating.builder()
                        .user(user)
                        .recipe(recipe)
                        .build());

        recipeRating.setRating(rating);
        recipeRating.setComment(comment);

        return recipeRatingRepository.save(recipeRating);
    }

    /**
     * Belirli bir tarife ait değerlendirmeleri listeler.
     */
    public List<RecipeRating> getRatingsByRecipe(Long recipeId) {
        return recipeRatingRepository.findByRecipeId(recipeId);
    }

    /**
     * Belirli bir kullanıcının yaptığı değerlendirmeleri listeler.
     */
    public List<RecipeRating> getRatingsByUser(Long userId) {
        return recipeRatingRepository.findByUserId(userId);
    }
}
