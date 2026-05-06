package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Yemek tariflerine erişim sağlayan repository arayüzü.
 */
@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    
    Optional<Recipe> findByIdAndActiveTrue(Long id);

    @Query("SELECT r FROM Recipe r LEFT JOIN FETCH r.recipeIngredients ri LEFT JOIN FETCH ri.ingredient i LEFT JOIN FETCH i.nutrition WHERE r.id = :id")
    Optional<Recipe> findByIdWithIngredients(@Param("id") Long id);

    @Query("SELECT r FROM Recipe r LEFT JOIN FETCH r.recipeIngredients ri LEFT JOIN FETCH ri.ingredient i LEFT JOIN FETCH i.nutrition WHERE r.id = :id AND r.active = true")
    Optional<Recipe> findActiveByIdWithIngredients(@Param("id") Long id);

    @Query("SELECT r FROM Recipe r WHERE r.active = true AND " +
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId))")
    Page<Recipe> findAllActive(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT r FROM Recipe r " +
           "LEFT JOIN FETCH r.recipeIngredients ri " +
           "LEFT JOIN FETCH ri.ingredient i " +
           "LEFT JOIN FETCH i.nutrition " +
           "WHERE r.active = true AND " +
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId))")
    Page<Recipe> findAllWithIngredients(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT DISTINCT r FROM Recipe r " +
           "LEFT JOIN FETCH r.recipeIngredients ri " +
           "LEFT JOIN FETCH ri.ingredient i " +
           "LEFT JOIN FETCH i.nutrition " +
           "WHERE r.active = true AND " +
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId))")
    List<Recipe> findAllWithIngredients(@Param("userId") String userId);

    /**
     * Başlığa göre tarif araması yapar.
     */
    @Query(value = "SELECT r FROM Recipe r WHERE r.active = true AND " +
                   "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId)) OR " +
                   "(r.parentId IS NOT NULL AND r.createdBy = :userId)) AND " +
                   "LOWER(r.title) LIKE LOWER(CONCAT('%', :title, '%'))",
           countQuery = "SELECT count(r) FROM Recipe r WHERE r.active = true AND " +
                        "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId)) OR " +
                        "(r.parentId IS NOT NULL AND r.createdBy = :userId)) AND " +
                        "LOWER(r.title) LIKE LOWER(CONCAT('%', :title, '%'))")
    Page<Recipe> findByTitleContainingIgnoreCase(@Param("title") String title, @Param("userId") String userId, Pageable pageable);

    List<Recipe> findByTitleContainingIgnoreCaseAndActiveTrueAndStatus(String title, RecipeStatus status);

    Page<Recipe> findByStatusAndActiveTrue(RecipeStatus status, Pageable pageable);

    Optional<Recipe> findByParentIdAndStatus(Long parentId, RecipeStatus status);

    /**
     * Belirli malzemeleri içeren tarifleri bulmak için temel metod.
     */
    @Query("SELECT DISTINCT r FROM Recipe r JOIN r.recipeIngredients ri JOIN ri.ingredient i WHERE r.active = true AND i.name IN :ingredients")
    List<Recipe> findByIngredientNamesIn(List<String> ingredients);

    @Query("SELECT DISTINCT r FROM Recipe r JOIN r.recipeIngredients ri WHERE r.active = true AND ri.ingredient.id = :ingredientId")
    List<Recipe> findByIngredientId(Long ingredientId);

    /**
     * Alerjen içermeyen ve belirli bir diyet tipine uygun tarifleri döner.
     * Bu metot tüm database üzerinde filtreleme yaparak en iyi puanlı ve eşleşebilecek adayları seçer.
     */
    @Query("SELECT DISTINCT r FROM Recipe r " +
           "JOIN r.recipeIngredients ri " +
           "JOIN ri.ingredient i " +
           "WHERE r.active = true AND " +
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId)) " +
           "AND (:dietType = 'NONE' OR r.title LIKE %:dietType%) " + 
           "AND NOT EXISTS (SELECT 1 FROM RecipeIngredient ri2 " +
           "                JOIN ri2.ingredient i2 " +
           "                WHERE ri2.recipe = r AND i2.name IN :allergies) " +
           "ORDER BY r.averageRating DESC")
    List<Recipe> findTopRecipesSafeForUser(@Param("userId") String userId, @Param("dietType") String dietType, @Param("allergies") List<String> allergies, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT r FROM Recipe r WHERE r.active = true AND " +
           "(r.id = :rootId OR r.parentId = :rootId) AND " +
           "(r.status = 'APPROVED' OR r.createdBy = :userId OR :isAdmin = true) " +
           "ORDER BY r.createdAt DESC")
    List<Recipe> findAllVersions(@Param("rootId") Long rootId, @Param("userId") String userId, @Param("isAdmin") boolean isAdmin);

    @Modifying
    @Query("UPDATE Recipe r SET r.active = false WHERE r.id = :id")
    void softDelete(@Param("id") Long id);
}
