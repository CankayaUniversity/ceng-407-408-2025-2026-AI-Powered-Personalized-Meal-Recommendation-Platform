package com.mealapp.app.util;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientUnit;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Mutfak ölçü birimlerini gram cinsine dönüştürmek için standartlaştırılmış yardımcı sınıf.
 */
public class UnitConverter {

    private static final Map<String, Double> UNIT_TO_GRAMS = new HashMap<>();

    static {
        // Standart birimler
        UNIT_TO_GRAMS.put("g", 1.0);
        UNIT_TO_GRAMS.put("gram", 1.0);
        UNIT_TO_GRAMS.put("kg", 1000.0);
        UNIT_TO_GRAMS.put("kilogram", 1000.0);
        
        // Porsiyon bazlı birimler (Ortalama değerler - Fallback olarak kullanılır)
        UNIT_TO_GRAMS.put("slice", 30.0);       // Dilim (Örn: Ekmek)
        UNIT_TO_GRAMS.put("cup", 240.0);        // Su bardağı
        UNIT_TO_GRAMS.put("bowl", 350.0);       // Kase
        UNIT_TO_GRAMS.put("piece", 50.0);       // Adet/Tane
        UNIT_TO_GRAMS.put("adet", 50.0);        // Adet
        UNIT_TO_GRAMS.put("tane", 50.0);        // Tane
        UNIT_TO_GRAMS.put("unit", 50.0);        // Adet/Birim
        UNIT_TO_GRAMS.put("packet", 500.0);     // Paket (Ortalama 500g)
        UNIT_TO_GRAMS.put("paket", 500.0);      // Paket (Ortalama 500g)
        UNIT_TO_GRAMS.put("package", 500.0);    // Paket
        UNIT_TO_GRAMS.put("ml", 1.0);           // Mililitre (Su yoğunluğu baz alınarak 1g)
        UNIT_TO_GRAMS.put("litre", 1000.0);     // Litre
        UNIT_TO_GRAMS.put("liter", 1000.0);     // Liter
        UNIT_TO_GRAMS.put("tablespoon", 15.0);  // Yemek kaşığı
        UNIT_TO_GRAMS.put("teaspoon", 5.0);     // Tatlı/Çay kaşığı
        UNIT_TO_GRAMS.put("clove", 5.0);        // Diş (Örn: Sarımsak)
        UNIT_TO_GRAMS.put("handful", 30.0);     // Avuç
        UNIT_TO_GRAMS.put("pinch", 1.0);        // Tutam
    }

    /**
     * Verilen miktar ve birimi gram cinsine dönüştürür.
     * Malzeme bazlı özel birim varsa (Örn: Domates adet -> 150g) onu kullanır.
     *
     * @param amount Miktar
     * @param unit Birim (slice, cup, gram, vb.)
     * @param ingredient Malzeme bağlamı (İsteğe bağlı)
     * @return Gram cinsinden karşılığı
     */
    public static Double convertToGrams(Double amount, String unit, Ingredient ingredient) {
        if (amount == null) return 0.0;
        if (unit == null || unit.isEmpty()) return amount;

        String normalizedUnit = unit.toLowerCase().trim();
        
        // 1. Önce malzemeye özel birim var mı bakalım
        if (ingredient != null && ingredient.getIngredientUnits() != null) {
            for (IngredientUnit iu : ingredient.getIngredientUnits()) {
                if (iu.getUnitName().equalsIgnoreCase(normalizedUnit)) {
                    return amount * iu.getGrams();
                }
            }
        }

        // 2. Yoksa standart birim katsayısını kullanalım
        Double multiplier = UNIT_TO_GRAMS.getOrDefault(normalizedUnit, 1.0);

        // Sıvı birimler (ml, litre) için malzeme yoğunluğunu uygulayalım
        if (ingredient != null && (normalizedUnit.equals("ml") || normalizedUnit.equals("litre") || normalizedUnit.equals("liter"))) {
            multiplier *= ingredient.getDensity();
        }
        
        // Çoğul eklerini temizleyip tekrar kontrol edelim (slices -> slice)
        if (multiplier == 1.0 && normalizedUnit.endsWith("s")) {
            String singularUnit = normalizedUnit.substring(0, normalizedUnit.length() - 1);
            
            // Tekil hali için malzemeye özel kontrol
            if (ingredient != null && ingredient.getIngredientUnits() != null) {
                for (IngredientUnit iu : ingredient.getIngredientUnits()) {
                    if (iu.getUnitName().equalsIgnoreCase(singularUnit)) {
                        return amount * iu.getGrams();
                    }
                }
            }
            
            multiplier = UNIT_TO_GRAMS.getOrDefault(singularUnit, 1.0);
        }

        return amount * multiplier;
    }

    /**
     * Geriye uyumluluk için eski metot imzası.
     */
    public static Double convertToGrams(Double amount, String unit) {
        return convertToGrams(amount, unit, null);
    }

    /**
     * Bir birimin kaç gram kabul edildiğini döner.
     * Malzeme bazlı özel birim varsa onu döner.
     */
    public static Double getUnitGramWeight(String unit, Ingredient ingredient) {
        if (unit == null) return 0.0;
        String normalizedUnit = unit.toLowerCase().trim();

        // Malzemeye özel kontrol
        if (ingredient != null && ingredient.getIngredientUnits() != null) {
            for (IngredientUnit iu : ingredient.getIngredientUnits()) {
                if (iu.getUnitName().equalsIgnoreCase(normalizedUnit)) {
                    return iu.getGrams();
                }
            }
        }

        Double weight = UNIT_TO_GRAMS.get(normalizedUnit);

        // Sıvı birimler için yoğunluk katsayısını uygula
        if (weight != null && ingredient != null && (normalizedUnit.equals("ml") || normalizedUnit.equals("litre") || normalizedUnit.equals("liter"))) {
            weight *= ingredient.getDensity();
        }

        if (weight == null && normalizedUnit.endsWith("s")) {
            String singularUnit = normalizedUnit.substring(0, normalizedUnit.length() - 1);
            
            // Tekil hali için malzemeye özel kontrol
            if (ingredient != null && ingredient.getIngredientUnits() != null) {
                for (IngredientUnit iu : ingredient.getIngredientUnits()) {
                    if (iu.getUnitName().equalsIgnoreCase(singularUnit)) {
                        return iu.getGrams();
                    }
                }
            }
            
            weight = UNIT_TO_GRAMS.get(singularUnit);
        }
        return weight != null ? weight : 0.0;
    }

    /**
     * Geriye uyumluluk için eski metot imzası.
     */
    public static Double getUnitGramWeight(String unit) {
        return getUnitGramWeight(unit, null);
    }

    /**
     * Tüm desteklenen birimleri ve gram karşılıklarını döner.
     * Eğer malzeme verilirse, o malzemeye özel olanları da ekler.
     * Eğer malzeme bazlı özel birim yoksa sadece standart kütle birimlerini (g, kg, ml, l) döner.
     */
    public static Map<String, Double> getAllUnitWeights(Ingredient ingredient) {
        // Eğer malzeme verilmişse ve özel birimleri varsa hepsini dön
        if (ingredient != null && ingredient.getIngredientUnits() != null && !ingredient.getIngredientUnits().isEmpty()) {
            Map<String, Double> allWeights = new HashMap<>(UNIT_TO_GRAMS);
            for (IngredientUnit iu : ingredient.getIngredientUnits()) {
                allWeights.put(iu.getUnitName(), iu.getGrams());
            }
            return allWeights;
        }

        // Eğer malzeme bazlı özel birim yoksa, sadece "standart kütle/hacim" birimlerini dönelim
        // Bu sayede UI'da bowl, slice gibi belirsiz birimler kısıtlanır.
        Map<String, Double> restrictedWeights = new HashMap<>();
        restrictedWeights.put("g", 1.0);
        restrictedWeights.put("gram", 1.0);
        restrictedWeights.put("kg", 1000.0);
        restrictedWeights.put("kilogram", 1000.0);
        restrictedWeights.put("ml", 1.0);
        restrictedWeights.put("litre", 1000.0);
        restrictedWeights.put("liter", 1000.0);
        
        return restrictedWeights;
    }

    /**
     * Geriye uyumluluk için eski metot imzası.
     */
    public static Map<String, Double> getAllUnitWeights() {
        return getAllUnitWeights(null);
    }
}
