package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Malzemelere erişim sağlayan repository arayüzü.
 */
@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
    List<Ingredient> findByRecipeId(Long recipeId);
}
