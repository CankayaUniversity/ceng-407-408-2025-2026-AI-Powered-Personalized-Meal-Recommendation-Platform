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
  bmi?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  profileImageUrl?: string | null;
  role?: 'USER' | 'ADMIN';
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INVITATION' | 'SYSTEM' | 'REMINDER' | 'RECIPE_APPROVAL' | 'LOW_STOCK';
  targetId?: string;
  status: 'UNREAD' | 'READ';
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  recipeStatus?: RecipeStatus;
  createdAt: string;
}

export interface RecipeListItem {
  id: number;
  title: string;
  category?: RecipeCategory | null;
  dietType?: DietType | null;
  totalCalories?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  preparationTimeMinutes?: number | null;
  servings?: number | null;
  averageRating?: number | null;
  ratingCount?: number | null;
  userRating?: number | null;
  imageUrl?: string | null;
  status?: RecipeStatus;
  difficulty?: string | null;
  createdBy?: string;
  createdAt?: string;
  parentId?: number | null;
  versionNumber?: number | null;
  isFavorite?: boolean;
  kcalPerServing?: number | null;
}

export interface Recipe extends Omit<RecipeListItem, 'difficulty'> {
  description?: string | null;
  difficulty?: Difficulty | null;
  servings?: number | null;
  instructions?: string | null;
  ingredients?: RecipeIngredient[];
  ratings?: RecipeRating[];
  dietType?: DietType | null;
  calories?: number | null;
  kcalPerServing?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  imageUrl?: string | null;
  preparationTimeMinutes?: number | null;
}

export interface Ingredient {
  id: number;
  name: string;
  category: IngredientCategory;
  nutrition?: IngredientNutrition;
  density?: number;
  physicalState?: PhysicalState;
  preferredUnit?: string;
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
  id?: number;
  recipeId?: number;
  ingredientId: number;
  name?: string | null;
  grams: number;
  amount?: number;
  unit?: string;
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
  categoryCount: number;
  lowStockCount: number;
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
  allergies?: string[] | null;
  dietaryGoal?: string | null;
  dietType?: string | null;
  cravings?: string | null;
  aiModel?: string | null;
  apiKey?: string | null;
}

export interface RecommendedRecipe {
  recommendationRecipeId: number;
  recipeId: number;
  recipeTitle: string;
  insight: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  userRating?: number | null;
  userComment?: string | null;
  calories?: number | null;
  kcalPerServing?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  preparationTimeMinutes?: number | null;
  servings?: number | null;
  averageRating?: number | null;
  ratingCount?: number | null;
  imageUrl?: string | null;
  isCooked?: boolean;
  totalCookCount?: number;
}

export interface RecommendationResponse {
  id: number;
  createdAt: string;
  cravings?: string | null;
  isAiGenerated: boolean;
  recommendedRecipes: RecommendedRecipe[];
}

export interface ConsumptionRequest {
  userId?: string | null;
  recipeId?: number;
  ingredientId?: number;
  inventoryGroupId?: number;
  foodName?: string | null;
  mealType: MealType;
  portionSize?: PortionSize | null;
  portionLabel?: string | null;
  portionMultiplier?: number | null;
  portionAmount?: number | null;
  portionUnit?: string | null;
  portionGrams?: number | null;
  isCustomEntry?: boolean | null;
  isFromInventory?: boolean | null;
  members?: MemberConsumption[] | null;
}

export interface MemberConsumption {
  userId: string;
  portionMultiplier?: number | null;
  portionAmount?: number | null;
  portionUnit?: string | null;
  portionGrams?: number | null;
  portionLabel?: string | null;
  recipeId?: number;
  ingredientId?: number;
  foodName?: string;
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
  totalMeals: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface ConsumptionAnalysis {
  startDate: string;
  endDate: string;
  period: 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  avgCalories: number;
  totals: AnalysisSummary;
  averages: AnalysisSummary;
  dailyDetails: DailyAnalysisDetail[];
}

export interface AnalysisSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyAnalysisDetail {
  date: string;
  consumedCalories: number;
  targetCalories: number;
  deviation: number;
  protein: number;
  carbs: number;
  fat: number;
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
  updateMode?: 'ADD' | 'SUBTRACT' | 'SET';
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

export enum RecipeStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUPERSEDED = 'SUPERSEDED'
}

export enum RecipeCategory {
  ANA_YEMEKLER = 'ANA_YEMEKLER',
  CORBALAR = 'CORBALAR',
  KAHVALTILIK_VE_BRANCH = 'KAHVALTILIK_VE_BRANCH',
  HAMUR_ISLERI_VE_BOREKLER = 'HAMUR_ISLERI_VE_BOREKLER',
  TATLILAR_VE_PASTALAR = 'TATLILAR_VE_PASTALAR',
  SALATALAR_VE_MEZELER = 'SALATALAR_VE_MEZELER',
  ATISTIRMALIKLAR_VE_APARATIFLER = 'ATISTIRMALIKLAR_VE_APARATIFLER',
  ICECEKLER = 'ICECEKLER'
}

export interface RecipeIngredientRequest {
  ingredientId?: number;
  ingredientName?: string;
  amount: number;
  unit: string;
  grams?: number;
}

export interface RecipeRequest {
  title: string;
  category?: RecipeCategory;
  dietType?: DietType;
  instructions?: string;
  preparationTimeMinutes?: number;
  servings?: number;
  difficulty?: Difficulty;
  ingredients?: RecipeIngredientRequest[];
  status?: RecipeStatus;
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

export interface EnumDefinition {
  value: string;
  label: string;
}

export interface EnumDefinitions {
  dietTypes: EnumDefinition[];
  dietaryGoals: EnumDefinition[];
  genders: EnumDefinition[];
  activityLevels: EnumDefinition[];
  difficulties: EnumDefinition[];
  recipeCategories: EnumDefinition[];
  ingredientCategories: EnumDefinition[];
  physicalStates: EnumDefinition[];
  mealTypes: EnumDefinition[];
  portionSizes: EnumDefinition[];
}

export interface UnitConversion {
  unit: string;
  amount: number;
  displayName: string;
  highPriority: boolean;
}
