package org.example.recommendation.engine;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.util.CollectionUtils.containsAny;

@Component
public class RecommendationEngine {

    public static class ScoredCandidate {
        private final String title;
        private final double score;              // 0.0 - 1.0
        private final List<String> matched;
        private final List<String> missing;

        public ScoredCandidate(String title, double score, List<String> matched, List<String> missing) {
            this.title = title;
            this.score = score;
            this.matched = matched;
            this.missing = missing;
        }

        public String getTitle() { return title; }
        public double getScore() { return score; }
        public List<String> getMatched() { return matched; }
        public List<String> getMissing() { return missing; }
    }

    public List<ScoredCandidate> score(List<String> userIngredients, List<String> allergies, List<String> dislikedFoods, List<RecipeCandidate> candidates) {
        Set<String> userSet = normalize(userIngredients);
        Set<String> allergySet = normalize(allergies);
        Set<String> dislikedSet = normalize(dislikedFoods);

        List<ScoredCandidate> scored = new ArrayList<>();

        for (RecipeCandidate c : candidates) {
            List<String> reqNorm = c.getRequiredIngredients().stream()
                    .map(this::normOne)
                    .toList();

            // Hard filter: exclude recipes containing allergens or disliked ingredients
            if (containsAny(reqNorm, allergySet) || containsAny(reqNorm, dislikedSet)) {
                continue;
            }

            List<String> matched = reqNorm.stream()
                    .filter(userSet::contains)
                    .distinct()
                    .toList();

            List<String> missing = reqNorm.stream()
                    .filter(i -> !userSet.contains(i))
                    .distinct()
                    .toList();

            double rawOverlap = reqNorm.isEmpty() ? 0.0 : ((double) matched.size() / (double) reqNorm.size());

            // Improved scoring:
            // - missing penalty: more missing reduces score
            // - small full-match bonus
            double missingPenalty = reqNorm.isEmpty() ? 0.0 : ((double) missing.size() / (double) reqNorm.size()) * 0.25;
            double fullMatchBonus = missing.isEmpty() ? 0.10 : 0.0;

            double finalScore = clamp(rawOverlap - missingPenalty + fullMatchBonus);

            scored.add(new ScoredCandidate(c.getTitle(), finalScore, matched, missing));
        }

        return scored.stream()
                .sorted(Comparator.comparingDouble(ScoredCandidate::getScore).reversed())
                .toList();
    }

    private boolean containsAny(List<String> list, Set<String> set) {
        if (set == null || set.isEmpty()) return false;
        for (String item : list) {
            if (set.contains(item)) return true;
        }
        return false;
    }

    private double clamp(double v) {
        if (v < 0.0) return 0.0;
        if (v > 1.0) return 1.0;
        return v;
    }

    private Set<String> normalize(List<String> list) {
        if (list == null) return Set.of();
        return list.stream()
                .filter(Objects::nonNull)
                .map(this::normOne)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
    }

    private String normOne(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }
}
