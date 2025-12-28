package org.example.recommendation.engine;

import java.util.List;

public class RecipeCandidate {
    private final String title;
    private final List<String> requiredIngredients;

    public RecipeCandidate(String title, List<String> requiredIngredients) {
        this.title = title;
        this.requiredIngredients = requiredIngredients;
    }

    public String getTitle() {
        return title;
    }

    public List<String> getRequiredIngredients() {
        return requiredIngredients;
    }
}
