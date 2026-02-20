package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.RecipeRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Tarif değerlendirmelerine erişim sağlayan repository arayüzü.
 */
@Repository
public interface RecipeRatingRepository extends JpaRepository<RecipeRating, Long> {

    /**
     * Belirli bir tarife ait tüm değerlendirmeleri getirir.
     */
    List<RecipeRating> findByRecipeId(Long recipeId);

    /**
     * Belirli bir kullanıcıya ait tüm değerlendirmeleri getirir.
     */
    List<RecipeRating> findByUserId(Long userId);

    /**
     * Bir kullanıcının belirli bir tarif için yaptığı değerlendirmeyi getirir.
     */
    List<RecipeRating> findByUserIdAndRecipeId(Long userId, Long recipeId);
}
