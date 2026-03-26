package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.app.model.mapper.recipe.RecipeMapper;
import com.mealapp.domain.recipe.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeMapper recipeMapper;

    @GetMapping
    public List<RecipeResponse> getAllRecipes(
            @RequestParam(required = false) String title,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        PageRequest pageRequest = PageRequest.of(page, size);
        
        if (title != null && !title.isBlank()) {
            return recipeMapper.toResponseList(recipeService.searchByTitle(title, pageRequest).getContent());
        }
        
        return recipeMapper.toResponseList(recipeService.findAll(pageRequest).getContent());
    }
}
