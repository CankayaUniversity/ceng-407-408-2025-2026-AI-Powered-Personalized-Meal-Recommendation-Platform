import { z } from 'zod';
import {
  RecipeCategory,
  type MenuRecommendationHistoryItem,
  type MenuRecommendationResponse,
  type RecommendationResponse
} from '../types';
import { ApiError } from './errors';

const nullableNumber = z.number().finite().nullable().optional();
const aiGeneratedFlags = z.object({
  isAiGenerated: z.boolean().optional(),
  aiGenerated: z.boolean().optional()
}).refine((value) => value.isAiGenerated !== undefined || value.aiGenerated !== undefined, {
  message: 'Expected isAiGenerated or aiGenerated'
});

const cookedFlags = z.object({
  isCooked: z.boolean().optional(),
  cooked: z.boolean().optional()
});

const recommendedRecipeSchema = z.object({
  recommendationRecipeId: z.number().int(),
  recipeId: z.number().int(),
  recipeTitle: z.string().min(1),
  insight: z.string().min(1),
  matchedIngredients: z.array(z.string()),
  missingIngredients: z.array(z.string()),
  userRating: nullableNumber,
  userComment: z.string().nullable().optional(),
  calories: nullableNumber,
  kcalPerServing: nullableNumber,
  protein: nullableNumber,
  carbs: nullableNumber,
  fat: nullableNumber,
  preparationTimeMinutes: nullableNumber,
  servings: nullableNumber,
  averageRating: nullableNumber,
  ratingCount: nullableNumber,
  imageUrl: z.string().nullable().optional(),
  totalCookCount: z.number().int().optional()
}).merge(cookedFlags).strict().transform(({ cooked, isCooked, ...recipe }) => ({
  ...recipe,
  isCooked: isCooked ?? cooked ?? false
}));

const recommendationResponseSchema = z.object({
  id: z.number().int(),
  createdAt: z.string().min(1),
  cravings: z.string().nullable().optional(),
  recommendedRecipes: z.array(recommendedRecipeSchema)
}).merge(aiGeneratedFlags).strict().transform(({ aiGenerated, isAiGenerated, ...response }) => ({
  ...response,
  isAiGenerated: isAiGenerated ?? aiGenerated ?? false
}));

const menuCourseRecipeSchema = z.object({
  recommendationRecipeId: z.number().int().nullable().optional(),
  recipeId: z.number().int(),
  recipeTitle: z.string().min(1),
  category: z.nativeEnum(RecipeCategory),
  imageUrl: z.string().nullable().optional(),
  kcalPerServing: nullableNumber,
  proteinPerServing: nullableNumber,
  carbsPerServing: nullableNumber,
  fatPerServing: nullableNumber,
  preparationTimeMinutes: nullableNumber,
  servings: nullableNumber,
  averageRating: nullableNumber,
  ratingCount: nullableNumber,
  totalCookCount: nullableNumber,
  matchedIngredients: z.array(z.string()),
  missingIngredients: z.array(z.string())
}).merge(cookedFlags).strict().transform(({ cooked, isCooked, ...recipe }) => ({
  ...recipe,
  isCooked: isCooked ?? cooked ?? false
}));

const menuRecommendationSchema = z.object({
  rank: z.number().int().positive(),
  title: z.string().min(1),
  courses: z.partialRecord(z.nativeEnum(RecipeCategory), menuCourseRecipeSchema),
  insight: z.string().min(1),
  totalKcal: z.number().finite(),
  totalProtein: z.number().finite(),
  totalCarbs: z.number().finite(),
  totalFat: z.number().finite(),
  totalPreparationTime: z.number().int()
}).strict();

const menuRecommendationResponseSchema = z.object({
  generatedAt: z.string().min(1),
  menus: z.array(menuRecommendationSchema)
}).merge(aiGeneratedFlags).strict().transform(({ aiGenerated, isAiGenerated, ...response }) => ({
  ...response,
  isAiGenerated: isAiGenerated ?? aiGenerated ?? false
}));

const menuRecommendationHistoryItemSchema = z.object({
  id: z.number().int(),
  createdAt: z.string().min(1),
  cravings: z.string().nullable().optional(),
  aiModel: z.string().nullable().optional(),
  menus: z.array(menuRecommendationSchema)
}).merge(aiGeneratedFlags).strict().transform(({ aiGenerated, isAiGenerated, ...response }) => ({
  ...response,
  isAiGenerated: isAiGenerated ?? aiGenerated ?? false
}));

const parseSchema = <T>(schema: z.ZodType<T>, data: unknown, label: string): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`${label} schema validation failed`, z.treeifyError(result.error));
    throw new ApiError(`${label} response did not match the expected schema.`, 'INVALID_RESPONSE');
  }
  return result.data;
};

export const validateRecommendationResponse = (data: unknown): RecommendationResponse =>
  parseSchema(recommendationResponseSchema, data, 'Recommendation');

export const validateRecommendationHistory = (data: unknown): RecommendationResponse[] =>
  parseSchema(z.array(recommendationResponseSchema), data, 'Recommendation history');

export const validateMenuRecommendationResponse = (data: unknown): MenuRecommendationResponse =>
  parseSchema(menuRecommendationResponseSchema, data, 'Menu recommendation');

export const validateMenuRecommendationHistory = (data: unknown): MenuRecommendationHistoryItem[] =>
  parseSchema(z.array(menuRecommendationHistoryItemSchema), data, 'Menu recommendation history');
