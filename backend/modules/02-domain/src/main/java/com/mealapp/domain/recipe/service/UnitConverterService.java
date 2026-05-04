package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import java.util.Map;

public interface UnitConverterService {
    Double convertToGrams(Double amount, String unit, Ingredient ingredient);

    Double getUnitGramWeight(String unit, Ingredient ingredient);

    Map<String, Double> getAllUnitWeights(Ingredient ingredient);

    /**
     * Bir malzemeyi bir birimden diğerine dönüştürür.
     */
    Double convertUnits(Ingredient ingredient, Double amount, String fromUnit, String toUnit);
}