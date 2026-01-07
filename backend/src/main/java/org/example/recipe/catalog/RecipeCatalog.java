package org.example.recipe.catalog;

import org.example.recommendation.engine.RecipeCandidate;

import java.util.List;

public interface RecipeCatalog {
    List<RecipeCandidate> findAll();
}
