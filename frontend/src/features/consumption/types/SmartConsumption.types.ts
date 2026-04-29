import {
  type ConsumptionResponse,
  type Ingredient,
  InventoryGroup,
  MealType,
  PortionSize,
  Recipe,
  type RecipeListItem
} from '../../../types';

export type { InventoryGroup, Recipe };
import { ChefHat, UtensilsCrossed } from 'lucide-react';

export type EntryMode = 'RECIPE' | 'INGREDIENT';

export type RecipePortionOption = {
  id: string;
  label: string;
  multiplier: number;
  portionSize: PortionSize;
  note: string;
};

export type IngredientPortionOption = {
  id: string;
  label: string;
  grams: number;
  amount?: number;
  unit?: string;
  portionSize: PortionSize;
  note: string;
};

export type NutritionPreview = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type SelectedRecipeItem = {
  key: string;
  kind: 'RECIPE';
  recipe: RecipeListItem;
  portion: RecipePortionOption;
};

export type SelectedIngredientItem = {
  key: string;
  kind: 'INGREDIENT';
  ingredient: Ingredient;
  portion: IngredientPortionOption;
  unit: string;
};

export type SelectedConsumptionItem = SelectedRecipeItem | SelectedIngredientItem;

export type SubmitSummary = {
  responses: ConsumptionResponse[];
  failedNames: string[];
};

export const OUTSIDE_LOCATION = 'outside';

export const ENTRY_MODE_OPTIONS: Array<{ value: EntryMode; label: string; icon: typeof ChefHat }> = [
  { value: 'RECIPE', label: 'Tarif', icon: ChefHat },
  { value: 'INGREDIENT', label: 'Malzeme', icon: UtensilsCrossed }
];

export const MEAL_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: MealType.BREAKFAST, label: 'Kahvalti' },
  { value: MealType.LUNCH, label: 'Ogle' },
  { value: MealType.DINNER, label: 'Aksam' },
  { value: MealType.SNACK, label: 'Ara Ogun' }
];

export const RECIPE_PORTION_OPTIONS: RecipePortionOption[] = [
  { id: 'recipe-half', label: '1/2 bowl', multiplier: 0.5, portionSize: PortionSize.SMALL, note: 'Light tasting' },
  { id: 'recipe-one', label: '1 bowl', multiplier: 1.0, portionSize: PortionSize.MEDIUM, note: 'Standard serving' },
  { id: 'recipe-large', label: '1 large bowl', multiplier: 1.5, portionSize: PortionSize.LARGE, note: 'Hungry lunch' },
  { id: 'recipe-double', label: '2 bowls', multiplier: 2.0, portionSize: PortionSize.LARGE, note: 'Big portion' }
];

export const INGREDIENT_PORTION_OPTIONS: IngredientPortionOption[] = [
  { id: 'ingredient-slice', label: '1 slice', grams: 30, portionSize: PortionSize.SMALL, note: 'Thin cut' },
  { id: 'ingredient-piece', label: '1 piece', grams: 90, portionSize: PortionSize.MEDIUM, note: 'Everyday portion' },
  { id: 'ingredient-bowl', label: '1 bowl', grams: 160, portionSize: PortionSize.LARGE, note: 'Full bowl' },
  { id: 'ingredient-cup', label: '1 cup', grams: 240, portionSize: PortionSize.LARGE, note: 'Generous serving' }
];
