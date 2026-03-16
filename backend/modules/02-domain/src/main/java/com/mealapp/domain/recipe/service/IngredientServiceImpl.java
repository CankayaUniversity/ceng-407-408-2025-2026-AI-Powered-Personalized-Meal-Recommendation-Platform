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

    @Override
    public Ingredient save(Ingredient ingredient) {
        return ingredientRepository.save(ingredient);
    }

    @Override
    public void deleteById(Long id) {
        ingredientRepository.deleteById(id);
    }
}
