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
    
    @Query("SELECT r FROM Recipe r LEFT JOIN FETCH r.ingredients WHERE r.id = :id")
    Optional<Recipe> findByIdWithIngredients(Long id);

    @Query("SELECT DISTINCT r FROM Recipe r LEFT JOIN FETCH r.ingredients")
    List<Recipe> findAllWithIngredients();

    /**
     * Başlığa göre tarif araması yapar.
     */
    List<Recipe> findByTitleContainingIgnoreCase(String title);

    /**
     * Belirli malzemeleri içeren tarifleri bulmak için temel metod.
     * Not: Daha karmaşık eşleşmeler (AI veya Vektör arama) servis katmanında yönetilecektir.
     */
    @Query("SELECT DISTINCT r FROM Recipe r JOIN r.ingredients i WHERE i.name IN :ingredients")
    List<Recipe> findByIngredientNamesIn(List<String> ingredients);
}
