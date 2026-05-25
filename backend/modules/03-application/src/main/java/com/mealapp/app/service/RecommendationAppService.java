package com.mealapp.app.service;

import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationRequest;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationHistoryResponse;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationResponse;
import com.mealapp.app.model.mapper.recommendation.RecommendationMapper;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeCategory;
import com.mealapp.domain.recipe.service.RecipeNutritionCalculator;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recommendation.dto.MenuRecommendationResult;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendationMenu;
import com.mealapp.domain.recommendation.entity.RecommendationMenuCourse;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recommendation.repository.RecommendationRepository;
import com.mealapp.domain.recommendation.repository.RecommendedRecipeRepository;
import com.mealapp.domain.recommendation.service.IngredientMatchService;
import com.mealapp.domain.recommendation.service.RecommendationService;
import com.mealapp.domain.recipe.service.RecipeRatingService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import com.mealapp.utilities.security.EncryptionUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.LinkedHashSet;
import java.util.stream.Collectors;

/**
 * Bu sınıf "Orchestrator" görevini üstlenir.
 */
@Service
@RequiredArgsConstructor
public class RecommendationAppService {
    private final RecommendationService recommendationService;
    private final UserService userService;
    private final IngredientRepository ingredientRepository;
    private final InventoryService inventoryService;
    private final RecommendationMapper recommendationMapper;
    private final RecommendationRepository recommendationRepository;
    private final RecommendedRecipeRepository recommendedRecipeRepository;
    private final RecipeRatingService recipeRatingService;
    private final IngredientMatchService ingredientMatchService;

    @Value("${com.mealapp.ai.security.encryption-key}")
    private String encryptionKey;

    /**
     * Öneri akışını yöneten ana metod.
     */
    @Transactional
    public RecommendationResponse getRecommendations(RecommendationRequest request) {
        // 1. Kullanıcıyı bul
        User user = userService.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + request.getUserId()));

        // Request ile gelen tercihler varsa geçici olarak uygula (AI prompt için)
        applyRequestPreferences(user, request);
        
        String normalizedCravings = normalizeValue(request.getCravings());

        // 2. İstekteki malzemeleri geçici Inventory nesnelerine çevir (Dinamik envanter)
        List<String> rawIngredients = request.getAvailableIngredients();
        if (rawIngredients == null) {
            rawIngredients = List.of();
        }
        List<Inventory> dynamicInventory = normalizeValues(rawIngredients).stream()
                .map(ingredientName -> {
                    Ingredient ingredient = ingredientRepository.findByNameIgnoreCase(ingredientName)
                            .orElseGet(() -> Ingredient.builder()
                                    .name(ingredientName)
                                    .category(Ingredient.Category.OTHER)
                                    .build());
                    return Inventory.builder()
                            .ingredient(ingredient)
                            .quantity(Double.MAX_VALUE)
                            .unit("g")
                            .build();
                    })
                    .toList();

        // 3. Domain servisinden önerileri al
        String decryptedApiKey = decryptApiKey(request.getApiKey());
        Recommendation recommendation = recommendationService.getRecommendations(user, dynamicInventory, normalizedCravings, request.getAiModel(), decryptedApiKey);

        // 4. Sonucu DTO'ya çevirip dön
        return recommendationMapper.toResponse(
                recommendation,
                dynamicInventory.stream()
                        .map(inventory -> inventory.getIngredient() != null ? inventory.getIngredient().getName() : null)
                        .filter(name -> name != null && !name.isBlank())
                        .toList()
        );
    }

    @Transactional
    public MenuRecommendationResponse getMenuRecommendations(String authenticatedUserId, MenuRecommendationRequest request) {
        User user = userService.findById(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + authenticatedUserId));

        List<Inventory> userInventory = request.getInventoryGroupId() == null
                ? inventoryService.getUserInventory(authenticatedUserId)
                : inventoryService.getUserInventory(authenticatedUserId, request.getInventoryGroupId());
        String decryptedApiKey = decryptApiKey(request.getApiKey());

        String normalizedCravings = normalizeValue(request.getCravings());
        MenuRecommendationResult result = recommendationService.getMenuRecommendations(
                user,
                userInventory,
                request.getSelectedCategories(),
                normalizedCravings,
                request.getAiModel(),
                decryptedApiKey
        );

        Map<Long, RecommendedRecipe> trackedRecipes = persistMenuRecommendationSession(
                user,
                result,
                normalizedCravings,
                request.getAiModel()
        );
        return toMenuResponse(result, userInventory, trackedRecipes);
    }

    /**
     * Kullanıcının geçmiş önerilerini getirir.
     */
    @Transactional(readOnly = true)
    public List<RecommendationResponse> getRecommendationHistory(String userId) {
        List<Recommendation> history = recommendationService.getRecommendationHistory(userId);
        return history.stream()
                .map(r -> recommendationMapper.toResponse(r, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MenuRecommendationHistoryResponse> getMenuRecommendationHistory(String userId) {
        List<Recommendation> history = recommendationService.getRecommendationHistory(userId);
        List<Inventory> currentInventory = inventoryService.getUserInventory(userId);

        return history.stream()
                .filter(recommendation -> recommendation.getMenus() != null && !recommendation.getMenus().isEmpty())
                .map(recommendation -> toMenuHistoryResponse(recommendation, currentInventory))
                .toList();
    }

    /**
     * Önerilen bir tarife puan ve yorum verir.
     */
    @Transactional
    public void rateRecommendation(String userId, Long recommendedRecipeId, Integer rating, String comment) {
        RecommendedRecipe rr = recommendedRecipeRepository.findById(recommendedRecipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Önerilen tarif bulunamadı ID: " + recommendedRecipeId));

        if (rating != null) {
            if (rating < 1 || rating > 10) {
                throw new IllegalArgumentException("Puan 1 ile 10 arasında olmalıdır.");
            }
            rr.setUserRating(rating);
            
            // Kullanıcı "ikisini bir arada işleyelim" dediği için RecipeRatingService'i de çağırıyoruz.
            recipeRatingService.rateRecipe(userId, rr.getRecipe().getId(), rating, comment);
        }
        
        rr.setUserComment(comment);
        recommendedRecipeRepository.save(rr);
    }

    /**
     * Önerilen bir tarifi "pişirildi/yapıldı" olarak işaretler.
     */
    @Transactional
    public void markAsCooked(Long recommendedRecipeId) {
        RecommendedRecipe rr = recommendedRecipeRepository.findById(recommendedRecipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Önerilen tarif bulunamadı ID: " + recommendedRecipeId));

        if (!rr.isCooked()) {
            rr.setCooked(true);
            
            // Tarifin toplam pişirilme sayısını artır
            Recipe recipe = rr.getRecipe();
            if (recipe.getTotalCookCount() == null) {
                recipe.setTotalCookCount(1);
            } else {
                recipe.setTotalCookCount(recipe.getTotalCookCount() + 1);
            }
            
            recommendedRecipeRepository.save(rr);
        }
    }

    private void applyRequestPreferences(User user, RecommendationRequest request) {
        if (request.getDislikedIngredients() != null) {
            user.setDislikedIngredients(normalizeValues(request.getDislikedIngredients()));
        }
        if (request.getAllergies() != null) {
            user.setAllergies(normalizeValues(request.getAllergies()));
        }
        if (request.getDietaryGoal() != null && !request.getDietaryGoal().isBlank()) {
            try {
                user.setDietaryGoal(User.DietaryGoal.valueOf(request.getDietaryGoal().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ignored) {}
        }
        if (request.getDietType() != null && !request.getDietType().isBlank()) {
            try {
                user.setDietType(User.DietType.valueOf(request.getDietType().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ignored) {}
        }
    }

    private List<String> normalizeValues(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        Set<String> seen = new LinkedHashSet<>();

        return values.stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .filter(value -> seen.add(value.toLowerCase(Locale.ROOT)))
                .toList();
    }

    private String normalizeValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String decryptApiKey(String encryptedKey) {
        if (encryptedKey == null || encryptedKey.isBlank()) {
            return null;
        }
        try {
            return EncryptionUtils.decrypt(encryptedKey, encryptionKey);
        } catch (Exception e) {
            // Şifre çözme hatası durumunda (geçersiz anahtar vb.) güvenli bir şekilde loglayıp boş dönebiliriz.
            // Ama kullanıcıya "API anahtarı geçersiz" uyarısı vermek için hata da fırlatılabilir.
            throw new IllegalArgumentException("API anahtarı çözülemedi. Lütfen anahtarınızı kontrol edin.", e);
        }
    }

    private MenuRecommendationResponse toMenuResponse(
            MenuRecommendationResult result,
            List<Inventory> inventory,
            Map<Long, RecommendedRecipe> trackedRecipes
    ) {
        MenuRecommendationResponse response = new MenuRecommendationResponse();
        response.setGeneratedAt(java.time.LocalDateTime.now());
        response.setAiGenerated(result.isAiGenerated());

        response.setMenus(result.getMenus().stream()
                .map(menu -> {
                    MenuRecommendationResponse.MenuDto dto = new MenuRecommendationResponse.MenuDto();
                    dto.setRank(menu.getRank());
                    dto.setTitle(menu.getTitle());
                    dto.setInsight(menu.getInsight());
                    dto.setTotalKcal(menu.getTotalKcal());
                    dto.setTotalProtein(menu.getTotalProtein());
                    dto.setTotalCarbs(menu.getTotalCarbs());
                    dto.setTotalFat(menu.getTotalFat());
                    dto.setTotalPreparationTime(menu.getTotalPreparationTime());
                    dto.setCourses(menu.getCourses().entrySet().stream()
                            .collect(Collectors.toMap(
                                    Map.Entry::getKey,
                                    entry -> toMenuCourseDto(entry.getKey(), entry.getValue(), inventory, trackedRecipes),
                                    (existing, replacement) -> existing,
                                    java.util.LinkedHashMap::new
                            )));
                    return dto;
                })
                .toList());

        return response;
    }

    private MenuRecommendationResponse.MenuCourseRecipeDto toMenuCourseDto(
            com.mealapp.domain.recipe.entity.RecipeCategory category,
            Recipe recipe,
            List<Inventory> inventory,
            Map<Long, RecommendedRecipe> trackedRecipes
    ) {
        RecommendedRecipe trackedRecipe = recipe.getId() == null || trackedRecipes == null
                ? null
                : trackedRecipes.get(recipe.getId());

        return buildMenuCourseDto(category, recipe, trackedRecipe, inventory);
    }

    private MenuRecommendationResponse.MenuCourseRecipeDto toMenuCourseDto(
            RecipeCategory category,
            RecommendedRecipe trackedRecipe,
            List<Inventory> inventory
    ) {
        if (trackedRecipe == null || trackedRecipe.getRecipe() == null) {
            return null;
        }

        return buildMenuCourseDto(category, trackedRecipe.getRecipe(), trackedRecipe, inventory);
    }

    private MenuRecommendationResponse.MenuCourseRecipeDto buildMenuCourseDto(
            RecipeCategory category,
            Recipe recipe,
            RecommendedRecipe trackedRecipe,
            List<Inventory> inventory
    ) {
        MenuRecommendationResponse.MenuCourseRecipeDto dto = new MenuRecommendationResponse.MenuCourseRecipeDto();
        dto.setRecommendationRecipeId(trackedRecipe != null ? trackedRecipe.getId() : null);
        dto.setRecipeId(recipe.getId());
        dto.setRecipeTitle(recipe.getTitle());
        dto.setCategory(category);
        dto.setCooked(trackedRecipe != null && trackedRecipe.isCooked());
        dto.setImageUrl(recipe.getImageUrl());
        dto.setKcalPerServing(RecipeNutritionCalculator.kcalPerServing(recipe));
        dto.setProteinPerServing(perServing(recipe.getTotalProtein(), recipe));
        dto.setCarbsPerServing(perServing(recipe.getTotalCarbs(), recipe));
        dto.setFatPerServing(perServing(recipe.getTotalFat(), recipe));
        dto.setPreparationTimeMinutes(recipe.getPreparationTimeMinutes());
        dto.setServings(recipe.getServings());
        dto.setAverageRating(recipe.getAverageRating());
        dto.setRatingCount(recipe.getRatingCount());
        dto.setTotalCookCount(recipe.getTotalCookCount());

        dto.setMatchedIngredients(ingredientMatchService.getMatchedIngredientNames(recipe, inventory));
        dto.setMissingIngredients(ingredientMatchService.getMissingIngredientNames(recipe, inventory));
        return dto;
    }

    private Map<Long, RecommendedRecipe> persistMenuRecommendationSession(
            User user,
            MenuRecommendationResult result,
            String cravings,
            String aiModel
    ) {
        if (result == null || result.getMenus() == null || result.getMenus().isEmpty()) {
            return Map.of();
        }

        Recommendation recommendation = Recommendation.builder()
                .user(user)
                .cravings(cravings)
                .aiModel(aiModel)
                .isAiGenerated(result.isAiGenerated())
                .build();

        Map<Long, RecommendedRecipe> trackedByRecipeId = new java.util.LinkedHashMap<>();
        for (MenuRecommendationResult.MenuAlternative menu : result.getMenus()) {
            if (menu == null || menu.getCourses() == null) {
                continue;
            }

            for (Recipe recipe : menu.getCourses().values()) {
                if (recipe == null || recipe.getId() == null || trackedByRecipeId.containsKey(recipe.getId())) {
                    continue;
                }

                RecommendedRecipe trackedRecipe = RecommendedRecipe.builder()
                        .recipe(recipe)
                        .aiInsight(resolveMenuRecipeInsight(recipe, result))
                        .build();
                recommendation.addRecommendedRecipe(trackedRecipe);
                trackedByRecipeId.put(recipe.getId(), trackedRecipe);
            }
        }

        if (recommendation.getRecommendedRecipes().isEmpty()) {
            return Map.of();
        }

        for (MenuRecommendationResult.MenuAlternative menu : result.getMenus()) {
            if (menu == null || menu.getCourses() == null || menu.getCourses().isEmpty()) {
                continue;
            }

            RecommendationMenu recommendationMenu = RecommendationMenu.builder()
                    .rank(menu.getRank())
                    .title(menu.getTitle())
                    .insight(menu.getInsight())
                    .totalKcal(menu.getTotalKcal())
                    .totalProtein(menu.getTotalProtein())
                    .totalCarbs(menu.getTotalCarbs())
                    .totalFat(menu.getTotalFat())
                    .totalPreparationTime(menu.getTotalPreparationTime())
                    .build();

            menu.getCourses().forEach((category, recipe) -> {
                if (category == null || recipe == null || recipe.getId() == null) {
                    return;
                }

                RecommendedRecipe trackedRecipe = trackedByRecipeId.get(recipe.getId());
                if (trackedRecipe != null) {
                    recommendationMenu.addCourse(RecommendationMenuCourse.builder()
                            .category(category)
                            .recommendedRecipe(trackedRecipe)
                            .build());
                }
            });

            if (!recommendationMenu.getCourses().isEmpty()) {
                recommendation.addMenu(recommendationMenu);
            }
        }

        Recommendation saved = recommendationRepository.save(recommendation);
        return saved.getRecommendedRecipes().stream()
                .filter(recommendedRecipe -> recommendedRecipe.getRecipe() != null && recommendedRecipe.getRecipe().getId() != null)
                .collect(Collectors.toMap(
                        recommendedRecipe -> recommendedRecipe.getRecipe().getId(),
                        recommendedRecipe -> recommendedRecipe,
                        (existing, replacement) -> existing,
                        java.util.LinkedHashMap::new
                ));
    }

    private MenuRecommendationHistoryResponse toMenuHistoryResponse(
            Recommendation recommendation,
            List<Inventory> inventory
    ) {
        MenuRecommendationHistoryResponse response = new MenuRecommendationHistoryResponse();
        response.setId(recommendation.getId());
        response.setCreatedAt(recommendation.getCreatedAt());
        response.setCravings(recommendation.getCravings());
        response.setAiModel(recommendation.getAiModel());
        response.setAiGenerated(recommendation.isAiGenerated());

        response.setMenus(recommendation.getMenus().stream()
                .map(menu -> toPersistedMenuDto(menu, inventory))
                .toList());
        return response;
    }

    private MenuRecommendationResponse.MenuDto toPersistedMenuDto(RecommendationMenu menu, List<Inventory> inventory) {
        MenuRecommendationResponse.MenuDto dto = new MenuRecommendationResponse.MenuDto();
        dto.setRank(menu.getRank());
        dto.setTitle(menu.getTitle());
        dto.setInsight(menu.getInsight());
        dto.setTotalKcal(menu.getTotalKcal());
        dto.setTotalProtein(menu.getTotalProtein());
        dto.setTotalCarbs(menu.getTotalCarbs());
        dto.setTotalFat(menu.getTotalFat());
        dto.setTotalPreparationTime(menu.getTotalPreparationTime());
        dto.setCourses(menu.getCourses().stream()
                .filter(course -> course.getCategory() != null)
                .filter(course -> course.getRecommendedRecipe() != null)
                .filter(course -> course.getRecommendedRecipe().getRecipe() != null)
                .collect(Collectors.toMap(
                        RecommendationMenuCourse::getCategory,
                        course -> toMenuCourseDto(course.getCategory(), course.getRecommendedRecipe(), inventory),
                        (existing, replacement) -> existing,
                        java.util.LinkedHashMap::new
                )));
        return dto;
    }

    private List<Inventory> safeInventory(List<Inventory> inventory) {
        return inventory == null ? List.of() : inventory.stream().filter(Objects::nonNull).toList();
    }

    private String resolveMenuRecipeInsight(Recipe recipe, MenuRecommendationResult result) {
        if (recipe == null || recipe.getId() == null || result == null || result.getMenus() == null) {
            return "Bu tarif seçilen menü kombinasyonlarından birinde önerildi.";
        }

        return result.getMenus().stream()
                .filter(menu -> menu != null && menu.getCourses() != null)
                .filter(menu -> menu.getCourses().values().stream()
                        .anyMatch(candidate -> candidate != null && recipe.getId().equals(candidate.getId())))
                .map(MenuRecommendationResult.MenuAlternative::getInsight)
                .map(this::normalizeValue)
                .filter(value -> value != null)
                .findFirst()
                .orElse("Bu tarif seçilen menü kombinasyonlarından birinde önerildi.");
    }

    private Double perServing(Double value, Recipe recipe) {
        if (value == null) {
            return null;
        }
        return Math.round((value / RecipeNutritionCalculator.safeServings(recipe)) * 10.0) / 10.0;
    }
}
