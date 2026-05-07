package com.mealapp.domain.recommendation.repository;

import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecommendedRecipeRepository extends JpaRepository<RecommendedRecipe, Long> {
}
