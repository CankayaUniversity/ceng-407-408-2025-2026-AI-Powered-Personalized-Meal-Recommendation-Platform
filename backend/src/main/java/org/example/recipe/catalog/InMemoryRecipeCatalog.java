package org.example.recipe.catalog;

import org.example.recommendation.engine.RecipeCandidate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InMemoryRecipeCatalog implements RecipeCatalog {

    @Override
    public List<RecipeCandidate> findAll() {
        // Milestone 5: demo/in-memory recipe pool (later replaced by DB or external source)
        return List.of(
                new RecipeCandidate("Chicken Rice Bowl", List.of("chicken", "rice", "soy sauce", "garlic")),
                new RecipeCandidate("Tomato Pasta", List.of("pasta", "tomato", "olive oil", "garlic")),
                new RecipeCandidate("Omelette", List.of("egg", "salt", "pepper", "cheese"))
        );
    }
}
