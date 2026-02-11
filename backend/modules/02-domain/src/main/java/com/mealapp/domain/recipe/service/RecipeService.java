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
     * Tüm tarifleri getirir.
     */
    public List<Recipe> findAll() {
        return recipeRepository.findAll();
    }

    /**
     * Verilen malzemeleri içeren tarifleri filtreler.
     */
    public List<Recipe> findByIngredients(List<String> ingredients) {
        return recipeRepository.findByIngredientsIn(ingredients);
    }

    /**
     * Bir tarifin kullanıcının diyet tipine uygun olup olmadığını kontrol eder.
     */
    public boolean isCompatibleWithDiet(Recipe recipe, String dietType) {
        // TODO: Diyet kontrol mantığı (AI veya kural tabanlı) buraya gelecek.
        return true;
    }
}
