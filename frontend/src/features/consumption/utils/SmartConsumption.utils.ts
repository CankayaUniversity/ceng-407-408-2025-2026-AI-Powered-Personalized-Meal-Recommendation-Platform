import { ApiError } from '../../../services/errors';
import {
  type InventoryGroup,
  type SelectedConsumptionItem,
  type NutritionPreview,
  type EntryMode
} from '../types/SmartConsumption.types';

export const locationLabel = (group: InventoryGroup | null) => group?.name ?? 'Disari / Diger';

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

export const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

export const formatMacro = (value?: number | null) =>
  value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value)}g`;

export const formatCalories = (value?: number | null) =>
  value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value)} kcal`;

export const scaleValue = (value: number | null | undefined, factor: number) =>
  value == null ? null : Math.round(value * factor * 10) / 10;

export const roundValue = (value: number) => Math.round(value * 10) / 10;

export const formatCategoryLabel = (value?: string | null) => value?.replace(/_/g, ' ') ?? 'Genel';

export const getItemKey = (kind: EntryMode, id: number) => `${kind}-${id}`;

export const getSelectedItemName = (item: SelectedConsumptionItem) =>
  item.kind === 'RECIPE' ? item.recipe.title : item.ingredient.name;

export const getSelectedItemCategory = (item: SelectedConsumptionItem) =>
  item.kind === 'RECIPE'
    ? formatCategoryLabel(item.recipe.category)
    : formatCategoryLabel(item.ingredient.category);

export const getSelectedItemNutrition = (item: SelectedConsumptionItem): NutritionPreview => {
  if (item.kind === 'RECIPE') {
    const factor = item.portion.multiplier;
    return {
      calories: scaleValue(item.recipe.totalCalories, factor),
      protein: scaleValue(item.recipe.totalProtein, factor),
      carbs: scaleValue(item.recipe.totalCarbs, factor),
      fat: scaleValue(item.recipe.totalFat, factor)
    };
  }

  // Ingredient nutrition sources (nested or flat)
  const caloriesPer100g = item.ingredient.caloriesPer100g ?? item.ingredient.nutrition?.caloriesPer100g;
  const proteinPer100g = item.ingredient.proteinPer100g ?? item.ingredient.nutrition?.proteinPer100g;
  const carbsPer100g = item.ingredient.carbsPer100g ?? item.ingredient.nutrition?.carbsPer100g;
  const fatPer100g = item.ingredient.fatPer100g ?? item.ingredient.nutrition?.fatPer100g;

  if (caloriesPer100g == null && proteinPer100g == null && carbsPer100g == null && fatPer100g == null) {
    return {
      calories: null,
      protein: null,
      carbs: null,
      fat: null
    };
  }

  const factor = item.portion.grams / 100;
  return {
    calories: scaleValue(caloriesPer100g, factor),
    protein: scaleValue(proteinPer100g, factor),
    carbs: scaleValue(carbsPer100g, factor),
    fat: scaleValue(fatPer100g, factor)
  };
};

export const sumNutrition = (previews: NutritionPreview[]): NutritionPreview => {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };
  const hasValues = {
    calories: false,
    protein: false,
    carbs: false,
    fat: false
  };

  previews.forEach((preview) => {
    if (preview.calories != null) {
      totals.calories += preview.calories;
      hasValues.calories = true;
    }
    if (preview.protein != null) {
      totals.protein += preview.protein;
      hasValues.protein = true;
    }
    if (preview.carbs != null) {
      totals.carbs += preview.carbs;
      hasValues.carbs = true;
    }
    if (preview.fat != null) {
      totals.fat += preview.fat;
      hasValues.fat = true;
    }
  });

  return {
    calories: hasValues.calories ? totals.calories : null,
    protein: hasValues.protein ? totals.protein : null,
    carbs: hasValues.carbs ? totals.carbs : null,
    fat: hasValues.fat ? totals.fat : null
  };
};
