package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recipe.IngredientDTO;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.domain.recipe.service.IngredientService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;
    private final IngredientMapper ingredientMapper;

    @GetMapping
    public List<IngredientDTO> searchIngredients(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "12") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 25));
        return ingredientService.searchByName(query, safeLimit).stream()
                .map(ingredientMapper::toDTO)
                .toList();
    }
}
