package com.mealapp.app.service.impl;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnitConverterServiceTest {

    @Mock
    private IngredientRepository ingredientRepository;

    @InjectMocks
    private UnitConverterServiceImpl unitConverterService;

    private Ingredient milk;
    private Ingredient flour;

    @BeforeEach
    void setUp() {
        milk = Ingredient.builder()
                .id(1L)
                .name("Süt")
                .density(1.03) // Sütün ortalama yoğunluğu
                .physicalState(Ingredient.PhysicalState.LIQUID)
                .build();

        flour = Ingredient.builder()
                .id(2L)
                .name("Un")
                .density(0.6) // Unun ortalama yoğunluğu
                .physicalState(Ingredient.PhysicalState.SOLID)
                .build();
    }

    @Test
    void testLitreToGramsForMilk() {
        Double amount = 1.0;
        String unit = "L";
        Double grams = unitConverterService.convertToGrams(amount, unit, milk);
        assertEquals(1030.0, grams, "1 Litre süt yaklaşık 1030 gram etmelidir");
    }

    @Test
    void testVolumeToGramsForFlour() {
        // 1 su bardağı un (200ml bazlı) * 0.6 density = 120g olmalı
        Double grams = unitConverterService.convertToGrams(1.0, "su bardağı", flour);
        assertEquals(120.0, grams, "1 su bardağı un yaklaşık 120 gram etmelidir (200ml * 0.6)");
    }

    @Test
    void testLitreAliases() {
        assertEquals(1000.0, unitConverterService.convertToGrams(1.0, "litre", null));
        assertEquals(1000.0, unitConverterService.convertToGrams(1.0, "liter", null));
        assertEquals(1000.0, unitConverterService.convertToGrams(1.0, "L", null));
        assertEquals(1000.0, unitConverterService.convertToGrams(1.0, "lt", null));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldIncludePreferredAndCustomUnitsInAllWeights() {
        // Mocking behavior for repository as UnitConverterServiceImpl uses it to fetch units
        com.mealapp.domain.recipe.entity.IngredientUnit customUnit = com.mealapp.domain.recipe.entity.IngredientUnit.builder()
                .unitName("baş")
                .grams(50.0)
                .build();

        Ingredient garlic = Ingredient.builder()
                .id(10L)
                .name("Sarımsak")
                .preferredUnit("diş")
                .physicalState(Ingredient.PhysicalState.SOLID)
                .density(1.0)
                .ingredientUnits(new java.util.ArrayList<>(List.of(customUnit)))
                .build();

        when(ingredientRepository.findByIdWithUnits(10L)).thenReturn(Optional.of(garlic));

        Map<String, Double> weights = unitConverterService.getAllUnitWeights(garlic);

        assertTrue(weights.containsKey("dis"), "Normalleştirilmiş 'diş' anahtarı bulunmalı");
        assertTrue(weights.containsKey("bas"), "Normalleştirilmiş 'baş' anahtarı bulunmalı");
        assertEquals(5.0, weights.get("dis"));
        assertEquals(50.0, weights.get("bas"));
    }
    @Test
    void testConvertUnits() {
        // 1 Litre süt -> ml (1000 ml olmalı)
        Double ml = unitConverterService.convertUnits(milk, 1.0, "L", "ml");
        assertEquals(1000.0, ml);

        // 1030 gram süt -> L (1.0 L olmalı çünkü 1030g / 1.03 density = 1000ml = 1.0L)
        Double liters = unitConverterService.convertUnits(milk, 1030.0, "g", "L");
        assertEquals(1.0, liters, 0.001);

        // 1 su bardağı un -> g (120g olmalı çünkü 200ml * 0.6 density = 120g)
        Double grams = unitConverterService.convertUnits(flour, 1.0, "su bardağı", "g");
        assertEquals(120.0, grams);
    }

    @Test
    void testBidirectionalConversionConsistency() {
        // 1. Senaryo: Sıvı (Süt, density: 1.03)
        // ml -> g -> ml
        Double initialMl = 250.0;
        Double gramsFromMl = unitConverterService.convertUnits(milk, initialMl, "ml", "g");
        // 250 * 1.03 = 257.5g
        assertEquals(257.5, gramsFromMl, 0.001);
        
        Double mlFromGrams = unitConverterService.convertUnits(milk, gramsFromMl, "g", "ml");
        // 257.5 / 1.03 = 250.0ml
        assertEquals(initialMl, mlFromGrams, 0.001);

        // 2. Senaryo: Toz/Katı (Un, density: 0.6)
        // g -> su bardağı -> g
        Double initialGrams = 300.0;
        Double glassFromGrams = unitConverterService.convertUnits(flour, initialGrams, "g", "su bardağı");
        // 300g / (200ml * 0.6) = 300 / 120 = 2.5 su bardağı
        assertEquals(2.5, glassFromGrams, 0.001);

        Double gramsFromGlass = unitConverterService.convertUnits(flour, glassFromGrams, "su bardağı", "g");
        // 2.5 * (200 * 0.6) = 2.5 * 120 = 300.0g
        assertEquals(initialGrams, gramsFromGlass, 0.001);
    }

    @Test
    void testTurkishCharacterAndAliasNormalization() {
        // "çay kaşığı", "Çay Kaşiği", "Cay Kasigi" hepsi aynı sonucu vermeli
        assertEquals(5.0, unitConverterService.convertToGrams(1.0, "çay kaşığı", null));
        assertEquals(5.0, unitConverterService.convertToGrams(1.0, "Çay Kaşiği", null));
        assertEquals(5.0, unitConverterService.convertToGrams(1.0, "Cay Kasigi", null));
        assertEquals(5.0, unitConverterService.convertToGrams(1.0, "cay kasigi", null));
        
        // Aliaslar (ck, yk, sb vb.)
        assertEquals(5.0, unitConverterService.convertToGrams(1.0, "ck", null));
        assertEquals(15.0, unitConverterService.convertToGrams(1.0, "yk", null));
        assertEquals(200.0, unitConverterService.convertToGrams(1.0, "sb", null));
        assertEquals(75.0, unitConverterService.convertToGrams(1.0, "kf", null));
        
        // Birleşik yazım aliasları
        assertEquals(5.0, unitConverterService.convertToGrams(1.0, "caykasigi", null));
        assertEquals(200.0, unitConverterService.convertToGrams(1.0, "subardagi", null));

        // Noktalama ve boşluk varyasyonları
        assertEquals(15.0, unitConverterService.convertToGrams(1.0, "y.k.", null));
        assertEquals(15.0, unitConverterService.convertToGrams(1.0, " yemek   kasigi ", null));
    }

    @Test
    void testReproductionTeaspoonMismatch() {
        // Karabiber (density 0.8) için 5 çay kaşığı girişi
        Ingredient blackPepper = Ingredient.builder()
                .id(3L)
                .name("Karabiber")
                .density(0.8) 
                .physicalState(Ingredient.PhysicalState.SOLID)
                .build();
        
        // 1. Backend Service Katmanı Testi: Aynı birimler arası dönüşüm
        Double result = unitConverterService.convertUnits(blackPepper, 5.0, "çay kaşığı", "çay kaşığı");
        assertEquals(5.0, result, "Aynı birim dönüşümü miktarı değiştirmemeli");

        // 2. Gram ağırlığı testi: 5 * 5g * 0.8 density = 20.0g olmalı
        Double grams = unitConverterService.convertToGrams(5.0, "çay kaşığı", blackPepper);
        assertEquals(20.0, grams, "5 çay kaşığı karabiber 20 gram etmeli (5 * 5 * 0.8)");

        // 3. getAllUnitWeights testi: çay kaşığı ağırlığı 5 * 0.8 = 4.0 olmalı
        // Mock repo because getAllUnitWeights calls it
        when(ingredientRepository.findByIdWithUnits(3L)).thenReturn(Optional.of(blackPepper));
        Map<String, Double> weights = unitConverterService.getAllUnitWeights(blackPepper);
        assertEquals(4.0, weights.get("cay kasigi"), 0.001);
    }

    @Test
    void shouldReturnCorrectWeightForCupsAndGlasses() {
        // Su bardağı = 200ml. Su yoğunluğu = 1.0 => 200g
        Double glassWeight = unitConverterService.getUnitGramWeight("su bardağı", null);
        assertEquals(200.0, glassWeight);

        // Kahve fincanı = 75ml. Süt yoğunluğu = 1.03 => 77.25g
        Ingredient milk = Ingredient.builder()
                .name("Süt")
                .density(1.03)
                .physicalState(Ingredient.PhysicalState.LIQUID)
                .build();
        Double fincanWeight = unitConverterService.getUnitGramWeight("kahve fincanı", milk);
        assertEquals(77.25, fincanWeight, 0.01);
    }
}
