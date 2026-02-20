package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Yemek tarifleri ile ilgili iş mantığını yöneten servis.
 * Tarif filtreleme, diyet uygunluk kontrolü gibi işlemleri yapar.
 */
@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;

    /**
     * Tüm tarifleri malzemeleriyle birlikte getirir.
     */
    public List<Recipe> findAll() {
        return recipeRepository.findAllWithIngredients();
    }

    /**
     * Verilen malzemeleri içeren tarifleri filtreler.
     */
    public List<Recipe> findByIngredients(List<String> ingredientNames) {
        return recipeRepository.findByIngredientNamesIn(ingredientNames);
    }

    /**
     * Bir tarifin kullanıcının diyet tipine uygun olup olmadığını kontrol eder.
     */
    public boolean isCompatibleWithDiet(Recipe recipe, String dietType) {
        // TODO: Diyet kontrol mantığı (AI veya kural tabanlı) buraya gelecek.
        return true;
    }
}
