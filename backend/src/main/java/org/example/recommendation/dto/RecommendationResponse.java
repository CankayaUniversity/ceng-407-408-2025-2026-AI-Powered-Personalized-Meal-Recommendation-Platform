package org.example.recommendation.dto;

import java.util.List;

public class RecommendationResponse {

    private List<RecommendationItem> recommendations;

    public RecommendationResponse() {}

    public RecommendationResponse(List<RecommendationItem> recommendations) {
        this.recommendations = recommendations;
    }

    public List<RecommendationItem> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<RecommendationItem> recommendations) {
        this.recommendations = recommendations;
    }

    // Nested DTO (simple for milestone 2)
    public static class RecommendationItem {
        private String title;
        private String reason;
        private Nutrition nutrition;

        private double score;
        private List<String> missingIngredients;

        public RecommendationItem() {}

        public RecommendationItem(String title, String reason, Nutrition nutrition, double score, List<String> missingIngredients) {
            this.title = title;
            this.reason = reason;
            this.nutrition = nutrition;
            this.score = score;
            this.missingIngredients = missingIngredients;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }

        public Nutrition getNutrition() { return nutrition; }
        public void setNutrition(Nutrition nutrition) { this.nutrition = nutrition; }

        public double getScore() { return score; }
        public void setScore(double score) { this.score = score; }

        public List<String> getMissingIngredients() { return missingIngredients; }
        public void setMissingIngredients(List<String> missingIngredients) { this.missingIngredients = missingIngredients; }
    }

    public static class Nutrition {
        private int calories;
        private int protein;
        private int fat;
        private int carbs;

        public Nutrition() {}

        public Nutrition(int calories, int protein, int fat, int carbs) {
            this.calories = calories;
            this.protein = protein;
            this.fat = fat;
            this.carbs = carbs;
        }

        public int getCalories() { return calories; }
        public void setCalories(int calories) { this.calories = calories; }

        public int getProtein() { return protein; }
        public void setProtein(int protein) { this.protein = protein; }

        public int getFat() { return fat; }
        public void setFat(int fat) { this.fat = fat; }

        public int getCarbs() { return carbs; }
        public void setCarbs(int carbs) { this.carbs = carbs; }
    }
}
