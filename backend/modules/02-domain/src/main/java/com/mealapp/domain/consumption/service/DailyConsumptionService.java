package com.mealapp.domain.consumption.service;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.repository.DailyConsumptionRepository;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Günlük tüketim kayıtlarını yöneten domain servisi.
 * Not: Kalori tahmini (AI) ve metin->kalori dönüşümü Application/Infrastructure katmanında yapılmalı,
 * bu servis sadece iş kuralı odağında kayıt ve toplama işlemlerini yapmalıdır.
 */
@Service
@RequiredArgsConstructor
public class DailyConsumptionService {

    private final DailyConsumptionRepository dailyConsumptionRepository;
    private final InventoryService inventoryService;
    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;

    /**
     * Yeni bir tüketim kaydı oluşturur.
     * Eğer sistem dışı bir yemekse ve porsiyon bilgisi varsa, yaklaşık değerleri atar.
     * Eğer evden (inventory) tüketilmişse, stok düşümü yapar.
     */
    @Transactional
    public DailyConsumption logConsumption(DailyConsumption consumption) {
        return logConsumption(consumption, true);
    }

    /**
     * Yeni bir tüketim kaydı oluşturur.
     * @param deductFromInventory Stok düşümü yapılıp yapılmayacağı.
     */
    @Transactional
    public DailyConsumption logConsumption(DailyConsumption consumption, boolean deductFromInventory) {
        enrichConsumption(consumption);

        if (Boolean.TRUE.equals(consumption.getIsCustomEntry()) && consumption.getPortionSize() != null
                && consumption.getRecipe() == null && consumption.getIngredient() == null) {
            applyApproximateNutrition(consumption);
        }

        DailyConsumption saved = dailyConsumptionRepository.save(consumption);

        if (deductFromInventory && Boolean.TRUE.equals(saved.getIsFromInventory()) && saved.getInventoryGroup() != null) {
            deductFromInventory(saved);
        }

        return saved;
    }

    private void deductFromInventory(DailyConsumption consumption) {
        if (consumption.getInventoryGroup() == null) {
            return;
        }

        String userId = consumption.getUser().getId();
        Long inventoryGroupId = consumption.getInventoryGroup().getId();

        if (consumption.getRecipe() != null && consumption.getRecipe().getRecipeIngredients() != null) {
            double portionMultiplier = resolvePortionMultiplier(consumption);

            for (RecipeIngredient recipeIngredient : consumption.getRecipe().getRecipeIngredients()) {
                if (recipeIngredient.getIngredient() != null && recipeIngredient.getGrams() != null) {
                    inventoryService.consumeFromInventoryGroup(
                            userId,
                            inventoryGroupId,
                            recipeIngredient.getIngredient().getId(),
                            recipeIngredient.getGrams() * portionMultiplier
                    );
                }
            }
        }

        if (consumption.getIngredient() != null && consumption.getPortionGrams() != null) {
            inventoryService.consumeFromInventoryGroup(
                    userId,
                    inventoryGroupId,
                    consumption.getIngredient().getId(),
                    consumption.getPortionGrams()
            );
        }
    }

    private void enrichConsumption(DailyConsumption consumption) {
        if (consumption.getInventoryGroup() != null) {
            consumption.setIsFromInventory(true);
        }

        if (consumption.getRecipe() != null) {
            Recipe managedRecipe = loadRecipe(consumption.getRecipe());
            consumption.setRecipe(managedRecipe);
            applyRecipeNutrition(consumption, managedRecipe);
            if ((consumption.getFoodName() == null || consumption.getFoodName().isBlank()) && managedRecipe.getTitle() != null) {
                consumption.setFoodName(managedRecipe.getTitle());
            }
            return;
        }

        if (consumption.getIngredient() != null) {
            Ingredient managedIngredient = loadIngredient(consumption.getIngredient());
            consumption.setIngredient(managedIngredient);
            applyIngredientNutrition(consumption, managedIngredient);
            if ((consumption.getFoodName() == null || consumption.getFoodName().isBlank()) && managedIngredient.getName() != null) {
                consumption.setFoodName(managedIngredient.getName());
            }
        }
    }

    private void applyRecipeNutrition(DailyConsumption consumption, Recipe recipe) {
        NutritionTotals nutritionTotals = calculateRecipeNutrition(recipe);
        double multiplier = resolvePortionMultiplier(consumption);

        consumption.setPortionMultiplier(multiplier);
        consumption.setEstimatedCalories((int) Math.round(nutritionTotals.calories() * multiplier));
        consumption.setEstimatedProtein(roundDouble(nutritionTotals.protein() * multiplier));
        consumption.setEstimatedCarbs(roundDouble(nutritionTotals.carbs() * multiplier));
        consumption.setEstimatedFat(roundDouble(nutritionTotals.fat() * multiplier));
    }

    private void applyIngredientNutrition(DailyConsumption consumption, Ingredient ingredient) {
        double grams = resolveIngredientGrams(consumption);
        consumption.setPortionGrams(grams);

        IngredientNutrition nutrition = ingredient.getNutrition();
        if (nutrition == null) {
            return;
        }

        double factor = grams / 100.0;
        consumption.setEstimatedCalories((int) Math.round(nutrition.getCaloriesPer100g() * factor));
        consumption.setEstimatedProtein(roundDouble(nutrition.getProteinPer100g() * factor));
        consumption.setEstimatedCarbs(roundDouble(nutrition.getCarbsPer100g() * factor));
        consumption.setEstimatedFat(roundDouble(nutrition.getFatPer100g() * factor));
    }

    private void applyApproximateNutrition(DailyConsumption consumption) {
        // Profesyonel hesaplama yerine 'yaklaşık' standart değerler (Örn: Bir öğün ortalama değerleri)
        double multiplier = resolvePortionMultiplier(consumption);

        // Ortalama bir ev yemeği öğünü (yaklaşık 500 kcal baz alınarak)
        if (consumption.getEstimatedCalories() == null) {
            consumption.setEstimatedCalories((int) (500 * multiplier));
        }
        if (consumption.getEstimatedProtein() == null) {
            consumption.setEstimatedProtein(20.0 * multiplier);
        }
        if (consumption.getEstimatedCarbs() == null) {
            consumption.setEstimatedCarbs(50.0 * multiplier);
        }
        if (consumption.getEstimatedFat() == null) {
            consumption.setEstimatedFat(15.0 * multiplier);
        }
    }

    private Recipe loadRecipe(Recipe recipe) {
        if (recipe.getId() == null) {
            return recipe;
        }

        return recipeRepository.findByIdWithIngredients(recipe.getId()).orElse(recipe);
    }

    private Ingredient loadIngredient(Ingredient ingredient) {
        if (ingredient.getId() == null) {
            return ingredient;
        }

        return ingredientRepository.findByIdWithUnits(ingredient.getId()).orElse(ingredient);
    }

    private NutritionTotals calculateRecipeNutrition(Recipe recipe) {
        if (recipe.getTotalCalories() != null
                && recipe.getTotalProtein() != null
                && recipe.getTotalCarbs() != null
                && recipe.getTotalFat() != null) {
            return new NutritionTotals(
                    recipe.getTotalCalories(),
                    recipe.getTotalProtein(),
                    recipe.getTotalCarbs(),
                    recipe.getTotalFat()
            );
        }

        double totalCalories = 0;
        double totalProtein = 0;
        double totalCarbs = 0;
        double totalFat = 0;

        if (recipe.getRecipeIngredients() != null) {
            for (RecipeIngredient recipeIngredient : recipe.getRecipeIngredients()) {
                if (recipeIngredient.getIngredient() == null || recipeIngredient.getIngredient().getNutrition() == null
                        || recipeIngredient.getGrams() == null) {
                    continue;
                }

                IngredientNutrition nutrition = recipeIngredient.getIngredient().getNutrition();
                double factor = recipeIngredient.getGrams() / 100.0;

                totalCalories += nutrition.getCaloriesPer100g() * factor;
                totalProtein += nutrition.getProteinPer100g() * factor;
                totalCarbs += nutrition.getCarbsPer100g() * factor;
                totalFat += nutrition.getFatPer100g() * factor;
            }
        }

        return new NutritionTotals(totalCalories, totalProtein, totalCarbs, totalFat);
    }

    private double resolvePortionMultiplier(DailyConsumption consumption) {
        if (consumption.getPortionMultiplier() != null && consumption.getPortionMultiplier() > 0) {
            return consumption.getPortionMultiplier();
        }

        if (consumption.getPortionSize() == null) {
            return 1.0;
        }

        return switch (consumption.getPortionSize()) {
            case SMALL -> 0.7;
            case MEDIUM -> 1.0;
            case LARGE -> 1.3;
        };
    }

    private double resolveIngredientGrams(DailyConsumption consumption) {
        if (consumption.getPortionGrams() != null && consumption.getPortionGrams() > 0) {
            return consumption.getPortionGrams();
        }

        double multiplier = resolvePortionMultiplier(consumption);
        return 100.0 * multiplier;
    }

    private double roundDouble(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    /**
     * Kullanıcının belirli bir tarihteki toplam tüketilen kalori ve makrolarını hesaplar.
     */
    public DailyNutritionSummary getDailyNutritionSummary(String userId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        List<DailyConsumption> logs = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(userId, start, end);

        int totalCalories = logs.stream()
                .map(DailyConsumption::getEstimatedCalories)
                .filter(c -> c != null)
                .mapToInt(Integer::intValue)
                .sum();

        double totalProtein = logs.stream()
                .map(DailyConsumption::getEstimatedProtein)
                .filter(p -> p != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalCarbs = logs.stream()
                .map(DailyConsumption::getEstimatedCarbs)
                .filter(c -> c != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalFat = logs.stream()
                .map(DailyConsumption::getEstimatedFat)
                .filter(f -> f != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        return new DailyNutritionSummary(totalCalories, totalProtein, totalCarbs, totalFat);
    }

    public record DailyNutritionSummary(
            int totalCalories,
            double totalProtein,
            double totalCarbs,
            double totalFat
    ) {}

    /**
     * Kullanıcının son X gün içindeki ortalama kalori tüketimini hesaplar.
     * Bu, devamlılık analizi ve akıllı öneriler için kullanılır.
     */
    public double getAverageCaloriesForLastDays(String userId, int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days);
        LocalDateTime end = LocalDateTime.now();
        List<DailyConsumption> items = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(userId, start, end);
        
        if (items.isEmpty()) return 0;
        
        return items.stream()
                .map(DailyConsumption::getEstimatedCalories)
                .filter(c -> c != null)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);
    }

    /**
     * Verilen tarih aralığı için tüketim verilerini çeker.
     */
    public List<DailyConsumption> getConsumptionsBetween(String userId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        return dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(userId, start, end);
    }

    public void deleteConsumption(String userId, Long id) {
        DailyConsumption consumption = dailyConsumptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tüketim kaydı bulunamadı."));
        
        if (!consumption.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bu kaydı silme yetkiniz yok.");
        }
        
        dailyConsumptionRepository.delete(consumption);
    }

    /**
     * Tüketim listesini güne göre gruplayıp özetler.
     */
    public Map<LocalDate, DailyNutritionSummary> groupConsumptionsByDate(List<DailyConsumption> logs) {
        return logs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getConsumedAt().toLocalDate(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    int cal = list.stream().map(DailyConsumption::getEstimatedCalories).filter(java.util.Objects::nonNull).mapToInt(Integer::intValue).sum();
                                    double pro = list.stream().map(DailyConsumption::getEstimatedProtein).filter(java.util.Objects::nonNull).mapToDouble(Double::doubleValue).sum();
                                    double carb = list.stream().map(DailyConsumption::getEstimatedCarbs).filter(java.util.Objects::nonNull).mapToDouble(Double::doubleValue).sum();
                                    double fat = list.stream().map(DailyConsumption::getEstimatedFat).filter(java.util.Objects::nonNull).mapToDouble(Double::doubleValue).sum();
                                    return new DailyNutritionSummary(cal, pro, carb, fat);
                                }
                        )
                ));
    }

    private record NutritionTotals(
            double calories,
            double protein,
            double carbs,
            double fat
    ) {}
}
