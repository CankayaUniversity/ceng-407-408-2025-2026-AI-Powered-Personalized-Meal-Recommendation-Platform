package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.app.model.mapper.recipe.RecipeMapper;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.recipe.service.RecipeService;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeMapper recipeMapper;

    @GetMapping
    @Transactional(readOnly = true)
    public List<RecipeResponse> getAllRecipes(
            @RequestParam(required = false) String title,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        PageRequest pageRequest = PageRequest.of(page, size);
        List<RecipeResponse> responses;
        
        if (title != null && !title.isBlank()) {
            responses = recipeMapper.toResponseList(recipeService.searchByTitle(title, pageRequest).getContent());
        } else {
            responses = recipeMapper.toResponseList(recipeService.findAll(pageRequest).getContent());
        }
        
        responses.forEach(this::enrichImageUrl);
        return responses;
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public RecipeResponse getRecipeById(@PathVariable Long id) {
        RecipeResponse response = recipeService.findById(id)
            .map(recipeMapper::toResponse) // Recipe -> RecipeResponse dönüşümü
            .orElseThrow(() -> new RuntimeException("Tarif bulunamadı: " + id));
            
        enrichImageUrl(response);
        return response;
    }

    /**
     * Tarif görselini yükler. Sadece ADMIN yetkisi olanlar erişebilir.
     */
    @PostMapping("/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    @SneakyThrows
    public RecipeResponse uploadRecipeImage(@PathVariable Long id,
                                            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new MealAppDomainException("Yüklenecek dosya bulunamadı.");
        }

        recipeService.uploadRecipeImage(
                id,
                file.getInputStream(),
                file.getOriginalFilename(),
                file.getContentType()
        );

        RecipeResponse response = recipeService.findById(id)
                .map(recipeMapper::toResponse)
                .orElseThrow(() -> new RuntimeException("Tarif bulunamadı: " + id));

        enrichImageUrl(response);
        return response;
    }

    private void enrichImageUrl(RecipeResponse response) {
        if (response != null && response.getImageUrl() != null && !response.getImageUrl().startsWith("http")) {
            response.setImageUrl(recipeService.getRecipeImageUrl(response.getImageUrl()));
        }
    }
}
