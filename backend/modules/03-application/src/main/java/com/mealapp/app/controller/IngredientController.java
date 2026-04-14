package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recipe.*;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.app.util.UnitConverter;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.service.IngredientService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;
    private final IngredientMapper ingredientMapper;

    @GetMapping
    public List<IngredientDTO> searchIngredients(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "12") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 25));
        return ingredientService.searchByName(query, safeLimit).stream()
                .map(ingredientMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}/conversions")
    public List<UnitConversionDTO> getConversions(
            @PathVariable Long id,
            @RequestParam Double amount,
            @RequestParam String unit
    ) {
        Ingredient ingredient = ingredientService.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found"));

        Double grams = UnitConverter.convertToGrams(amount, unit, ingredient);
        Map<String, Double> unitWeights = UnitConverter.getAllUnitWeights(ingredient);

        List<UnitConversionDTO> conversions = new ArrayList<>();
        
        unitWeights.forEach((targetUnit, weight) -> {
            if (weight > 0) {
                Double targetAmount = grams / weight;
                
                // Çok küçük veya çok büyük değerleri filtreleyelim
                if (targetAmount >= 0.01 && targetAmount <= 10000) {
                    conversions.add(UnitConversionDTO.builder()
                            .unit(targetUnit)
                            .amount(Math.round(targetAmount * 100.0) / 100.0) // 2 decimal precision
                            .displayName(formatUnitName(targetUnit))
                            .build());
                }
            }
        });

        // Önemli birimleri öne çıkaralım (ml, gram, adet vb.)
        return conversions.stream()
                .sorted(Comparator.comparing(c -> getUnitPriority(c.getUnit())))
                .collect(Collectors.toList());
    }

    private int getUnitPriority(String unit) {
        return switch (unit.toLowerCase()) {
            case "g", "gram" -> 1;
            case "ml" -> 2;
            case "adet", "unit", "piece" -> 3;
            case "bardak", "glass" -> 4;
            case "litre", "liter" -> 5;
            case "kg", "kilogram" -> 6;
            default -> 10;
        };
    }

    private String formatUnitName(String unit) {
        if (unit == null || unit.isEmpty()) return "";
        return unit.substring(0, 1).toUpperCase() + unit.substring(1);
    }
    @GetMapping("/conversions/standard")
    public List<UnitConversionDTO> getStandardConversions(
            @RequestParam Double amount,
            @RequestParam String unit
    ) {
        Double grams = UnitConverter.convertToGrams(amount, unit, null);
        Map<String, Double> unitWeights = UnitConverter.getAllUnitWeights(null);

        List<UnitConversionDTO> conversions = new ArrayList<>();
        
        unitWeights.forEach((targetUnit, weight) -> {
            if (weight > 0) {
                Double targetAmount = grams / weight;
                if (targetAmount >= 0.01 && targetAmount <= 10000) {
                    conversions.add(UnitConversionDTO.builder()
                            .unit(targetUnit)
                            .amount(Math.round(targetAmount * 100.0) / 100.0)
                            .displayName(formatUnitName(targetUnit))
                            .build());
                }
            }
        });

        return conversions.stream()
                .sorted(Comparator.comparing(c -> getUnitPriority(c.getUnit())))
                .collect(Collectors.toList());
    }

    @GetMapping("/units/weights")
    public Map<String, Double> getAllUnitWeights(@RequestParam(required = false) Long ingredientId) {
        Ingredient ingredient = null;
        if (ingredientId != null) {
            ingredient = ingredientService.findById(ingredientId).orElse(null);
        }
        return UnitConverter.getAllUnitWeights(ingredient);
    }
}
