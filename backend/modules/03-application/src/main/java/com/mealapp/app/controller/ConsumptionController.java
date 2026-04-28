package com.mealapp.app.controller;

import com.mealapp.app.model.dto.consumption.ConsumptionAnalysisResponse;
import com.mealapp.app.model.dto.consumption.ConsumptionRequest;
import com.mealapp.app.model.dto.consumption.ConsumptionResponse;
import com.mealapp.app.model.dto.consumption.ConsumptionSummaryResponse;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.service.IngredientService;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.recipe.service.UnitConverterService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.stream.Collectors;

/**
 * Günlük tüketim (yemek) kayıtlarını yöneten uç noktalar.
 * Not: Dışarıda yenen öğünlerde estimatedCalories alanı AI tarafından daha sonra doldurulacaktır.
 */
@RestController
@RequestMapping("/api/v1/consumptions")
@RequiredArgsConstructor
public class ConsumptionController {

    private static final String INVALID_DATE_RANGE_MESSAGE = "Başlangıç tarihi bitiş tarihinden sonra olamaz.";

    private final DailyConsumptionService dailyConsumptionService;
    private final UserService userService;
    private final RecipeService recipeService;
    private final IngredientService ingredientService;
    private final InventoryService inventoryService;
    private final UnitConverterService unitConverterService;
    /**
     * Belirli bir tarih aralığı için tüketim analizi ve hedeften sapma raporu döner.
     */
    @GetMapping("/analysis")
    public ConsumptionAnalysisResponse getAnalysis(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "WEEKLY") String period
    ) {
        String userId = requireAuthenticatedUserId(jwt, null);
        User user = userService.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        DateRange dateRange = resolveAnalysisDateRange(startDate, endDate, period);
        LocalDate start = dateRange.start();
        LocalDate end = dateRange.end();

        List<DailyConsumption> logs = dailyConsumptionService.getConsumptionsBetween(userId, start, end);
        Map<LocalDate, DailyConsumptionService.DailyNutritionSummary> dailySummaries = 
                dailyConsumptionService.groupConsumptionsByDate(logs);

        List<ConsumptionAnalysisResponse.DailyDetail> details = new ArrayList<>();
        int totalCal = 0;
        double totalPro = 0, totalCarb = 0, totalFat = 0;
        int targetCal = user.getDailyCalorieTarget() != null ? user.getDailyCalorieTarget() : 2000;

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            DailyConsumptionService.DailyNutritionSummary daySum = dailySummaries.get(date);
            int consumed = daySum != null ? daySum.totalCalories() : 0;
            
            details.add(ConsumptionAnalysisResponse.DailyDetail.builder()
                    .date(date)
                    .consumedCalories(consumed)
                    .targetCalories(targetCal)
                    .deviation(consumed - targetCal)
                    .protein(daySum != null ? daySum.totalProtein() : 0.0)
                    .carbs(daySum != null ? daySum.totalCarbs() : 0.0)
                    .fat(daySum != null ? daySum.totalFat() : 0.0)
                    .build());

            if (daySum != null) {
                totalCal += daySum.totalCalories();
                totalPro += daySum.totalProtein();
                totalCarb += daySum.totalCarbs();
                totalFat += daySum.totalFat();
            }
        }

        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
        
        return ConsumptionAnalysisResponse.builder()
                .startDate(start)
                .endDate(end)
                .period(period)
                .dailyDetails(details)
                .totals(ConsumptionAnalysisResponse.Summary.builder()
                        .calories(totalCal)
                        .protein(totalPro)
                        .carbs(totalCarb)
                        .fat(totalFat)
                        .build())
                .averages(ConsumptionAnalysisResponse.Summary.builder()
                        .calories((int) (totalCal / days))
                        .protein(totalPro / days)
                        .carbs(totalCarb / days)
                        .fat(totalFat / days)
                        .build())
                .build();
    }

    /**
     * Geçmiş tüketim kayıtlarını detaylı liste halinde döner.
     */
    @GetMapping("/history")
    public List<ConsumptionResponse> getHistory(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        String userId = requireAuthenticatedUserId(jwt, null);
        DateRange dateRange = resolveHistoryDateRange(startDate, endDate);
        LocalDate start = dateRange.start();
        LocalDate end = dateRange.end();

        return dailyConsumptionService.getConsumptionsBetween(userId, start, end).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Belirli bir gün için toplam kalori ve makro özetini döner.
     */
    @GetMapping("/summary")
    public ConsumptionSummaryResponse getSummary(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        String userId = requireAuthenticatedUserId(jwt, null);
        LocalDate requestedDate = date != null ? date : LocalDate.now();
        DailyConsumptionService.DailyNutritionSummary summary =
                dailyConsumptionService.getDailyNutritionSummary(userId, requestedDate);

        ConsumptionSummaryResponse response = new ConsumptionSummaryResponse();
        response.setDate(requestedDate);
        response.setTotalCalories(summary.totalCalories());
        response.setTotalMeals(summary.totalMeals());
        response.setTotalProtein(summary.totalProtein());
        response.setTotalCarbs(summary.totalCarbs());
        response.setTotalFat(summary.totalFat());
        return response;
    }

    /**
     * Sistemdeki tüm porsiyon birimlerini ve gram karşılıklarını döner (UI için).
     * Eğer ingredientId verilirse, o malzemeye özel birimleri de ekler.
     */
    @GetMapping("/units")
    @Transactional(readOnly = true)
    public java.util.Map<String, Double> getStandardUnits(@RequestParam(required = false) Long ingredientId) {
        Ingredient ingredient = null;
        if (ingredientId != null) {
            ingredient = ingredientService.findByIdWithUnits(ingredientId).orElse(null);
        }
        return unitConverterService.getAllUnitWeights(ingredient);
    }

    /**
     * Bir miktar ve birimi gram cinsine dönüştürür.
     */
    @GetMapping("/convert")
    @Transactional(readOnly = true)
    public Double convertToGrams(
            @RequestParam Double amount, 
            @RequestParam String unit,
            @RequestParam(required = false) Long ingredientId
    ) {
        Ingredient ingredient = null;
        if (ingredientId != null) {
            ingredient = ingredientService.findByIdWithUnits(ingredientId).orElse(null);
        }
        return unitConverterService.convertToGrams(amount, unit, ingredient);
    }

    /**
     * Günlük tüketim kaydı oluşturur.
     * Toplu üye girişlerinde tüm kayıtlar tek atomik transaction içinde işlenir;
     * herhangi bir üyede hata oluşursa tüm kayıtlar geri alınır.
     */
    @PostMapping
    @Transactional
    public ConsumptionResponse log(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ConsumptionRequest request) {
        String authenticatedUserId = requireAuthenticatedUserId(jwt, request.getUserId());
        
        if (request.getRecipeId() != null && request.getIngredientId() != null) {
            throw new MealAppDomainException("Aynı kayıtta hem tarif hem de malzeme seçilemez.");
        }

        Recipe recipe = null;
        if (request.getRecipeId() != null) {
            recipe = recipeService.findById(request.getRecipeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tarif bulunamadı ID: " + request.getRecipeId()));
        }

        Ingredient ingredient = null;
        if (request.getIngredientId() != null) {
            ingredient = ingredientService.findByIdWithUnits(request.getIngredientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Malzeme bulunamadı ID: " + request.getIngredientId()));
        }

        InventoryGroup inventoryGroup = null;
        if (request.getInventoryGroupId() != null) {
            inventoryGroup = inventoryService.getUserInventoryGroup(authenticatedUserId, request.getInventoryGroupId());
        }

        // Eğer birden fazla üye için giriş yapılıyorsa
        if (request.getMembers() != null && !request.getMembers().isEmpty()) {
            DailyConsumption mainUserSaved = null;
            for (ConsumptionRequest.MemberConsumption member : request.getMembers()) {
                if (member.getUserId() == null || member.getUserId().isBlank()) {
                    continue;
                }

                User user = userService.findById(member.getUserId())
                        .orElseGet(() -> userService.save(User.builder().id(member.getUserId()).build()));
                
                // Üye özelinde farklı bir yemek seçilmiş olabilir
                Recipe memberRecipe = null;
                if (member.getRecipeId() != null) {
                    memberRecipe = recipeService.findById(member.getRecipeId())
                            .orElseThrow(() -> new ResourceNotFoundException("Üye tarifi bulunamadı ID: " + member.getRecipeId()));
                } else if (recipe != null) {
                    memberRecipe = recipe;
                }

                Ingredient memberIngredient = null;
                if (member.getIngredientId() != null) {
                    memberIngredient = ingredientService.findByIdWithUnits(member.getIngredientId())
                            .orElseThrow(() -> new ResourceNotFoundException("Üye malzemesi bulunamadı ID: " + member.getIngredientId()));
                } else if (ingredient != null) {
                    memberIngredient = ingredient;
                }

                String memberFoodName = member.getFoodName();
                if (memberFoodName == null || memberFoodName.isBlank()) {
                    memberFoodName = resolveFoodName(request, memberRecipe, memberIngredient);
                }

                Double grams = member.getPortionGrams();
                if (grams == null && member.getPortionLabel() != null) {
                    grams = parseGramsFromLabel(member.getPortionLabel(), memberIngredient);
                }

                DailyConsumption entity = DailyConsumption.builder()
                        .user(user)
                        .foodName(memberFoodName)
                        .recipe(memberRecipe)
                        .ingredient(memberIngredient)
                        .mealType(request.getMealType())
                        .portionSize(resolvePortionSize(request, grams))
                        .portionLabel(member.getPortionLabel() != null ? member.getPortionLabel() : request.getPortionLabel())
                        .portionMultiplier(member.getPortionMultiplier() != null ? member.getPortionMultiplier() : (request.getPortionMultiplier() != null ? request.getPortionMultiplier() : 1.0))
                        .portionGrams(grams)
                        .isCustomEntry(Boolean.TRUE.equals(request.getIsCustomEntry()) || (memberRecipe == null && memberIngredient == null))
                        .isFromInventory(inventoryGroup != null && isUserInGroup(user, inventoryGroup))
                        .inventoryGroup(inventoryGroup != null && isUserInGroup(user, inventoryGroup) ? inventoryGroup : null)
                        .build();

                // Her üye kendi tükettiği miktarı stoktan düşer.
                boolean shouldDeduct = entity.getIsFromInventory();
                DailyConsumption saved = dailyConsumptionService.logConsumption(entity, shouldDeduct);

                if (user.getId().equals(authenticatedUserId)) {
                    mainUserSaved = saved;
                }
            }
            
            if (mainUserSaved == null) {
                // Eğer ana kullanıcı listede yoksa, ama members listesi işlendiyse, 
                // bir 200 OK dönebiliriz (tüm üyeler işlendi) ancak metod ConsumptionResponse beklediği için 
                // işlenen ilk üyenin sonucunu veya sanal bir özet dönebiliriz. 
                // Front-end'in kafası karışmaması için boş bir response yerine success döneceğiz.
                User authUser = userService.findById(authenticatedUserId)
                    .orElseGet(() -> userService.save(User.builder().id(authenticatedUserId).build()));
                    
                return mapToResponse(DailyConsumption.builder()
                    .user(authUser)
                    .foodName("Grup Tüketimi")
                    .mealType(request.getMealType())
                    .build());
            }
            return mapToResponse(mainUserSaved);
        }

        // Tekil kullanıcı girişi (Geriye dönük uyumluluk)
        User user = userService.findById(authenticatedUserId)
                .orElseGet(() -> userService.save(User.builder().id(authenticatedUserId).build()));

        Double grams = request.getPortionGrams();
        if (grams == null && request.getPortionLabel() != null) {
            grams = parseGramsFromLabel(request.getPortionLabel(), ingredient);
        }

        DailyConsumption entity = DailyConsumption.builder()
                .user(user)
                .foodName(resolveFoodName(request, recipe, ingredient))
                .recipe(recipe)
                .ingredient(ingredient)
                .mealType(request.getMealType())
                .portionSize(resolvePortionSize(request, grams))
                .portionLabel(request.getPortionLabel())
                .portionMultiplier(request.getPortionMultiplier())
                .portionGrams(grams)
                .isCustomEntry(Boolean.TRUE.equals(request.getIsCustomEntry()) || (recipe == null && ingredient == null))
                .isFromInventory(inventoryGroup != null || Boolean.TRUE.equals(request.getIsFromInventory()))
                .inventoryGroup(inventoryGroup)
                .build();

        DailyConsumption saved = dailyConsumptionService.logConsumption(entity);
        return mapToResponse(saved);
    }

    private Double parseGramsFromLabel(String label, Ingredient ingredient) {
        if (label == null || label.isBlank()) return null;
        String lowerLabel = label.toLowerCase().trim();
        
        // Önce sayıyı ve birimi düzgünce ayıralım (Örn: "1 yemek kaşığı")
        // Sayı başta olmalı, geri kalanı birim olmalı.
        try {
            String[] parts = lowerLabel.split(" ", 2);
            if (parts.length == 2) {
                Double val = Double.parseDouble(parts[0].trim());
                String unit = parts[1].trim();
                return unitConverterService.convertToGrams(val, unit, ingredient);
            }
        } catch (Exception ignored) {}
        
        return null;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConsumption(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        String userId = requireAuthenticatedUserId(jwt, null);
        dailyConsumptionService.deleteConsumption(userId, id);
    }

    private ConsumptionResponse mapToResponse(DailyConsumption saved) {
        ConsumptionResponse response = new ConsumptionResponse();
        response.setId(saved.getId());
        response.setFoodName(saved.getFoodName());
        response.setRecipeId(saved.getRecipe() != null ? saved.getRecipe().getId() : null);
        response.setIngredientId(saved.getIngredient() != null ? saved.getIngredient().getId() : null);
        response.setInventoryGroupId(saved.getInventoryGroup() != null ? saved.getInventoryGroup().getId() : null);
        response.setPortionLabel(saved.getPortionLabel());
        response.setPortionGrams(saved.getPortionGrams());
        
        if (saved.getPortionLabel() != null && saved.getPortionLabel().contains(" ")) {
            try {
                String unit = saved.getPortionLabel().split(" ")[1];
                response.setUnitGramWeight(unitConverterService.getUnitGramWeight(unit, saved.getIngredient()));
            } catch (Exception ignored) {}
        }

        response.setEstimatedCalories(saved.getEstimatedCalories());
        response.setEstimatedProtein(saved.getEstimatedProtein());
        response.setEstimatedCarbs(saved.getEstimatedCarbs());
        response.setEstimatedFat(saved.getEstimatedFat());
        response.setIsFromInventory(saved.getIsFromInventory());
        response.setConsumedAt(saved.getConsumedAt());
        return response;
    }

    private String requireAuthenticatedUserId(Jwt jwt, String fallbackUserId) {
        if (jwt != null && jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
            return jwt.getSubject();
        }

        if (fallbackUserId != null && !fallbackUserId.isBlank()) {
            return fallbackUserId.trim();
        }

        throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
    }

    private DateRange resolveAnalysisDateRange(LocalDate startDate, LocalDate endDate, String period) {
        LocalDate start = startDate;
        LocalDate end = endDate;

        if (start == null) {
            if ("MONTHLY".equalsIgnoreCase(period)) {
                start = LocalDate.now().minusMonths(1);
            } else {
                start = LocalDate.now().minusWeeks(1);
            }
        }
        if (end == null) {
            end = LocalDate.now();
        }

        validateDateRange(start, end);
        return new DateRange(start, end);
    }

    private DateRange resolveHistoryDateRange(LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusWeeks(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        validateDateRange(start, end);
        return new DateRange(start, end);
    }

    private void validateDateRange(LocalDate start, LocalDate end) {
        if (start.isAfter(end)) {
            throw new IllegalArgumentException(INVALID_DATE_RANGE_MESSAGE);
        }
    }

    private String resolveFoodName(ConsumptionRequest request, Recipe recipe, Ingredient ingredient) {
        if (request.getFoodName() != null && !request.getFoodName().isBlank()) {
            return request.getFoodName().trim();
        }
        if (recipe != null) {
            return recipe.getTitle();
        }
        if (ingredient != null) {
            return ingredient.getName();
        }

        throw new MealAppDomainException("Tüketim kaydı için bir tarif, malzeme veya yemek adı girilmelidir.");
    }

    private DailyConsumption.PortionSize resolvePortionSize(ConsumptionRequest request, Double grams) {
        if (request.getPortionSize() != null) {
            return request.getPortionSize();
        }

        if (request.getPortionMultiplier() != null) {
            if (request.getPortionMultiplier() <= 0.75) {
                return DailyConsumption.PortionSize.SMALL;
            }
            if (request.getPortionMultiplier() <= 1.25) {
                return DailyConsumption.PortionSize.MEDIUM;
            }
            return DailyConsumption.PortionSize.LARGE;
        }

        if (grams != null) {
            if (grams <= 60) {
                return DailyConsumption.PortionSize.SMALL;
            }
            if (grams <= 160) {
                return DailyConsumption.PortionSize.MEDIUM;
            }
            return DailyConsumption.PortionSize.LARGE;
        }

        return DailyConsumption.PortionSize.MEDIUM;
    }

    private boolean isUserInGroup(User user, InventoryGroup group) {
        if (group.getUsers() == null) return false;
        return group.getUsers().stream().anyMatch(u -> u.getId().equals(user.getId()));
    }

    private record DateRange(LocalDate start, LocalDate end) {
    }
}
