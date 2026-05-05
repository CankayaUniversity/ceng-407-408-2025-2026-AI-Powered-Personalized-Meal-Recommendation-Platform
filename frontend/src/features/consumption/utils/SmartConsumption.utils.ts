import { ApiError } from '../../../services/errors';
import {
  type InventoryGroup,
  type SelectedConsumptionItem,
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
