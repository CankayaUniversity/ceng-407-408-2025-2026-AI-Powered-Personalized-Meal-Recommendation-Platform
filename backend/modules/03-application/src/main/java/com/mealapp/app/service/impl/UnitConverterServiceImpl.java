package com.mealapp.app.service.impl;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientUnit;
import com.mealapp.domain.recipe.service.UnitConverterService;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UnitConverterServiceImpl implements UnitConverterService {

    private final IngredientRepository ingredientRepository;

    private static final Map<String, Double> UNIT_TO_GRAMS = new HashMap<>();
    private static final List<String> VOLUME_UNITS = List.of(
        "ml", "litre", "liter", "l", "lt", "glass", "bardak", "su bardağı", "çay bardağı", "kahve fincanı",
        "tablespoon", "yemek kaşığı", "teaspoon", "tatlı kaşığı", "çay kaşığı", "cup", "bowl", "kase",
        "fincan", "kepçe", "kaşık"
    );

    static {
        // Fallback değerlerin (Map içeriği aynı kalarak aktarıldı)
        UNIT_TO_GRAMS.put("g", 1.0);
        UNIT_TO_GRAMS.put("gram", 1.0);
        UNIT_TO_GRAMS.put("kg", 1000.0);
        UNIT_TO_GRAMS.put("kilogram", 1000.0);
        UNIT_TO_GRAMS.put("slice", 30.0);
        UNIT_TO_GRAMS.put("dilim", 30.0);
        UNIT_TO_GRAMS.put("cup", 240.0);
        UNIT_TO_GRAMS.put("bowl", 350.0);
        UNIT_TO_GRAMS.put("kase", 350.0);
        UNIT_TO_GRAMS.put("piece", 50.0);
        UNIT_TO_GRAMS.put("adet", 50.0);
        UNIT_TO_GRAMS.put("tane", 50.0);
        UNIT_TO_GRAMS.put("unit", 50.0);
        UNIT_TO_GRAMS.put("ml", 1.0);
        UNIT_TO_GRAMS.put("l", 1000.0);
        UNIT_TO_GRAMS.put("lt", 1000.0);
        UNIT_TO_GRAMS.put("litre", 1000.0);
        UNIT_TO_GRAMS.put("liter", 1000.0);
        UNIT_TO_GRAMS.put("tablespoon", 15.0);
        UNIT_TO_GRAMS.put("yemek kaşığı", 15.0);
        UNIT_TO_GRAMS.put("teaspoon", 2.0);
        UNIT_TO_GRAMS.put("tatlı kaşığı", 6.0);
        UNIT_TO_GRAMS.put("çay kaşığı", 2.0);
        UNIT_TO_GRAMS.put("glass", 200.0);
        UNIT_TO_GRAMS.put("bardak", 200.0);
        UNIT_TO_GRAMS.put("su bardağı", 200.0);
        UNIT_TO_GRAMS.put("çay bardağı", 100.0);
        UNIT_TO_GRAMS.put("kahve fincanı", 75.0);
        UNIT_TO_GRAMS.put("fincan", 75.0);
        UNIT_TO_GRAMS.put("kepçe", 150.0);
        UNIT_TO_GRAMS.put("clove", 5.0);
        UNIT_TO_GRAMS.put("diş", 5.0);
        UNIT_TO_GRAMS.put("handful", 30.0);
        UNIT_TO_GRAMS.put("avuç", 30.0);
        UNIT_TO_GRAMS.put("pinch", 1.0);
        UNIT_TO_GRAMS.put("tutam", 1.0);
        UNIT_TO_GRAMS.put("paket", 100.0);
        UNIT_TO_GRAMS.put("demet", 100.0);
        UNIT_TO_GRAMS.put("kavanoz", 500.0);
        UNIT_TO_GRAMS.put("şişe", 500.0);
        UNIT_TO_GRAMS.put("dal", 5.0);
    }

    @Override
    public Double convertToGrams(Double amount, String unit, Ingredient ingredient) {
        if (amount == null) return 0.0;
        if (unit == null || unit.isEmpty()) return amount;

        String normalizedUnit = unit.toLowerCase().trim();
        Double weight = getUnitGramWeight(normalizedUnit, ingredient);

        return amount * weight;
    }

    @Override
    public Double getUnitGramWeight(String unit, Ingredient ingredient) {
        if (unit == null) return 0.0;

        String normalizedUnit = unit.toLowerCase().trim();

        // 1. ADIM: Veritabanı / Malzemeye özel birim kontrolü
        Double dbWeight = getWeightFromDatabase(normalizedUnit, ingredient);
        if (dbWeight != null) return dbWeight;

        // 2. ADIM: Standart birim kontrolü
        Double weight = UNIT_TO_GRAMS.get(normalizedUnit);

        // 3. ADIM: Yoğunluk uygulaması
        if (weight != null) {
            return applyDensityIfNecessary(normalizedUnit, weight, ingredient);
        }

        // 4. ADIM: Çoğul eki (s) fallback - Rekürsif çağrı yerine kontrollü geçiş
        if (normalizedUnit.endsWith("s")) {
            return getUnitGramWeight(normalizedUnit.substring(0, normalizedUnit.length() - 1), ingredient);
        }

        return 1.0; // Varsayılan
    }

    // Yardımcı Metot 1: DB Kontrolü
    private Double getWeightFromDatabase(String unit, Ingredient ingredient) {
        if (ingredient == null) return null;

        return ingredientRepository.findByIdWithUnits(ingredient.getId())
            .map(Ingredient::getIngredientUnits)
            .flatMap(units -> units.stream()
                .filter(iu -> iu.getUnitName().equalsIgnoreCase(unit))
                .map(IngredientUnit::getGrams)
                .findFirst())
            .orElse(null);
    }

    // Yardımcı Metot 2: Yoğunluk Kontrolü
    private Double applyDensityIfNecessary(String unit, Double weight, Ingredient ingredient) {
        if (ingredient != null && isVolumeUnit(unit)) {
            // "ml" ve "L" birimleri saf hacimdir ve her zaman yoğunlukla çarpılmalıdır (yoğunluk != 1 ise)
            // Diğer hacim birimleri (kaşık, bardak vb.) de yoğunluktan etkilenir.
            Double density = ingredient.getDensity();
            if (density != null && density != 1.0) {
                return weight * density;
            }
        }
        return weight;
    }

    @Override
    public Map<String, Double> getAllUnitWeights(Ingredient ingredient) {
        Map<String, Double> allWeights = new HashMap<>(UNIT_TO_GRAMS);

        if (ingredient != null) {
            Ingredient detailed = ingredientRepository.findByIdWithUnits(ingredient.getId()).orElse(ingredient);
            // Özel birimleri ekle/ez
            if (detailed.getIngredientUnits() != null) {
                detailed.getIngredientUnits().forEach(iu ->
                    allWeights.put(iu.getUnitName().toLowerCase().trim(), iu.getGrams()));
            }
            // Yoğunluğu uygula
            if (detailed.getDensity() != null && detailed.getDensity() != 1.0) {
                VOLUME_UNITS.forEach(v -> allWeights.computeIfPresent(v, (k, val) -> val * detailed.getDensity()));
            }
        }
        return allWeights;
    }

    @Override
    public Double convertUnits(Ingredient ingredient, Double amount, String fromUnit, String toUnit) {
        if (amount == null || amount == 0) return 0.0;
        if (fromUnit == null || toUnit == null || fromUnit.equalsIgnoreCase(toUnit)) return amount;

        Double fromWeight = getUnitGramWeight(fromUnit, ingredient);
        Double toWeight = getUnitGramWeight(toUnit, ingredient);

        if (toWeight == null || toWeight == 0) return amount; // Güvenlik önlemi

        return (amount * fromWeight) / toWeight;
    }

    private boolean isVolumeUnit(String unit) {
        return VOLUME_UNITS.contains(unit);
    }
}