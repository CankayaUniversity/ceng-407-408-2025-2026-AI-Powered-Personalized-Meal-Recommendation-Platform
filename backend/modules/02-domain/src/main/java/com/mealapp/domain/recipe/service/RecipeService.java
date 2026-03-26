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
 * Tarif filtreleme, diyet uygunluk kontrolü gibi işlemleri yapar.
 */
@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;

    /**
     * Tarifin toplam besin değerlerini (Kalori, Protein, Karbonhidrat, Yağ) 
     * içerisindeki malzemelerin gramajlarına göre hesaplar ve günceller.
     */
    @Transactional
    public void calculateAndSetNutrition(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            // Eğer malzemeler yüklü değilse, veritabanından fetch join ile çekelim
            recipe = recipeRepository.findByIdWithIngredients(recipe.getId())
                    .orElse(recipe);
        }

        double totalCal = 0;
        double totalProt = 0;
        double totalCarb = 0;
        double totalFat = 0;

        if (recipe.getRecipeIngredients() != null) {
            for (RecipeIngredient ri : recipe.getRecipeIngredients()) {
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
     * Bir malzeme güncellendiğinde onu kullanan tüm tariflerin besin değerlerini günceller.
     */
    @Transactional
    public void refreshRecipesByIngredient(Long ingredientId) {
        List<Recipe> recipes = recipeRepository.findByIngredientId(ingredientId);
        recipes.forEach(this::calculateAndSetNutrition);
    }

    /**
     * ID'ye göre tarif detaylarını getirir.
     */
    public Optional<Recipe> findById(Long id) {
        return recipeRepository.findById(id);
    }

    /**
     * Tüm tarifleri malzemeleriyle birlikte getirir.
     */
    @Transactional(readOnly = true)
    public List<Recipe> findAll() {
        return recipeRepository.findAllWithIngredients();
    }

    /**
     * Sayfalanmış tarif listesini getirir.
     */
    @Transactional(readOnly = true)
    public Page<Recipe> findAll(Pageable pageable) {
        return recipeRepository.findAllWithIngredients(pageable);
    }

    /**
     * Başlığa göre sayfalanmış arama yapar.
     */
    @Transactional(readOnly = true)
    public Page<Recipe> searchByTitle(String title, Pageable pageable) {
        return recipeRepository.findByTitleContainingIgnoreCase(title, pageable);
    }

    /**
     * Verilen malzemeleri içeren tarifleri filtreler.
     */
    public List<Recipe> findByIngredients(List<String> ingredientNames) {
        return recipeRepository.findByIngredientNamesIn(ingredientNames);
    }

    /**
     * Bir tarifin kullanıcının diyet tipine uygun olup olmadığını kontrol eder.
     * Bu metot kural tabanlı bir başlangıç filtresidir; AI öneri motoru bunu daha hassas analiz eder.
     */
    public boolean isCompatibleWithDiet(Recipe recipe, String dietType, List<String> userAllergies) {
        if (recipe == null) return false;

        // 1. Alerjen kontrolü: Eğer tarifteki herhangi bir malzeme kullanıcının alerjen listesindeyse uyumsuzdur.
        if (userAllergies != null && !userAllergies.isEmpty() && recipe.getRecipeIngredients() != null) {
            boolean hasAllergen = recipe.getRecipeIngredients().stream()
                    .anyMatch(ri -> ri.getIngredient() != null && 
                                  userAllergies.stream().anyMatch(allergen -> 
                                      ri.getIngredient().getName().equalsIgnoreCase(allergen)));
            if (hasAllergen) return false;
        }

        // 2. Diyet tipi kontrolü: Basit kural tabanlı kısıtlamalar
        if (dietType != null && !dietType.equals("NONE")) {
            // Örnek: Vegan diyeti için hayvansal ürün kontrolü
            if (dietType.equalsIgnoreCase("VEGAN")) {
                return isVeganFriendly(recipe);
            }
            // Örnek: Vejetaryen diyeti kontrolü
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
