package com.mealapp.app.security;

import com.mealapp.domain.recipe.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service("recipeSecurityService")
@RequiredArgsConstructor
public class RecipeSecurityService {

    private final RecipeService recipeService;

    public boolean isOwner(Long recipeId, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            return false;
        }

        String userId = jwt.getSubject();
        return recipeService.findById(idToSearch(recipeId))
                .map(recipe -> userId.equals(recipe.getCreatedBy()))
                .orElse(false);
    }

    private Long idToSearch(Long recipeId) {
        // Eğer bu bir 'pending update' (parentId != null) ise, sahiplik kontrolünü orijinal üzerinden yapabiliriz
        // Ama genellikle pending update'in sahibi onu oluşturandır.
        return recipeId;
    }
}
