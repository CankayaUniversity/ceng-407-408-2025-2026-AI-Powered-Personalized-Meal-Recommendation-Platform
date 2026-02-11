package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.inventory.entity.Inventory;
import java.util.List;

public interface RecommendationStrategy {
    List<Recipe> recommend(User user, List<Inventory> currentInventory);
}
