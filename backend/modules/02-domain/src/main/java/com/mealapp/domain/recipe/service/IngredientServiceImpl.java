package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class IngredientServiceImpl implements IngredientService {

    private final IngredientRepository ingredientRepository;
    private final RecipeService recipeService;

    @Override
    public Ingredient save(Ingredient ingredient) {
        boolean isUpdate = ingredient.getId() != null;
        Ingredient saved = ingredientRepository.save(ingredient);
        
        if (isUpdate) {
            // Malzeme güncellendiğinde, bu malzemeyi içeren tüm tariflerin besin değerlerini yenile
            recipeService.refreshRecipesByIngredient(saved.getId());
        }
        
        return saved;
    }

    @Override
    public void deleteById(Long id) {
        ingredientRepository.softDelete(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Ingredient> searchByName(String query, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 1000));
        PageRequest pageRequest = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.ASC, "name"));

        if (query == null || query.isBlank()) {
            return ingredientRepository.findAll(pageRequest).getContent();
        }

        return ingredientRepository.findByNameContainingIgnoreCaseAndActiveTrue(query.trim(), pageRequest).getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Ingredient> findById(Long id) {
        return ingredientRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Ingredient> findByIdWithUnits(Long id) {
        return ingredientRepository.findByIdWithUnits(id);
    }

    @Override
    public Ingredient updateIngredient(Long id, String name, String category, Double density, String physicalState, String preferredUnit, Double calories, Double protein, Double carbs, Double fat) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new com.mealapp.domain.common.exception.ResourceNotFoundException("Malzeme bulunamadı"));

        ingredient.setName(name);
        if (category != null) {
            ingredient.setCategory(Ingredient.Category.valueOf(category));
        }
        if (density != null) {
            ingredient.setDensity(density);
        }
        if (physicalState != null) {
            ingredient.setPhysicalState(Ingredient.PhysicalState.valueOf(physicalState));
        }
        ingredient.setPreferredUnit(preferredUnit);

        IngredientNutrition nutrition = ingredient.getNutrition();
        if (nutrition == null) {
            nutrition = new IngredientNutrition();
            nutrition.setIngredient(ingredient);
            ingredient.setNutrition(nutrition);
        }
        nutrition.setCaloriesPer100g(calories);
        nutrition.setProteinPer100g(protein);
        nutrition.setCarbsPer100g(carbs);
        nutrition.setFatPer100g(fat);

        Ingredient saved = ingredientRepository.save(ingredient);
        
        // Malzeme güncellendiğinde, bu malzemeyi içeren tüm tariflerin besin değerlerini yenile
        recipeService.refreshRecipesByIngredient(saved.getId());
        
        return saved;
    }

    @Override
    public Ingredient createIngredient(String name, String category, Double density, String physicalState, String preferredUnit, Double calories, Double protein, Double carbs, Double fat) {
        Ingredient ingredient = new Ingredient();
        ingredient.setName(name);
        if (category != null) {
            ingredient.setCategory(Ingredient.Category.valueOf(category));
        }
        if (density != null) {
            ingredient.setDensity(density);
        }
        if (physicalState != null) {
            ingredient.setPhysicalState(Ingredient.PhysicalState.valueOf(physicalState));
        }
        ingredient.setPreferredUnit(preferredUnit);
        ingredient.setActive(true);

        IngredientNutrition nutrition = new IngredientNutrition();
        nutrition.setIngredient(ingredient);
        nutrition.setCaloriesPer100g(calories);
        nutrition.setProteinPer100g(protein);
        nutrition.setCarbsPer100g(carbs);
        nutrition.setFatPer100g(fat);
        ingredient.setNutrition(nutrition);

        return ingredientRepository.save(ingredient);
    }
}
