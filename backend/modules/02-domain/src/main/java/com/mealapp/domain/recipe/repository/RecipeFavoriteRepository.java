package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.RecipeFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RecipeFavoriteRepository extends JpaRepository<RecipeFavorite, Long> {
    Optional<RecipeFavorite> findByUserIdAndRecipeId(String userId, Long recipeId);
    boolean existsByUserIdAndRecipeId(String userId, Long recipeId);
    void deleteByUserIdAndRecipeId(String userId, Long recipeId);
}
