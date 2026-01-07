package org.example.recommendation.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.Map;

public class RecommendationRequest {

    @NotEmpty(message = "ingredients must not be empty")
    private List<String> ingredients;

    // Hard constraints (Milestone 6)
    private List<String> allergies;
    private List<String> dislikedFoods;

    // Optional for later (dietGoal etc.)
    private Map<String, Object> preferences;

    public RecommendationRequest() {}

    public RecommendationRequest(List<String> ingredients, List<String> allergies, List<String> dislikedFoods, Map<String, Object> preferences) {
        this.ingredients = ingredients;
        this.allergies = allergies;
        this.dislikedFoods = dislikedFoods;
        this.preferences = preferences;
    }

    public List<String> getIngredients() { return ingredients; }
    public void setIngredients(List<String> ingredients) { this.ingredients = ingredients; }

    public List<String> getAllergies() { return allergies; }
    public void setAllergies(List<String> allergies) { this.allergies = allergies; }

    public List<String> getDislikedFoods() { return dislikedFoods; }
    public void setDislikedFoods(List<String> dislikedFoods) { this.dislikedFoods = dislikedFoods; }

    public Map<String, Object> getPreferences() { return preferences; }
    public void setPreferences(Map<String, Object> preferences) { this.preferences = preferences; }
}
