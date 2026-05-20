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
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
           "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
           "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
           "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id)))))))")
    Page<Recipe> findAllActive(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT r FROM Recipe r " +
           "LEFT JOIN FETCH r.recipeIngredients ri " +
           "LEFT JOIN FETCH ri.ingredient i " +
           "LEFT JOIN FETCH i.nutrition " +
           "WHERE r.active = true AND " +
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
           "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
           "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
           "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id)))))))")
    Page<Recipe> findAllWithIngredients(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT DISTINCT r FROM Recipe r " +
           "LEFT JOIN FETCH r.recipeIngredients ri " +
           "LEFT JOIN FETCH ri.ingredient i " +
           "LEFT JOIN FETCH i.nutrition " +
           "WHERE r.active = true AND " +
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
           "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
           "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
           "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id)))))))")
    List<Recipe> findAllWithIngredients(@Param("userId") String userId);

    /**
     * Başlığa göre tarif araması yapar.
     */
    @Query(value = "SELECT r FROM Recipe r WHERE r.active = true AND " +
                   "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                   "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                   "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                   "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                   "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                   "LOWER(r.title) LIKE LOWER(CONCAT('%', :title, '%'))",
           countQuery = "SELECT count(r) FROM Recipe r WHERE r.active = true AND " +
                        "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                        "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                        "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                        "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                        "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
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

    @Query("SELECT r FROM Recipe r WHERE r.active = true " +
           "AND r.totalCalories IS NOT NULL " +
           "AND (r.totalCalories / CASE WHEN r.servings IS NULL OR r.servings <= 0 THEN 1 ELSE r.servings END) " +
           "BETWEEN :minCaloriesPerServing AND :maxCaloriesPerServing")
    List<Recipe> findActiveByCaloriesPerServingBetween(
            @Param("minCaloriesPerServing") double minCaloriesPerServing,
            @Param("maxCaloriesPerServing") double maxCaloriesPerServing
    );

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
           "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
           "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
           "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
           "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
           "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) " +
           "AND (:dietType = 'NONE' OR LOWER(r.title) LIKE LOWER(CONCAT('%', :dietType, '%'))) " +
           "AND NOT EXISTS (SELECT 1 FROM RecipeIngredient ri2 " +
           "                JOIN ri2.ingredient i2 " +
           "                WHERE ri2.recipe = r AND i2.name IN :allergies) " +
           "ORDER BY r.averageRating DESC, r.versionNumber DESC, r.createdAt DESC, r.id DESC")
    List<Recipe> findTopRecipesSafeForUser(@Param("userId") String userId, @Param("dietType") String dietType, @Param("allergies") List<String> allergies, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT DISTINCT r FROM Recipe r " +
           "LEFT JOIN FETCH r.recipeIngredients ri " +
           "LEFT JOIN FETCH ri.ingredient i " +
           "LEFT JOIN FETCH i.nutrition " +
           "WHERE r.active = true AND " +
           "(r.id = :rootId OR r.parentId = :rootId) AND " +
           "(r.active = true OR r.id = :rootId) AND " +
           "(r.status = 'APPROVED' OR r.createdBy = :userId OR :isAdmin = true) " +
           "ORDER BY r.versionNumber DESC, r.createdAt DESC, r.id DESC")
    List<Recipe> findAllVersions(@Param("rootId") Long rootId, @Param("userId") String userId, @Param("isAdmin") boolean isAdmin);

    @Query("SELECT COALESCE(MAX(r.versionNumber), 1) FROM Recipe r WHERE r.id = :rootId OR r.parentId = :rootId")
    Integer findMaxVersionNumber(@Param("rootId") Long rootId);

    List<Recipe> findByParentIdAndStatusAndActiveTrue(Long parentId, RecipeStatus status);

    Optional<Recipe> findFirstByParentIdAndCreatedByAndStatusInAndActiveTrueOrderByVersionNumberDescCreatedAtDescIdDesc(
            Long parentId,
            String createdBy,
            List<RecipeStatus> statuses
    );

    @Query("SELECT DISTINCT r FROM Recipe r " +
           "LEFT JOIN FETCH r.recipeIngredients ri " +
           "LEFT JOIN FETCH ri.ingredient i " +
           "LEFT JOIN FETCH i.nutrition " +
           "WHERE r.parentId = :parentId AND r.createdBy = :createdBy " +
           "AND r.status IN :statuses AND r.active = true " +
           "ORDER BY r.versionNumber DESC, r.createdAt DESC, r.id DESC")
    List<Recipe> findUserRevisionsWithIngredients(
            @Param("parentId") Long parentId,
            @Param("createdBy") String createdBy,
            @Param("statuses") List<RecipeStatus> statuses,
            Pageable pageable
    );

    List<Recipe> findByParentIdAndCreatedByAndStatusInAndActiveTrue(
            Long parentId,
            String createdBy,
            List<RecipeStatus> statuses
    );

    @Modifying
    @Query("UPDATE Recipe r SET r.active = false WHERE r.id = :id")
    void softDelete(@Param("id") Long id);

    @Query(value = "SELECT r FROM Recipe r WHERE r.active = true AND " +
                   "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                   "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                   "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                   "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                   "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                   "r.category = :category",
          countQuery = "SELECT count(r) FROM Recipe r WHERE r.active = true AND " +
                       "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                       "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                       "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                       "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                       "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                       "r.category = :category")
    Page<Recipe> findAllActiveByCategory(@Param("userId") String userId, @Param("category") com.mealapp.domain.recipe.entity.RecipeCategory category, Pageable pageable);

    @Query(value = "SELECT r FROM Recipe r WHERE r.active = true AND " +
                   "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                   "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                   "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                   "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                   "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                   "EXISTS (SELECT rf FROM RecipeFavorite rf WHERE rf.active = true AND rf.userId = :userId AND " +
                   "  ((r.parentId IS NULL AND (rf.recipe.id = r.id OR rf.recipe.parentId = r.id)) OR " +
                   "   (r.parentId IS NOT NULL AND rf.recipe.id = r.parentId)))",
           countQuery = "SELECT count(r) FROM Recipe r WHERE r.active = true AND " +
                        "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                        "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                        "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                        "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                        "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                        "EXISTS (SELECT rf FROM RecipeFavorite rf WHERE rf.active = true AND rf.userId = :userId AND " +
                        "  ((r.parentId IS NULL AND (rf.recipe.id = r.id OR rf.recipe.parentId = r.id)) OR " +
                        "   (r.parentId IS NOT NULL AND rf.recipe.id = r.parentId)))")
    Page<Recipe> findAllFavoritesByUserId(@Param("userId") String userId, Pageable pageable);

    @Query(value = "SELECT r FROM Recipe r WHERE r.active = true AND " +
                   "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                   "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                   "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                   "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                   "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                   "LOWER(r.title) LIKE LOWER(CONCAT('%', :title, '%')) AND " +
                   "r.category = :category",
          countQuery = "SELECT count(r) FROM Recipe r WHERE r.active = true AND " +
                       "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                       "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                       "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                       "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                       "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                       "LOWER(r.title) LIKE LOWER(CONCAT('%', :title, '%')) AND " +
                       "r.category = :category")
    Page<Recipe> findByTitleAndCategory(@Param("title") String title, @Param("category") com.mealapp.domain.recipe.entity.RecipeCategory category, @Param("userId") String userId, Pageable pageable);

    @Query(value = "SELECT r FROM Recipe r WHERE r.active = true AND " +
                   "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                   "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                   "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                   "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                   "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                   "LOWER(r.title) LIKE LOWER(CONCAT('%', :title, '%')) AND " +
                   "EXISTS (SELECT rf FROM RecipeFavorite rf WHERE rf.active = true AND rf.userId = :userId AND " +
                   "  ((r.parentId IS NULL AND (rf.recipe.id = r.id OR rf.recipe.parentId = r.id)) OR " +
                   "   (r.parentId IS NOT NULL AND rf.recipe.id = r.parentId)))",
           countQuery = "SELECT count(r) FROM Recipe r WHERE r.active = true AND " +
                        "((r.parentId IS NULL AND (r.status = 'APPROVED' OR r.createdBy = :userId) " +
                        "  AND NOT EXISTS (SELECT rev.id FROM Recipe rev WHERE rev.parentId = r.id AND rev.createdBy = :userId AND rev.status <> 'SUPERSEDED' AND rev.active = true)) OR " +
                        "(r.parentId IS NOT NULL AND r.createdBy = :userId AND r.status <> 'SUPERSEDED' " +
                        "  AND NOT EXISTS (SELECT newer.id FROM Recipe newer WHERE newer.parentId = r.parentId AND newer.createdBy = :userId AND newer.status <> 'SUPERSEDED' AND newer.active = true " +
                        "      AND (newer.versionNumber > r.versionNumber OR (newer.versionNumber = r.versionNumber AND (newer.createdAt > r.createdAt OR (newer.createdAt = r.createdAt AND newer.id > r.id))))))) AND " +
                        "LOWER(r.title) LIKE LOWER(CONCAT('%', :title, '%')) AND " +
                        "EXISTS (SELECT rf FROM RecipeFavorite rf WHERE rf.active = true AND rf.userId = :userId AND " +
                        "  ((r.parentId IS NULL AND (rf.recipe.id = r.id OR rf.recipe.parentId = r.id)) OR " +
                        "   (r.parentId IS NOT NULL AND rf.recipe.id = r.parentId)))")
    Page<Recipe> findFavoritesByTitleAndUserId(@Param("title") String title, @Param("userId") String userId, Pageable pageable);
}
