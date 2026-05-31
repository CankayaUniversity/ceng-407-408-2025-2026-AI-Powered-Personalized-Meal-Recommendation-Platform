package com.mealapp.app.controller;

import com.mealapp.app.model.dto.admin.AdminIngredientRequest;
import com.mealapp.app.model.dto.recipe.IngredientDTO;
import com.mealapp.app.model.dto.recipe.RecipeRequest;
import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.app.model.mapper.recipe.RecipeMapper;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.service.IngredientService;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final RecipeService recipeService;
    private final IngredientService ingredientService;
    private final InventoryService inventoryService;
    private final UserMapper userMapper;
    private final RecipeMapper recipeMapper;
    private final IngredientMapper ingredientMapper;

    @GetMapping("/users")
    public List<UserDto> getAllUsers(@RequestParam(required = false) String query) {
        if (query != null && !query.isBlank()) {
            return userService.searchUsers(query).stream()
                    .map(userMapper::toDto)
                    .toList();
        }
        return userService.findAll().stream()
                .map(userMapper::toDto)
                .toList();
    }

    @PutMapping("/users/{id}/role")
    public UserDto updateUserRole(@PathVariable String id, @RequestParam User.UserRole role) {
        return userMapper.toDto(userService.updateRole(id, role));
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable String id) {
        userService.findById(id).ifPresent(userService::delete);
    }

    @DeleteMapping("/recipes/{id}")
    public void deleteRecipe(@PathVariable Long id) {
        recipeService.deleteById(id);
    }

    @DeleteMapping("/ingredients/{id}")
    public void deleteIngredient(@PathVariable Long id) {
        ingredientService.deleteById(id);
    }

    // --- Admin Malzeme Paneli ---

    @GetMapping("/ingredients/{id}")
    public IngredientDTO getIngredient(@PathVariable Long id) {
        return ingredientService.findById(id)
                .map(ingredientMapper::toDTO)
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.ingredient.not_found.simple"));
    }

    @PutMapping("/ingredients/{id}")
    public IngredientDTO updateIngredient(@PathVariable Long id, @Valid @RequestBody AdminIngredientRequest request) {
        return ingredientMapper.toDTO(ingredientService.updateIngredient(
                id,
                request.getName(),
                request.getCategory(),
                request.getDensity(),
                request.getPhysicalState(),
                request.getPreferredUnit(),
                request.getCaloriesPer100g(),
                request.getProteinPer100g(),
                request.getCarbsPer100g(),
                request.getFatPer100g()
        ));
    }

    @PostMapping("/ingredients")
    public IngredientDTO createIngredient(@Valid @RequestBody AdminIngredientRequest request) {
        return ingredientMapper.toDTO(ingredientService.createIngredient(
                request.getName(),
                request.getCategory(),
                request.getDensity(),
                request.getPhysicalState(),
                request.getPreferredUnit(),
                request.getCaloriesPer100g(),
                request.getProteinPer100g(),
                request.getCarbsPer100g(),
                request.getFatPer100g()
        ));
    }

    // --- Admin Tarif Paneli ---

    @GetMapping("/recipes/{id}")
    public RecipeResponse getRecipe(@PathVariable Long id) {
        return recipeService.findActiveById(id)
                .map(recipeMapper::toResponse)
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.recipe.not_found.simple"));
    }

    @PutMapping("/recipes/{id}")
    public RecipeResponse updateRecipe(@PathVariable Long id, @Valid @RequestBody RecipeRequest request) {
        Recipe updatedData = Recipe.builder()
                .title(request.getTitle())
                .instructions(request.getInstructions())
                .preparationTimeMinutes(request.getPreparationTimeMinutes() != null ? request.getPreparationTimeMinutes() : request.getPreparationTime())
                .servings(request.getServings())
                .difficulty(request.getDifficulty())
                .status(request.getStatus())
                .category(request.getCategory())
                .build();

        List<RecipeIngredient> ingredients = request.getIngredients().stream()
                .map(ri -> RecipeIngredient.builder()
                        .ingredient(ingredientService.findById(ri.getIngredientId())
                                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.ingredient.not_found", ri.getIngredientId())))
                        .amount(ri.getAmount())
                        .unit(ri.getUnit())
                        .grams(ri.getGrams())
                        .build())
                .collect(Collectors.toList());

        // Admin olarak doğrudan güncelliyoruz.
        return recipeMapper.toResponse(recipeService.updateRecipeAsAdmin(id, updatedData, ingredients));
    }

    @PostMapping("/inventory/setup-test-inventory")
    public void setupTestInventory() {
        inventoryService.createTestInventoryForAllAdmins();
    }

    @PostMapping("/inventory/reset-test-inventory")
    public void resetTestInventory() {
        inventoryService.resetTestInventory();
    }
}
