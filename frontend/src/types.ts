// Enums
export enum DietType {
  NONE = 'NONE',
  GLUTEN_FREE = 'GLUTEN_FREE',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  KETO = 'KETO',
  PALEO = 'PALEO'
}

export enum DietaryGoal {
  LOSE_WEIGHT = 'LOSE_WEIGHT',
  MAINTAIN_WEIGHT = 'MAINTAIN_WEIGHT',
  GAIN_WEIGHT = 'GAIN_WEIGHT',
  BUILD_MUSCLE = 'BUILD_MUSCLE'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum ActivityLevel {
  SEDENTARY = 'SEDENTARY',
  LIGHTLY_ACTIVE = 'LIGHTLY_ACTIVE',
  MODERATELY_ACTIVE = 'MODERATELY_ACTIVE',
  VERY_ACTIVE = 'VERY_ACTIVE',
  EXTRA_ACTIVE = 'EXTRA_ACTIVE'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum IngredientCategory {
  VEGETABLE = 'VEGETABLE',
  FRUIT = 'FRUIT',
  PROTEIN = 'PROTEIN',
  GRAIN = 'GRAIN',
  DAIRY = 'DAIRY',
  SPICE = 'SPICE',
  OTHER = 'OTHER'
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK'
}

export enum PortionSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE'
}

// Core Entities
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  allergies?: string[] | null;
  dietType?: DietType | null;
  dietaryGoal?: DietaryGoal | null;
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  gender?: Gender | null;
  activityLevel?: ActivityLevel | null;
  dailyCalorieTarget?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface RecipeListItem {
  id: number;
  title: string;
  category?: string | null;
  totalCalories?: number | null;
  preparationTimeMinutes?: number | null;
  averageRating?: number | null;
  imageUrl?: string | null;
}

export interface Recipe extends RecipeListItem {
  difficulty?: Difficulty | null;
  servings?: number | null;
  instructions?: string | null;
  ingredients?: RecipeIngredient[];
  ratings?: RecipeRating[];
}

export interface Ingredient {
  id: number;
  name: string;
  category: IngredientCategory;
  nutrition?: IngredientNutrition;
}

export interface IngredientNutrition {
  ingredientId: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface RecipeIngredient {
  id: number;
  recipeId: number;
  ingredientId: number;
  grams: number;
  ingredient?: Ingredient;
}

export interface RecipeRating {
  id: number;
  userId: string;
  recipeId: number;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface DailyConsumption {
  id: number;
  userId: string;
  recipeId?: number;
  foodName: string;
  estimatedCalories: number;
  mealType: MealType;
  portionSize: PortionSize;
  consumedAt: string;
  isCustomEntry: boolean;
}

export interface Inventory {
  id: number;
  userId: string;
  ingredientId: number;
  quantity: number;
  unit: string;
  ingredient?: Ingredient;
}

// API DTOs
export interface RecommendationRequest {
  userId: string;
  availableIngredients: string[];
}

export interface RecommendedRecipe {
  recipeTitle: string;
  insight: string;
}

export interface RecommendationResponse {
  recommendedRecipes: RecommendedRecipe[];
}

export interface ConsumptionRequest {
  userId: string;
  recipeId?: number;
  foodName: string;
  mealType: MealType;
  portionSize: PortionSize;
  isCustomEntry?: boolean | null;
  isFromInventory?: boolean | null;
}

export interface ConsumptionResponse {
  id: number;
  estimatedCalories?: number | null;
  consumedAt: string;
}

export interface RecipeRatingRequest {
  userId: string;
  recipeId: number;
  rating: number;
  comment?: string;
}

export interface RecipeRatingResponse {
  id: number;
  userId: string;
  recipeId: number;
  recipeTitle: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ApiValidationErrorItem {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  message: string;
  status?: number;
  path?: string;
  validationErrors?: ApiValidationErrorItem[];
  fields?: Record<string, string>;
}
