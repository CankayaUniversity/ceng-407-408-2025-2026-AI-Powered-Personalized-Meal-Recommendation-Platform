package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
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
        ingredientRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Ingredient> searchByName(String query, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 25));
        PageRequest pageRequest = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.ASC, "name"));

        if (query == null || query.isBlank()) {
            return ingredientRepository.findAll(pageRequest).getContent();
        }

        return ingredientRepository.findByNameContainingIgnoreCase(query.trim(), pageRequest).getContent();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Ingredient> findById(Long id) {
        return ingredientRepository.findById(id);
    }
}
