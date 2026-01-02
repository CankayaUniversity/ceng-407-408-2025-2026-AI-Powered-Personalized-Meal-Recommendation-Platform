# Dataset Description & Preprocessing Plan

> **Document Type:** PLAN  
> **Project:** AI-Powered Personalized Meal Recommendation Platform

---

## 1. Overview

This document outlines the datasets and preprocessing steps required for the system's core components: recipe recommendations, ingredient matching, nutritional value calculation, and personalized diet planning.

---

## 2. Dataset Description

The system will utilize a combination of user-generated data and publicly available nutritional datasets.

### 2.1 Planned Data Types

| Data Type               | Description                                          | Source                          |
| ----------------------- | ---------------------------------------------------- | ------------------------------- |
| User preferences        | Liked/disliked foods, dietary goals                  | User input                      |
| Dietary restrictions    | Allergies, vegetarian/vegan, etc.                    | User input                      |
| Nutritional information | Calories, protein, carbohydrates, fat per ingredient | Public datasets (USDA)          |
| Recipe data             | Ingredients, instructions, prep time, cuisine type   | Manual curation + open datasets |
| Ingredient data         | Standardized names, categories, units                | Manual curation                 |

### 2.2 Data Sources

| Source                    | Description                          | Priority |
| ------------------------- | ------------------------------------ | -------- |
| **USDA FoodData Central** | Nutritional values database          | High     |
| **Manual Compilation**    | Turkish recipes and ingredient names | High     |
| **Open Source Datasets**  | Recipe1M+, Food.com                  | Medium   |

### 2.3 Target Data Volume

- **Recipes:** 500+ (minimum), 2000+ (target)
- **Ingredients:** 300+ (minimum), 1000+ (target)
- **Turkish cuisine ratio:** At least 60%

---

## 3. Data Preprocessing

### 3.1 Handling Missing or Incomplete Data

| Issue                       | Solution                                     |
| --------------------------- | -------------------------------------------- |
| Missing required fields     | Record rejection or default value assignment |
| Incomplete nutritional data | Cross-reference with alternative sources     |
| Duplicate records           | Merge or delete based on completeness        |

### 3.2 Normalizing Numerical Nutritional Values

- All nutritional values standardized to **per 100g** basis
- Unit conversion table for Turkish measurements (cup, glass, spoon → grams)
- Calculation formula:
  ```
  Recipe Nutrition = Σ (Ingredient Quantity × Ingredient Nutrition / 100g)
  Per Serving = Recipe Total / Number of Servings
  ```

### 3.3 Encoding Categorical Features

| Feature          | Encoding Method                                     |
| ---------------- | --------------------------------------------------- |
| Cuisine type     | Enum (Turkish, Italian, Mediterranean, etc.)        |
| Meal type        | Enum (breakfast, lunch, dinner, snack)              |
| Difficulty level | Enum (easy, medium, hard)                           |
| Dietary tags     | Boolean flags (vegetarian, gluten-free, dairy-free) |

### 3.4 Feature Selection for Model Input

Features to be used for recipe recommendations:

- Ingredient list (normalized IDs)
- Nutritional profile (calories, protein, carbs, fat)
- User preference match score
- Dietary restriction compatibility
- Cuisine type alignment

---

## 4. Data Quality Validation

| Control Type          | Description               | Action                |
| --------------------- | ------------------------- | --------------------- |
| Missing Data          | Required fields empty     | Reject or use default |
| Data Type             | Incorrect type            | Convert or flag error |
| Range Check           | Values out of valid range | Boundary validation   |
| Referential Integrity | Invalid FK relationships  | Cascade or restrict   |
| Duplication           | Duplicate entries         | Merge or delete       |

---
