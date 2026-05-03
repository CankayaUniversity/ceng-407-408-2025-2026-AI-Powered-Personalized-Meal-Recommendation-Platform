package com.mealapp.domain.recipe.service;

public interface RecipeFavoriteService {
    /**
     * Tarifi favorilere ekler veya çıkarır (toggle).
     * @return true ise favorilere eklendi, false ise çıkarıldı.
     */
    boolean toggleFavorite(String userId, Long recipeId);
}
