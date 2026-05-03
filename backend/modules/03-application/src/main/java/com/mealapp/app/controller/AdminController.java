package com.mealapp.app.controller;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.recipe.service.IngredientService;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final RecipeService recipeService;
    private final IngredientService ingredientService;
    private final UserMapper userMapper;

    @GetMapping("/users")
    public List<UserDto> getAllUsers(@RequestParam(required = false) String query) {
        if (query != null && !query.isBlank()) {
            return userService.searchUsers(query).stream()
                    .map(userMapper::toDto)
                    .toList();
        }
        // Not: UserService'e findAll eklenmesi gerekebilir, şimdilik arama ile idare ediyoruz veya boş dönüyoruz.
        return List.of(); 
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
}
