-- V25: Remove unique constraint on recipe_ingredients to allow same ingredient multiple times in a recipe
ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS unique_recipe_ingredient;
