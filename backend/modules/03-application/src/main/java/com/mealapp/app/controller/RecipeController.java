package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recipe.RecipeRequest;
import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.app.model.mapper.recipe.RecipeMapper;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.service.RecipeFavoriteService;
import com.mealapp.domain.recipe.service.RecipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeMapper recipeMapper;
    private final RecipeFavoriteService favoriteService;

    @GetMapping
    @Transactional(readOnly = true)
    public List<RecipeResponse> getAllRecipes(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "false") boolean favoritesOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        String userId = (jwt != null) ? jwt.getSubject() : null;
        PageRequest pageRequest = PageRequest.of(page, size);

        List<RecipeResponse> responses = recipeMapper.toResponseList(
            recipeService.findFiltered(userId, title, category, favoritesOnly, pageRequest).getContent(),
            userId
        );

        responses.forEach(this::enrichImageUrl);
        return responses;
    }

    @GetMapping("/{id}")
    public RecipeResponse getRecipeById(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        String userId = jwt != null ? jwt.getSubject() : null;
        Recipe recipe = recipeService.findVisibleById(id, userId, isAdmin(jwt))
            .orElseThrow(() -> ResourceNotFoundException.withCode("domain.recipe.not_found", id));
        RecipeResponse response = recipeMapper.toResponse(recipe, userId);
        enrichImageUrl(response);
        return response;
    }

    /**
     * Kullanıcının tercih edilen çalışma kopyasını döner.
     * Kök tarif için kullanıcının aktif taslak/bekleyen/reddedilmiş revizyonu varsa onu döner;
     * yoksa kök tarifi döner. Düzenleme akışları bu endpoint'i kullanabilir.
     */
    @GetMapping("/{id}/preferred")
    public RecipeResponse getPreferredRecipe(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        String userId = jwt != null ? jwt.getSubject() : null;
        Recipe recipe = recipeService.findPreferred(id, userId, isAdmin(jwt));
        RecipeResponse response = recipeMapper.toResponse(recipe, userId);
        enrichImageUrl(response);
        return response;
    }

    @GetMapping("/{id}/versions")
    public List<RecipeResponse> getRecipeVersions(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        String userId = jwt.getSubject();
        boolean isAdmin = isAdmin(jwt);
        
        return recipeService.findAllVersions(id, userId, isAdmin).stream()
            .map(recipe -> recipeMapper.toResponse(recipe, userId))
            .peek(this::enrichImageUrl)
            .collect(java.util.stream.Collectors.toList());
    }

    @PostMapping
    public RecipeResponse createRecipe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RecipeRequest request) {
        Recipe recipe = Recipe.builder()
            .title(request.getTitle())
            .category(request.getCategory())
            .dietType(request.getDietType())
            .instructions(request.getInstructions())
            .preparationTimeMinutes(request.getPreparationTimeMinutes() != null ? request.getPreparationTimeMinutes() : request.getPreparationTime())
            .servings(request.getServings())
            .difficulty(request.getDifficulty())
            .status(request.getStatus() != null ? request.getStatus() : com.mealapp.domain.recipe.entity.RecipeStatus.DRAFT)
            .createdBy(jwt.getSubject())
            .build();

        List<RecipeIngredient> ingredients = null;
        if (request.getIngredients() != null) {
            ingredients = request.getIngredients().stream()
                .map(req -> {
                    RecipeIngredient ri = RecipeIngredient.builder()
                        .amount(req.getAmount())
                        .unit(req.getUnit())
                        .grams(req.getGrams())
                        .build();
                    
                    Ingredient ingredientEntity;
                    if (req.getIngredientId() != null) {
                        ingredientEntity = Ingredient.builder().id(req.getIngredientId()).build();
                    } else {
                        ingredientEntity = Ingredient.builder().name(req.getIngredientName()).build();
                    }
                    ri.setIngredient(ingredientEntity);
                    return ri;
                })
                .collect(Collectors.toList());
        }

        Recipe created = recipeService.createRecipe(recipe, ingredients);
        RecipeResponse response = recipeMapper.toResponse(created, jwt.getSubject());
        enrichImageUrl(response);
        return response;
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<RecipeResponse> getPendingRecipes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Recipe> pending = recipeService.findPendingRecipes(pageRequest);
        List<RecipeResponse> responses = recipeMapper.toResponseList(pending.getContent());
        responses.forEach(this::enrichImageUrl);
        return responses;
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public void approveRecipe(@PathVariable Long id) {
        recipeService.approveRecipe(id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public void rejectRecipe(@PathVariable Long id) {
        recipeService.rejectRecipe(id);
    }

    @PostMapping("/{id}/send-to-approval")
    public void sendToApproval(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        recipeService.sendToApproval(id, jwt.getSubject());
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public RecipeResponse updateRecipe(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody RecipeRequest request) {
        
        Recipe recipeData = Recipe.builder()
            .title(request.getTitle())
            .category(request.getCategory())
            .dietType(request.getDietType())
            .instructions(request.getInstructions())
            .preparationTimeMinutes(request.getPreparationTimeMinutes() != null ? request.getPreparationTimeMinutes() : request.getPreparationTime())
            .servings(request.getServings())
            .difficulty(request.getDifficulty())
            .status(request.getStatus()) // DRAFT or PENDING
            .build();

        List<RecipeIngredient> ingredients = null;
        if (request.getIngredients() != null) {
            ingredients = request.getIngredients().stream()
                .map(req -> {
                    RecipeIngredient ri = RecipeIngredient.builder()
                        .amount(req.getAmount())
                        .unit(req.getUnit())
                        .grams(req.getGrams())
                        .build();
                    
                    Ingredient ingredientEntity;
                    if (req.getIngredientId() != null) {
                        ingredientEntity = Ingredient.builder().id(req.getIngredientId()).build();
                    } else {
                        ingredientEntity = Ingredient.builder().name(req.getIngredientName()).build();
                    }
                    ri.setIngredient(ingredientEntity);
                    return ri;
                })
                .collect(Collectors.toList());
        }

        Recipe updated = recipeService.updateRecipe(id, recipeData, ingredients, jwt.getSubject(), isAdmin(jwt));
        RecipeResponse response = recipeMapper.toResponse(updated, jwt.getSubject());
        enrichImageUrl(response);
        return response;
    }

    /**
     * Tarif görselini yükler.
     */
    @PostMapping("/{id}/favorite")
    public boolean toggleFavorite(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return favoriteService.toggleFavorite(jwt.getSubject(), id);
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("isAuthenticated()")
    @SneakyThrows
    public RecipeResponse uploadRecipeImage(@PathVariable Long id,
                                            @AuthenticationPrincipal Jwt jwt,
                                            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw MealAppDomainException.withCode("domain.file.required");
        }

        recipeService.uploadRecipeImage(
                id,
                file.getInputStream(),
                file.getOriginalFilename(),
                file.getContentType(),
                jwt.getSubject(),
                isAdmin(jwt)
        );

        RecipeResponse response = recipeService.findVisibleById(id, jwt.getSubject(), isAdmin(jwt))
                .map(r -> recipeMapper.toResponse(r, jwt.getSubject()))
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.recipe.not_found", id));

        enrichImageUrl(response);
        return response;
    }

    private void enrichImageUrl(RecipeResponse response) {
        if (response != null && response.getImageUrl() != null && !response.getImageUrl().startsWith("http")) {
            response.setImageUrl(recipeService.getRecipeImageUrl(response.getImageUrl()));
        }
    }

    private boolean isAdmin(Jwt jwt) {
        if (jwt == null) {
            return false;
        }
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles != null && (roles.contains("ROLE_ADMIN") || roles.contains("ADMIN") || roles.contains("admin"))) {
            return true;
        }
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        Object realmRoles = realmAccess != null ? realmAccess.get("roles") : null;
        if (realmRoles instanceof List<?> list) {
            return list.stream()
                .map(String::valueOf)
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equalsIgnoreCase("ADMIN"));
        }
        return false;
    }
}
