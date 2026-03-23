package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Yemek tariflerine erişim sağlayan repository arayüzü.
 */
@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    
    @Query("SELECT r FROM Recipe r LEFT JOIN FETCH r.recipeIngredients ri LEFT JOIN FETCH ri.ingredient WHERE r.id = :id")
    Optional<Recipe> findByIdWithIngredients(Long id);

    @Query("SELECT DISTINCT r FROM Recipe r LEFT JOIN FETCH r.recipeIngredients ri LEFT JOIN FETCH ri.ingredient")
    List<Recipe> findAllWithIngredients();

    /**
     * Başlığa göre tarif araması yapar.
     */
    List<Recipe> findByTitleContainingIgnoreCase(String title);

    /**
     * Belirli malzemeleri içeren tarifleri bulmak için temel metod.
     */
    @Query("SELECT DISTINCT r FROM Recipe r JOIN r.recipeIngredients ri JOIN ri.ingredient i WHERE i.name IN :ingredients")
    List<Recipe> findByIngredientNamesIn(List<String> ingredients);

    @Query("SELECT DISTINCT r FROM Recipe r JOIN r.recipeIngredients ri WHERE ri.ingredient.id = :ingredientId")
    List<Recipe> findByIngredientId(Long ingredientId);

    /**
     * Alerjen içermeyen ve belirli bir diyet tipine uygun tarifleri döner.
     * Bu metot tüm database üzerinde filtreleme yaparak en iyi puanlı ve eşleşebilecek adayları seçer.
     */
    @Query("SELECT DISTINCT r FROM Recipe r " +
           "JOIN r.recipeIngredients ri " +
           "JOIN ri.ingredient i " +
           "WHERE (:dietType = 'NONE' OR r.title LIKE %:dietType%) " + 
           "AND NOT EXISTS (SELECT 1 FROM RecipeIngredient ri2 " +
           "                JOIN ri2.ingredient i2 " +
           "                WHERE ri2.recipe = r AND i2.name IN :allergies) " +
           "ORDER BY r.averageRating DESC")
    List<Recipe> findTopRecipesSafeForUser(String dietType, List<String> allergies, org.springframework.data.domain.Pageable pageable);
}
