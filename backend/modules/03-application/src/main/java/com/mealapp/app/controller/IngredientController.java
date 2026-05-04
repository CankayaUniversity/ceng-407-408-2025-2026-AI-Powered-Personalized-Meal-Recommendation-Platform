package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recipe.*;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.service.IngredientService;
import com.mealapp.domain.recipe.service.UnitConverterService;
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
    private final UnitConverterService unitConverterService;

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
        Ingredient ingredient = ingredientService.findByIdWithUnits(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found"));

        Double grams = unitConverterService.convertToGrams(amount, unit, ingredient);
        Map<String, Double> unitWeights = unitConverterService.getAllUnitWeights(ingredient);

        Map<String, List<String>> unitGroups = new java.util.HashMap<>();
        unitGroups.put("g", List.of("g", "gram", "grams", "gr"));
        unitGroups.put("kg", List.of("kg", "kilogram", "kilograms"));
        unitGroups.put("ml", List.of("ml", "millilitre", "milliliter"));
        unitGroups.put("L", List.of("l", "lt", "litre", "liter"));
        unitGroups.put("Adet", List.of("adet", "piece", "pieces", "unit", "units", "tane"));
        unitGroups.put("Su Bardağı", List.of("su bardağı", "bardak", "glass", "glasses"));
        unitGroups.put("Yemek Kaşığı", List.of("yemek kaşığı", "tablespoon", "tablespoons"));
        unitGroups.put("Tatlı Kaşığı", List.of("tatlı kaşığı", "teaspoon", "teaspoons"));
        unitGroups.put("Diş", List.of("diş", "clove", "cloves"));
        unitGroups.put("Demet", List.of("demet", "bunch", "bunches"));
        unitGroups.put("Dal", List.of("dal", "sprig", "sprigs"));
        unitGroups.put("Tutam", List.of("tutam", "pinch", "pinches"));

        List<UnitConversionDTO> conversions = new ArrayList<>();
        
        // Hızlı seçim deduplication için grupları takip edelim
        java.util.Set<String> processedGroups = new java.util.HashSet<>();

        unitWeights.forEach((targetUnit, weight) -> {
            if (weight > 0) {
                String lowerTarget = targetUnit.toLowerCase();
                
                // Hangi gruba ait olduğunu bul
                String groupKey = unitGroups.entrySet().stream()
                        .filter(e -> e.getValue().contains(lowerTarget))
                        .map(Map.Entry::getKey)
                        .findFirst()
                        .orElse(targetUnit);

                // Filtreleme mantığı:
                // 1. Tercih edilen birim ise her zaman göster
                // 2. Malzemeye özel tanımlanmış bir birimse her zaman göster
                // 3. Değilse fiziksel duruma göre filtrele
                boolean isPreferred = ingredient.getPreferredUnit() != null && 
                                     targetUnit.equalsIgnoreCase(ingredient.getPreferredUnit());
                
                boolean isCustom = ingredient.getIngredientUnits() != null && 
                                  ingredient.getIngredientUnits().stream()
                                          .anyMatch(iu -> iu.getUnitName().equalsIgnoreCase(targetUnit));

                if (!isPreferred && !isCustom && !isUnitCompatibleWithState(targetUnit, ingredient.getPhysicalState())) {
                    return;
                }

                // Giriş birimi ile aynı olan birimi dönüşümlerde gösterme
                if (targetUnit.equalsIgnoreCase(unit)) {
                    return;
                }

                Double targetAmount = grams / weight;
                
                // Çok küçük veya çok büyük değerleri filtreleyelim
                if (targetAmount >= 0.01 && targetAmount <= 10000) {
                    boolean isHighPriority = isHighPriorityUnit(targetUnit, ingredient, isPreferred, isCustom);
                    
                    // Eğer bu grup zaten yüksek öncelikli olarak işlendiyse, bu varyasyonu yüksek öncelikli yapma
                    if (isHighPriority) {
                        if (processedGroups.contains(groupKey)) {
                            isHighPriority = false;
                        } else {
                            processedGroups.add(groupKey);
                        }
                    }

                    conversions.add(UnitConversionDTO.builder()
                            .unit(targetUnit)
                            .amount(Math.round(targetAmount * 100.0) / 100.0) // 2 decimal precision
                            .displayName(formatUnitName(targetUnit))
                            .highPriority(isHighPriority)
                            .build());
                }
            }
        });

        // Tercih edilen ve standart birimleri öne çıkaralım
        List<UnitConversionDTO> sortedConversions = conversions.stream()
                .sorted(Comparator.comparing((UnitConversionDTO c) -> getUnitPriority(c.getUnit(), ingredient)))
                .collect(Collectors.toList());

        // Hızlı seçim için sınırlandırma: En fazla 6 yüksek öncelikli birim
        int highPriorityCount = 0;
        for (UnitConversionDTO conv : sortedConversions) {
            if (conv.isHighPriority()) {
                if (highPriorityCount >= 6) {
                    conv.setHighPriority(false);
                } else {
                    highPriorityCount++;
                }
            }
        }

        // Eğer hiç yüksek öncelikli yoksa (olmaz ama güvenlik), en azından birincisini yapalım
        if (highPriorityCount == 0 && !sortedConversions.isEmpty()) {
            sortedConversions.get(0).setHighPriority(true);
        }

        return sortedConversions;
    }

    private boolean isHighPriorityUnit(String unit, Ingredient ingredient, boolean isPreferred, boolean isCustom) {
        if (isPreferred || isCustom) return true;
        
        String lowerUnit = unit.toLowerCase();
        Ingredient.Category category = ingredient.getCategory();
        Ingredient.PhysicalState state = ingredient.getPhysicalState();

        // 1. İçecekler ve Sıvı Süt Ürünleri
        if (category == Ingredient.Category.BEVERAGE || 
           (category == Ingredient.Category.DAIRY && state == Ingredient.PhysicalState.LIQUID)) {
            return List.of("ml", "l", "lt", "litre", "su bardağı", "bardak", "glass").contains(lowerUnit);
        }

        // 2. Soslar ve Yağlar
        if (category == Ingredient.Category.SAUCE || category == Ingredient.Category.OIL) {
            return List.of("ml", "l", "lt", "yemek kaşığı", "tablespoon", "su bardağı", "bardak").contains(lowerUnit);
        }

        // 3. Baharatlar ve Tatlandırıcılar
        if (category == Ingredient.Category.SPICE || category == Ingredient.Category.SWEETENER) {
            return List.of("g", "gram", "çay kaşığı", "teaspoon", "tatlı kaşığı", "tutam", "pinch").contains(lowerUnit);
        }

        // 4. Yumurta
        if (category == Ingredient.Category.EGG) {
            return List.of("adet", "piece", "unit", "tane").contains(lowerUnit);
        }

        // 5. Kuruyemişler ve Atıştırmalıklar
        if (category == Ingredient.Category.NUT) {
            return List.of("g", "gram", "avuç", "handful", "kase", "bowl", "adet").contains(lowerUnit);
        }

        // 6. Tahıllar ve Baklagiller
        if (category == Ingredient.Category.GRAIN || category == Ingredient.Category.LEGUME) {
            return List.of("g", "gram", "kg", "su bardağı", "bardak").contains(lowerUnit);
        }

        // 7. Genel Sıvı Filtresi (Yukarıdakilere girmeyen sıvı durumlar için)
        if (state == Ingredient.PhysicalState.LIQUID) {
            return List.of("ml", "l", "lt", "litre").contains(lowerUnit);
        }
        
        // 8. Genel Katı Filtresi
        if (lowerUnit.equals("g") || lowerUnit.equals("gram") || lowerUnit.equals("kg") || lowerUnit.equals("kilogram")) {
            return true;
        }

        return false;
    }

    private boolean isUnitCompatibleWithState(String unit, Ingredient.PhysicalState state) {
        if (state == null || state == Ingredient.PhysicalState.SEMI_SOLID) return true;
        
        String lowerUnit = unit.toLowerCase();
        boolean isVolume = isVolumeUnit(unit);
        
        if (state == Ingredient.PhysicalState.LIQUID) {
            // Sıvılar için: "adet", "diş", "demet", "dilim", "dal", "baş" gibi birimler uygun değildir
            if (List.of("adet", "piece", "unit", "tane", "diş", "clove", "demet", "bunch", "dal", "tutam", "pinch", "baş", "avuç", "handful").contains(lowerUnit)) {
                return false;
            }
            return isVolume || isMassUnit(unit);
        } else {
            // Katılar için saf hacim (ml/litre) pek anlamlı değil
            if (isPureVolumeUnit(unit)) {
                return false;
            }
            return true;
        }
    }

    private boolean isVolumeUnit(String unit) {
        return List.of("ml", "litre", "liter", "l", "lt", "glass", "bardak", "su bardağı", "çay bardağı", "kahve fincanı",
                "tablespoon", "yemek kaşığı", "teaspoon", "tatlı kaşığı", "çay kaşığı", "cup", "bowl", "kase",
                "fincan", "kepçe", "kaşık", "dal", "demet", "diş", "clove", "tutam", "pinch", "avuç", "handful").contains(unit.toLowerCase());
    }

    private boolean isPureVolumeUnit(String unit) {
        return List.of("ml", "litre", "liter", "l", "lt").contains(unit.toLowerCase());
    }

    private boolean isMassUnit(String unit) {
        return List.of("g", "gram", "kg", "kilogram").contains(unit.toLowerCase());
    }

    private int getUnitPriority(String unit, Ingredient ingredient) {
        String normalizedUnit = unit.toLowerCase();
        String preferredUnit = ingredient != null ? ingredient.getPreferredUnit() : null;
        Ingredient.Category category = ingredient != null ? ingredient.getCategory() : null;

        if (preferredUnit != null && normalizedUnit.equals(preferredUnit.toLowerCase())) {
            return 0; // En yüksek öncelik
        }

        // Kategori bazlı ince ayar
        if (category != null) {
            if (category == Ingredient.Category.SPICE || category == Ingredient.Category.SWEETENER) {
                if (normalizedUnit.equals("çay kaşığı") || normalizedUnit.equals("teaspoon")) return 1;
                if (normalizedUnit.equals("tatlı kaşığı")) return 2;
                if (normalizedUnit.equals("g") || normalizedUnit.equals("gram")) return 3;
            }
            if (category == Ingredient.Category.OIL || category == Ingredient.Category.SAUCE) {
                if (normalizedUnit.equals("yemek kaşığı") || normalizedUnit.equals("tablespoon")) return 1;
                if (normalizedUnit.equals("ml")) return 2;
                if (normalizedUnit.equals("su bardağı") || normalizedUnit.equals("bardak")) return 3;
            }
            if (category == Ingredient.Category.EGG) {
                if (List.of("adet", "piece", "unit", "tane").contains(normalizedUnit)) return 1;
            }
        }
        
        return switch (normalizedUnit) {
            case "g", "gram" -> 5;
            case "ml" -> 6;
            case "su bardağı", "bardak", "glass" -> 7;
            case "adet", "unit", "piece", "tane" -> 8;
            case "l", "lt", "litre", "liter" -> 9;
            case "yemek kaşığı", "tablespoon", "kaşık" -> 10;
            case "diş", "clove" -> 11;
            case "tatlı kaşığı" -> 12;
            case "çay kaşığı", "teaspoon" -> 13;
            case "fincan", "kahve fincanı", "kepçe" -> 14;
            case "tutam", "pinch", "dal", "demet" -> 15;
            case "kase", "bowl", "avuç", "handful" -> 16;
            case "kg", "kilogram" -> 17;
            default -> 20;
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
        Double grams = unitConverterService.convertToGrams(amount, unit, null);
        Map<String, Double> unitWeights = unitConverterService.getAllUnitWeights(null);

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
                .sorted(Comparator.comparing(c -> getUnitPriority(c.getUnit(), null)))
                .collect(Collectors.toList());
    }

    @GetMapping("/units/weights")
    public Map<String, Double> getAllUnitWeights(@RequestParam(required = false) Long ingredientId) {
        Ingredient ingredient = null;
        if (ingredientId != null) {
            ingredient = ingredientService.findByIdWithUnits(ingredientId).orElse(null);
        }
        return unitConverterService.getAllUnitWeights(ingredient);
    }
}
