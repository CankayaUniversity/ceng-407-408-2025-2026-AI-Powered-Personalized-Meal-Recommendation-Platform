package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.Ingredient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Malzemelere erişim sağlayan repository arayüzü.
 */
@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
    Optional<Ingredient> findByNameIgnoreCase(String name);

    Page<Ingredient> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
