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
  MEAT = 'MEAT',
  VEGETABLE = 'VEGETABLE',
  FRUIT = 'FRUIT',
  DAIRY = 'DAIRY',
  GRAIN = 'GRAIN',
  SPICE = 'SPICE',
  OIL = 'OIL',
  SEAFOOD = 'SEAFOOD',
  SAUCE = 'SAUCE',
  NUT = 'NUT',
  SWEETENER = 'SWEETENER',
  BEVERAGE = 'BEVERAGE',
  EGG = 'EGG',
  LEGUME = 'LEGUME',
  OTHER = 'OTHER'
}

export enum PhysicalState {
  SOLID = 'SOLID',
  LIQUID = 'LIQUID',
  SEMI_SOLID = 'SEMI_SOLID'
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
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  allergies?: string[] | null;
  dislikedIngredients?: string[] | null;
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

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INVITATION' | 'SYSTEM' | 'REMINDER';
  targetId?: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
}

export interface RecipeListItem {
  id: number;
  title: string;
  category?: string | null;
  totalCalories?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  preparationTimeMinutes?: number | null;
  servings?: number | null;
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
  density?: number;
  physicalState?: PhysicalState;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
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
  ingredientId?: number;
  inventoryGroupId?: number;
  foodName: string;
  estimatedCalories: number;
  estimatedProtein?: number | null;
  estimatedCarbs?: number | null;
  estimatedFat?: number | null;
  mealType: MealType;
  portionSize: PortionSize;
  portionLabel?: string | null;
  portionMultiplier?: number | null;
  portionGrams?: number | null;
  consumedAt: string;
  isCustomEntry: boolean;
  isFromInventory?: boolean;
}

export interface Inventory {
  id: number;
  inventoryGroupId: number;
  ingredientId: number;
  quantity: number;
  grams?: number;
  unit: string;
  ingredient?: Ingredient;
}

export interface InventoryGroup {
  id: number;
  name: string;
  icon?: string | null;
  itemCount: number;
  users: User[];
  items: Inventory[];
}

export interface InventoryConsumeRequest {
  amount: number;
  userIds: string[];
}

// API DTOs
export interface RecommendationRequest {
  userId: string;
  availableIngredients: string[];
  dislikedIngredients?: string[] | null;
  cravings?: string | null;
}

export interface RecommendedRecipe {
  recipeId: number;
  recipeTitle: string;
  insight: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  preparationTimeMinutes?: number | null;
  servings?: number | null;
  averageRating?: number | null;
  imageUrl?: string | null;
}

export interface RecommendationResponse {
  recommendedRecipes: RecommendedRecipe[];
}

export interface ConsumptionRequest {
  userId: string;
  recipeId?: number;
  ingredientId?: number;
  inventoryGroupId?: number;
  foodName: string;
  mealType: MealType;
  portionSize: PortionSize;
  portionLabel?: string | null;
  portionMultiplier?: number | null;
  portionGrams?: number | null;
  isCustomEntry?: boolean | null;
  isFromInventory?: boolean | null;
}

export interface ConsumptionResponse {
  id: number;
  foodName: string;
  recipeId?: number | null;
  ingredientId?: number | null;
  inventoryGroupId?: number | null;
  portionLabel?: string | null;
  portionGrams?: number | null;
  unitGramWeight?: number | null;
  estimatedCalories?: number | null;
  estimatedProtein?: number | null;
  estimatedCarbs?: number | null;
  estimatedFat?: number | null;
  isFromInventory?: boolean | null;
  consumedAt: string;
}

export interface ConsumptionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface InventoryGroupRequest {
  name: string;
  icon?: string;
}

export interface InventoryItemRequest {
  ingredientId: number;
  quantity: number;
  unit: string;
  grams?: number;
  unitGramWeight?: number;
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
