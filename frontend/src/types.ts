// Enums
export enum DietType {
  VEGAN = 'VEGAN',
  VEGETARIAN = 'VEGETARIAN',
  PESCATARIAN = 'PESCATARIAN',
  KETO = 'KETO',
  PALEO = 'PALEO',
  MEDITERRANEAN = 'MEDITERRANEAN',
  NONE = 'NONE'
}

export enum DietaryGoal {
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  MUSCLE_GAIN = 'MUSCLE_GAIN',
  MAINTENANCE = 'MAINTENANCE',
  HEALTH_IMPROVEMENT = 'HEALTH_IMPROVEMENT'
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
  EXTREMELY_ACTIVE = 'EXTREMELY_ACTIVE'
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
  name: string;
  email: string;
  dietType?: DietType;
  dietaryGoal?: DietaryGoal;
  weight?: number;
  height?: number;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  dailyCalorieTarget?: number;
  allergies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Recipe {
  id: number;
  title: string;
  instructions: string;
  preparationTimeMinutes: number;
  difficulty: Difficulty;
  servings: number;
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
  availableIngredients: string[];
  dietaryPreference?: DietType;
}

export interface RecommendationResponse {
  recipes: Recipe[];
}

export interface ConsumptionRequest {
  recipeId?: number;
  foodName: string;
  estimatedCalories: number;
  mealType: MealType;
  portionSize: PortionSize;
  consumedAt?: string;
  isCustomEntry: boolean;
}

export interface ConsumptionResponse {
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

export interface RecipeRatingRequest {
  recipeId: number;
  rating: number;
  comment?: string;
}

export interface RecipeRatingResponse {
  id: number;
  userId: string;
  recipeId: number;
  rating: number;
  comment?: string;
  createdAt: string;
}
