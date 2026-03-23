package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Malzeme eşleşme skorunu (Match Score) hesaplayan domain servisi.
 */
@Service
public class IngredientMatchService {

    /**
     * Tarifin envanterdeki malzemelerle eşleşme oranını hesaplar.
     * Skor 0.0 ile 1.0 arasındadır.
     * Miktar kontrolü (quantity check) eklenmiştir: 
     * - Malzeme envanterde yoksa -> 0 puan
     * - Malzeme envanterde var ama miktar yetersizse -> Kısmi puan (mevcut/gereken * 0.5)
     * - Malzeme envanterde var ve miktar yeterliyse -> Tam puan (1.0)
     */
    public double calculateMatchScore(Recipe recipe, List<Inventory> inventory) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            return 0.0;
        }

        java.util.Map<Long, Inventory> inventoryMap = inventory.stream()
                .collect(java.util.stream.Collectors.toMap(
                        inv -> inv.getIngredient().getId(),
                        inv -> inv,
                        (existing, replacement) -> existing
                ));

        double totalScore = 0.0;
        for (RecipeIngredient ri : recipe.getRecipeIngredients()) {
            Inventory inv = inventoryMap.get(ri.getIngredient().getId());
            if (inv != null) {
                if (inv.getQuantity() != null && inv.getQuantity() >= ri.getGrams()) {
                    totalScore += 1.0;
                } else if (inv.getQuantity() != null) {
                    // Miktar yetersizse kısmi puan ver (maksimum 0.5)
                    totalScore += (inv.getQuantity() / ri.getGrams()) * 0.5;
                }
            }
        }

        return totalScore / recipe.getRecipeIngredients().size();
    }
}
