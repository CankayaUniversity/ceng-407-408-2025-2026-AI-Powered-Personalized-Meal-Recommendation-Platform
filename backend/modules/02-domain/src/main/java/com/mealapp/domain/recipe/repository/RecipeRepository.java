package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Yemek tariflerine erişim sağlayan repository arayüzü.
 */
@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    
    /**
     * Başlığa göre tarif araması yapar.
     */
    List<Recipe> findByTitleContainingIgnoreCase(String title);

    /**
     * Belirli malzemeleri içeren tarifleri bulmak için temel metod.
     * Not: Daha karmaşık eşleşmeler (AI veya Vektör arama) servis katmanında yönetilecektir.
     */
    List<Recipe> findByIngredientsIn(List<String> ingredients);
}
