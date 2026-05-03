package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Yemek tarifleri ile ilgili iş mantığını yöneten servis.
 * Tarif filtreleme, besin değeri senkronizasyonu ve diyet uyumluluk kontrollerini yapar.
 */
@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final UnitConverterService unitConverterService; // Modül 03'teki implementasyonu kullanacak interface

    /**
     * Tarifin toplam besin değerlerini hesaplar ve günceller.
     * Bu süreçte eğer malzeme gramajı (grams) eksikse (0 veya null),
     * unitConverterService üzerinden otomatik hesaplama yaparak veritabanını senkronize eder.
     */
    @Transactional
    public void calculateAndSetNutrition(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            // Malzemeler yüklü değilse, fetch join içeren repository metodunu kullanalım
            recipe = recipeRepository.findByIdWithIngredients(recipe.getId())
                .orElse(recipe);
        }

        double totalCal = 0;
        double totalProt = 0;
        double totalCarb = 0;
        double totalFat = 0;

        if (recipe.getRecipeIngredients() != null) {
            for (RecipeIngredient ri : recipe.getRecipeIngredients()) {

                // 1. ADIM: Gramaj Senkronizasyonu (JIT Calculation)
                // Python'dan gelen veya manuel girilen 0 değerlerini gerçek gramaja çevirir
                if ((ri.getGrams() == null || ri.getGrams() == 0) && ri.getAmount() != null) {
                    Double calculatedGrams = unitConverterService.convertToGrams(
                        ri.getAmount(),
                        ri.getUnit(),
                        ri.getIngredient()
                    );
                    ri.setGrams(calculatedGrams);
                    // Not: @Transactional sayesinde döngü sonunda bu bilgi DB'ye yansır.
                }

                // 2. ADIM: Güncel gramaj üzerinden besin değerlerini hesapla
                if (ri.getIngredient() != null && ri.getIngredient().getNutrition() != null) {
                    double grams = ri.getGrams();
                    var nutrition = ri.getIngredient().getNutrition();

                    totalCal += (nutrition.getCaloriesPer100g() / 100.0) * grams;
                    totalProt += (nutrition.getProteinPer100g() / 100.0) * grams;
                    totalCarb += (nutrition.getCarbsPer100g() / 100.0) * grams;
                    totalFat += (nutrition.getFatPer100g() / 100.0) * grams;
                }
            }
        }

        recipe.setTotalCalories(totalCal);
        recipe.setTotalProtein(totalProt);
        recipe.setTotalCarbs(totalCarb);
        recipe.setTotalFat(totalFat);

        recipeRepository.save(recipe);
    }

    /**
     * Bir malzeme güncellendiğinde onu kullanan tüm tariflerin besin değerlerini (ve gramajlarını) tazeler.
     */
    @Transactional
    public void refreshRecipesByIngredient(Long ingredientId) {
        List<Recipe> recipes = recipeRepository.findByIngredientId(ingredientId);
        recipes.forEach(this::calculateAndSetNutrition);
    }

    /**
     * ID'ye göre tarif detaylarını getirir.
     * Besin değerleri veya gramajlar henüz hesaplanmamışsa (0 ise), hesaplayıp döner.
     */
    @Transactional
    public Optional<Recipe> findById(Long id) {
        return recipeRepository.findByIdWithIngredients(id).map(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
            return recipe;
        });
    }

    /**
     * Tarifi soft delete ile pasif duruma getirir.
     */
    @Transactional
    public void deleteById(Long id) {
        recipeRepository.softDelete(id);
    }

    /**
     * Tüm tarifleri malzemeleriyle birlikte getirir ve eksik hesaplamaları tamamlar.
     */
    @Transactional
    public List<Recipe> findAll() {
        List<Recipe> recipes = recipeRepository.findAllWithIngredients();
        recipes.forEach(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
        });
        return recipes;
    }

    /**
     * Sayfalanmış tarif listesini getirir ve eksik hesaplamaları tamamlar.
     */
    @Transactional
    public Page<Recipe> findAll(Pageable pageable) {
        Page<Recipe> recipes = recipeRepository.findAllActive(pageable);
        recipes.forEach(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
        });
        return recipes;
    }

    /**
     * Başlığa göre sayfalanmış arama yapar.
     */
    @Transactional
    public Page<Recipe> searchByTitle(String title, Pageable pageable) {
        Page<Recipe> recipes = recipeRepository.findByTitleContainingIgnoreCase(title, pageable);
        recipes.forEach(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
        });
        return recipes;
    }

    /**
     * Verilen malzemeleri içeren tarifleri filtreler.
     */
    public List<Recipe> findByIngredients(List<String> ingredientNames) {
        return recipeRepository.findByIngredientNamesIn(ingredientNames);
    }

    /**
     * Bir tarifin kullanıcının diyet tipine ve alerjilerine uygunluğunu kontrol eder.
     */
    public boolean isCompatibleWithDiet(Recipe recipe, String dietType, List<String> userAllergies) {
        if (recipe == null) return false;

        // 1. Alerjen kontrolü
        if (userAllergies != null && !userAllergies.isEmpty() && recipe.getRecipeIngredients() != null) {
            boolean hasAllergen = recipe.getRecipeIngredients().stream()
                .anyMatch(ri -> ri.getIngredient() != null &&
                    userAllergies.stream().anyMatch(allergen ->
                        ri.getIngredient().getName().equalsIgnoreCase(allergen)));
            if (hasAllergen) return false;
        }

        // 2. Diyet tipi kontrolü
        if (dietType != null && !dietType.equals("NONE")) {
            if (dietType.equalsIgnoreCase("VEGAN")) {
                return isVeganFriendly(recipe);
            }
            if (dietType.equalsIgnoreCase("VEGETARIAN")) {
                return isVegetarianFriendly(recipe);
            }
        }

        return true;
    }

    private boolean isVeganFriendly(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) return true;
        return recipe.getRecipeIngredients().stream()
            .noneMatch(ri -> isAnimalProduct(ri.getIngredient()));
    }

    private boolean isVegetarianFriendly(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) return true;
        return recipe.getRecipeIngredients().stream()
            .noneMatch(ri -> isMeatProduct(ri.getIngredient()));
    }

    private boolean isAnimalProduct(Ingredient ingredient) {
        if (ingredient == null) return false;
        Ingredient.Category cat = ingredient.getCategory();
        return cat == Ingredient.Category.MEAT ||
            cat == Ingredient.Category.DAIRY ||
            cat == Ingredient.Category.EGG ||
            cat == Ingredient.Category.SEAFOOD;
    }

    private boolean isMeatProduct(Ingredient ingredient) {
        if (ingredient == null) return false;
        Ingredient.Category cat = ingredient.getCategory();
        return cat == Ingredient.Category.MEAT ||
            cat == Ingredient.Category.SEAFOOD;
    }
}