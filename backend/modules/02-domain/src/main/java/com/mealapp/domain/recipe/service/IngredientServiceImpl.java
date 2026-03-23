package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
