import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock3,
  Home,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Soup,
  Sparkles,
  UtensilsCrossed,
  X
} from 'lucide-react';
import { useAuth } from '../infrastructure/auth/AuthContext';
import { useConsumptionService } from '../services/consumptionService';
import { ApiError } from '../services/errors';
import { useInventoryService } from '../services/inventoryService';
import { useRecipeService } from '../services/recipeService';
import {
  type ConsumptionResponse,
  type Ingredient,
  type InventoryGroup,
  MealType,
  PortionSize,
  type RecipeListItem
} from '../types';

type EntryMode = 'RECIPE' | 'INGREDIENT';

type RecipePortionOption = {
  id: string;
  label: string;
  multiplier: number;
  portionSize: PortionSize;
  note: string;
};

type IngredientPortionOption = {
  id: string;
  label: string;
  grams: number;
  portionSize: PortionSize;
  note: string;
};

type NutritionPreview = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type SelectedRecipeItem = {
  key: string;
  kind: 'RECIPE';
  recipe: RecipeListItem;
  portion: RecipePortionOption;
};

type SelectedIngredientItem = {
  key: string;
  kind: 'INGREDIENT';
  ingredient: Ingredient;
  portion: IngredientPortionOption;
};

type SelectedConsumptionItem = SelectedRecipeItem | SelectedIngredientItem;

type SubmitSummary = {
  responses: ConsumptionResponse[];
  failedNames: string[];
};

const OUTSIDE_LOCATION = 'outside';

const ENTRY_MODE_OPTIONS: Array<{ value: EntryMode; label: string; icon: typeof ChefHat }> = [
  { value: 'RECIPE', label: 'Tarif', icon: ChefHat },
  { value: 'INGREDIENT', label: 'Malzeme', icon: UtensilsCrossed }
];

const MEAL_OPTIONS: Array<{ value: MealType; label: string }> = [
  { value: MealType.BREAKFAST, label: 'Kahvalti' },
  { value: MealType.LUNCH, label: 'Ogle' },
  { value: MealType.DINNER, label: 'Aksam' },
  { value: MealType.SNACK, label: 'Ara Ogun' }
];

const RECIPE_PORTION_OPTIONS: RecipePortionOption[] = [
  { id: 'recipe-half', label: '1/2 bowl', multiplier: 0.5, portionSize: PortionSize.SMALL, note: 'Light tasting' },
  { id: 'recipe-one', label: '1 bowl', multiplier: 1.0, portionSize: PortionSize.MEDIUM, note: 'Standard serving' },
  { id: 'recipe-large', label: '1 large bowl', multiplier: 1.5, portionSize: PortionSize.LARGE, note: 'Hungry lunch' },
  { id: 'recipe-double', label: '2 bowls', multiplier: 2.0, portionSize: PortionSize.LARGE, note: 'Big portion' }
];

const INGREDIENT_PORTION_OPTIONS: IngredientPortionOption[] = [
  { id: 'ingredient-slice', label: '1 slice', grams: 30, portionSize: PortionSize.SMALL, note: 'Thin cut' },
  { id: 'ingredient-piece', label: '1 piece', grams: 90, portionSize: PortionSize.MEDIUM, note: 'Everyday portion' },
  { id: 'ingredient-bowl', label: '1 bowl', grams: 160, portionSize: PortionSize.LARGE, note: 'Full bowl' },
  { id: 'ingredient-cup', label: '1 cup', grams: 240, portionSize: PortionSize.LARGE, note: 'Generous serving' }
];

const locationLabel = (group: InventoryGroup | null) => group?.name ?? 'Disari / Diger';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

const formatMacro = (value?: number | null) =>
    value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value)}g`;

const formatCalories = (value?: number | null) =>
    value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value)} kcal`;

const scaleValue = (value: number | null | undefined, factor: number) =>
    value == null ? null : Math.round(value * factor * 10) / 10;

const roundValue = (value: number) => Math.round(value * 10) / 10;

const formatCategoryLabel = (value?: string | null) => value?.replace(/_/g, ' ') ?? 'Genel';

const getItemKey = (kind: EntryMode, id: number) => `${kind}-${id}`;

const getSelectedItemName = (item: SelectedConsumptionItem) =>
    item.kind === 'RECIPE' ? item.recipe.title : item.ingredient.name;

const getSelectedItemCategory = (item: SelectedConsumptionItem) =>
    item.kind === 'RECIPE'
        ? formatCategoryLabel(item.recipe.category)
        : formatCategoryLabel(item.ingredient.category);

const getSelectedItemNutrition = (item: SelectedConsumptionItem): NutritionPreview => {
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

const sumNutrition = (previews: NutritionPreview[]): NutritionPreview => {
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
    calories: hasValues.calories ? Math.round(totals.calories) : null,
    protein: hasValues.protein ? roundValue(totals.protein) : null,
    carbs: hasValues.carbs ? roundValue(totals.carbs) : null,
    fat: hasValues.fat ? roundValue(totals.fat) : null
  };
};

const summarizeResponses = (responses: ConsumptionResponse[]): NutritionPreview =>
    sumNutrition(
        responses.map((response) => ({
          calories: response.estimatedCalories ?? null,
          protein: response.estimatedProtein ?? null,
          carbs: response.estimatedCarbs ?? null,
          fat: response.estimatedFat ?? null
        }))
    );

const formatNameList = (names: string[], max = 3) => {
  const visibleNames = names.slice(0, max);
  if (visibleNames.length === 0) return '';
  if (names.length <= max) return visibleNames.join(', ');
  return `${visibleNames.join(', ')} ve ${names.length - max} oge daha`;
};

type SmartConsumptionPanelProps = {
  onConsumptionLogged?: (response: ConsumptionResponse) => void | Promise<void>;
};

const SmartConsumptionPanel: React.FC<SmartConsumptionPanelProps> = ({ onConsumptionLogged }) => {
  const { authenticated, user } = useAuth();
  const inventoryService = useInventoryService();
  const recipeService = useRecipeService();
  const consumptionService = useConsumptionService();

  const [unitWeights, setUnitWeights] = useState<Record<string, number>>({});
  const [ingredientSpecificWeights, setIngredientSpecificWeights] = useState<Record<number, Record<string, number>>>({});

  const standardUnitsSet = useMemo(() => ['GRAM', 'ML', 'KG', 'LITRE', 'L'], []);

  const loadUnitWeights = async (ingredientId?: number) => {
    try {
      const weights = await consumptionService.getUnitWeights(ingredientId);
      if (ingredientId) {
        setIngredientSpecificWeights(prev => ({ ...prev, [ingredientId]: weights }));
      } else {
        setUnitWeights(weights);
      }
    } catch (error) {
      console.error('Birim ağırlıkları yüklenemedi:', error);
    }
  };

  const getIngredientUnits = (ingredientId?: number) => {
    const ingredient = ingredientId ? (ingredientResults.find(i => i.id === ingredientId) || stockedIngredients.find(i => i.id === ingredientId)) : null;
    const physicalState = ingredient?.physicalState;

    // Temel birim setleri
    const solidBase = ['GRAM', 'KG'];
    const liquidBase = ['ML', 'LITRE', 'L'];
    const commonBase = ['GRAM', 'ML', 'KG', 'LITRE', 'L'];

    let base = commonBase;
    if (physicalState === 'SOLID') base = solidBase;
    if (physicalState === 'LIQUID') base = liquidBase;

    const weights = (ingredientId && ingredientSpecificWeights[ingredientId]) || unitWeights;
    
    // Backend'den gelen birimleri al
    const extra = Object.keys(weights).map(u => u.toUpperCase());
    
    // Birleştir
    const allUnits = Array.from(new Set([...base, ...extra]));
    
    // Hızlı birimler için izin verilen liste
    const allowedQuickUnits = ['PAKET', 'PORSIYON', 'DILIM', 'CUP', 'ADET', 'KASE', 'BARDAK'];

    // Hızlı birimler
    const quick = allUnits
      .filter(u => allowedQuickUnits.includes(u))
      .sort((a, b) => {
          const idxA = allowedQuickUnits.indexOf(a);
          const idxB = allowedQuickUnits.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.localeCompare(b);
      });

    // Standart birimler (Hızlı olmayan ve base olanlar + diğer her şey)
    const standard = allUnits.filter(u => !allowedQuickUnits.includes(u));

    return {
      quickUnits: quick,
      standardUnits: standard.sort((a, b) => {
          if (a === 'GRAM') return -1;
          if (b === 'GRAM') return 1;
          if (a === 'ML') return -1;
          if (b === 'ML') return 1;
          return a.localeCompare(b);
      })
    };
  };
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(OUTSIDE_LOCATION);
  const [entryMode, setEntryMode] = useState<EntryMode>('RECIPE');
  const [mealType, setMealType] = useState<MealType>(MealType.LUNCH);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery.trim());
  const [recipeResults, setRecipeResults] = useState<RecipeListItem[]>([]);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedConsumptionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitSummary, setSubmitSummary] = useState<SubmitSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedGroup = useMemo(
      () => inventoryGroups.find((group) => String(group.id) === selectedLocationId) ?? null,
      [inventoryGroups, selectedLocationId]
  );
  const stockedIngredients = useMemo(
      () =>
          (selectedGroup?.items ?? [])
              .flatMap((item) => (item.ingredient ? [item.ingredient] : []))
              .sort((left, right) => left.name.localeCompare(right.name, 'tr-TR')),
      [selectedGroup]
  );
  const selectedRecipeIds = useMemo(
      () => new Set(selectedItems.filter((item): item is SelectedRecipeItem => item.kind === 'RECIPE').map((item) => item.recipe.id)),
      [selectedItems]
  );
  const selectedIngredientIds = useMemo(
      () => new Set(selectedItems.filter((item): item is SelectedIngredientItem => item.kind === 'INGREDIENT').map((item) => item.ingredient.id)),
      [selectedItems]
  );
  const isOutside = selectedLocationId === OUTSIDE_LOCATION;
  const isSearchStale = searchQuery.trim() !== deferredQuery;
  const selectionLabel = useMemo(() => {
    if (selectedItems.length === 0) return 'Secim bekleniyor';
    if (selectedItems.length === 1) return getSelectedItemName(selectedItems[0]);
    return `${selectedItems.length} oge hazir`;
  }, [selectedItems]);
  const summaryTitle = useMemo(() => {
    if (selectedItems.length === 0) return 'Secimini bekliyorum';
    if (selectedItems.length === 1) return getSelectedItemName(selectedItems[0]);
    return `${selectedItems.length} oge secildi`;
  }, [selectedItems]);
  const summarySubtitle = useMemo(
      () => formatNameList(selectedItems.map((item) => getSelectedItemName(item))),
      [selectedItems]
  );
  const nutritionPreview = useMemo(
      () => sumNutrition(selectedItems.map((item) => getSelectedItemNutrition(item))),
      [selectedItems]
  );
  const submittedNutrition = useMemo(
      () => summarizeResponses(submitSummary?.responses ?? []),
      [submitSummary]
  );

  useEffect(() => {
    if (authenticated) {
      void loadUnitWeights();
    }
  }, [authenticated]);

  const [expandedManualInputs, setExpandedManualInputs] = useState<Record<string, boolean>>({});

  const toggleManualInput = (itemKey: string) => {
    setExpandedManualInputs(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const handleManualPortionUpdate = (itemKey: string, ingredient: Ingredient, value: string, unit: string) => {
    const quantity = parseFloat(value);
    if (isNaN(quantity) || quantity <= 0) return;

    const weights = (ingredient.id && ingredientSpecificWeights[ingredient.id]) || unitWeights;
    const upperUnit = unit.toUpperCase();
    
    let grams = quantity;
    if (upperUnit === 'KG') grams = quantity * 1000;
    else if (upperUnit === 'ML' || upperUnit === 'LITRE') {
        const density = ingredient.density || 1.0;
        const volumeMl = upperUnit === 'LITRE' ? quantity * 1000 : quantity;
        grams = volumeMl * density;
    } else if (!standardUnitsSet.includes(upperUnit)) {
        const unitWeight = weights[unit.toLowerCase()] || 0;
        grams = quantity * unitWeight;
    }

    handleIngredientPortionChange(itemKey, {
        id: `manual-${unit}-${value}`,
        label: `${value} ${unit}`,
        grams: grams,
        portionSize: PortionSize.MEDIUM,
        note: 'Manuel giris'
    });
  };

  const handleQuickUnitAdjust = (itemKey: string, ingredient: Ingredient, unit: string, delta: number) => {
    const item = selectedItems.find(i => i.key === itemKey);
    if (!item || item.kind !== 'INGREDIENT') return;

    const currentParts = item.portion.label.split(' ');
    const currentQty = parseFloat(currentParts[0]) || 0;
    const currentUnit = currentParts.length > 1 ? currentParts[1] : '';

    let nextQty: number;
    let nextUnit: string;

    if (currentUnit.toLowerCase() === unit.toLowerCase()) {
      nextQty = Math.max(0, currentQty + delta);
      nextUnit = unit;
    } else {
      nextQty = delta > 0 ? delta : 0;
      nextUnit = unit;
    }

    if (nextQty === 0) {
      // If we reach 0, maybe we should keep it at 0 or a small default, 
      // but usually for increment/decrement we want at least a small amount if it was selected.
      // However, the user said "add/remove from cart" logic.
      // If it becomes 0, we'll just set it to 0. handleManualPortionUpdate handles NaN/<=0 check though.
      // Let's allow 0 for internal state if needed, but handleManualPortionUpdate currently ignores it.
      // We'll use 0.001 or just allow it to be handled.
      if (delta < 0 && currentQty <= Math.abs(delta)) {
          nextQty = 0;
      }
    }

    if (nextQty > 0) {
      handleManualPortionUpdate(itemKey, ingredient, nextQty.toString(), nextUnit);
    } else {
        // If 0, we might want to reset to a default or just leave it at a very small value
        // or actually remove the item? No, user just wants to adjust amount.
        // Let's set it to a minimum or just don't update if it's already small.
        handleManualPortionUpdate(itemKey, ingredient, "0.1", nextUnit);
    }
  };

  const loadInventoryGroups = async () => {
    try {
      const groups = await inventoryService.getInventoryGroups();
      setInventoryGroups(groups);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Lokasyon bilgileri yüklenemedi.'));
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    void loadInventoryGroups();
  }, [authenticated]);

  useEffect(() => {
    setSearchQuery('');
    setRecipeResults([]);
    setIngredientResults([]);
    setSelectedItems([]);
    setErrorMessage(null);
    setSubmitSummary(null);
  }, [entryMode]);

  useEffect(() => {
    if (!authenticated) return;
    if (deferredQuery.length < 2) {
      setRecipeResults([]);
      setIngredientResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    const abortController = new AbortController();

    const runSearch = async () => {
      setSearching(true);
      try {
        if (entryMode === 'RECIPE') {
          const recipes = await recipeService.getRecipes({
            title: deferredQuery,
            page: 0,
            size: 6,
            signal: abortController.signal
          });
          if (!active) return;
          startTransition(() => {
            setRecipeResults(recipes.filter((recipe) => !selectedRecipeIds.has(recipe.id)));
            setIngredientResults([]);
          });
          return;
        }

        if (!isOutside) {
          const normalizedQuery = normalizeSearchText(deferredQuery);
          const ingredients = stockedIngredients
              .filter((ingredient) => normalizeSearchText(ingredient.name).includes(normalizedQuery))
              .filter((ingredient) => !selectedIngredientIds.has(ingredient.id))
              .slice(0, 6);
          if (!active) return;
          startTransition(() => {
            setIngredientResults(ingredients);
            setRecipeResults([]);
          });
          return;
        }

        const ingredients = await inventoryService.searchIngredients(deferredQuery, 6);
        if (!active) return;
        startTransition(() => {
          setIngredientResults(ingredients.filter((ingredient) => !selectedIngredientIds.has(ingredient.id)));
          setRecipeResults([]);
        });
      } catch (error) {
        if (!active) return;
        setErrorMessage(getErrorMessage(error, 'Arama sonuçları yüklenemedi.'));
      } finally {
        if (active) setSearching(false);
      }
    };

    void runSearch();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [
    authenticated,
    deferredQuery,
    entryMode,
    inventoryService,
    isOutside,
    recipeService,
    selectedIngredientIds,
    selectedRecipeIds,
    stockedIngredients
  ]);

  useEffect(() => {
    if (entryMode !== 'INGREDIENT' || isOutside) return;

    const stockedIngredientIds = new Set(stockedIngredients.map((ingredient) => ingredient.id));
    const nextItems = selectedItems.filter(
        (item) => item.kind !== 'INGREDIENT' || stockedIngredientIds.has(item.ingredient.id)
    );

    if (nextItems.length !== selectedItems.length) {
      setSelectedItems(nextItems);
      setSubmitSummary(null);
    }
  }, [entryMode, isOutside, selectedItems, stockedIngredients]);

  if (!authenticated || !user) return null;

  const handleRecipeSelect = (recipe: RecipeListItem) => {
    const key = getItemKey('RECIPE', recipe.id);

    setSelectedItems((current) => {
      if (current.some((item) => item.key === key)) return current;
      return [
        ...current,
        {
          key,
          kind: 'RECIPE',
          recipe,
          portion: RECIPE_PORTION_OPTIONS[1]
        }
      ];
    });
    setSearchQuery('');
    setRecipeResults([]);
    setIngredientResults([]);
    setErrorMessage(null);
    setSubmitSummary(null);
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    const key = getItemKey('INGREDIENT', ingredient.id);

    // Fetch specific weights for this ingredient
    if (!ingredientSpecificWeights[ingredient.id]) {
      void loadUnitWeights(ingredient.id);
    }

    setSelectedItems((current) => {
      if (current.some((item) => item.key === key)) return current;
      return [
        ...current,
        {
          key,
          kind: 'INGREDIENT',
          ingredient,
          portion: INGREDIENT_PORTION_OPTIONS[1] || { label: '100g', grams: 100, portionSize: 100 }
        }
      ];
    });
    setSearchQuery('');
    setRecipeResults([]);
    setIngredientResults([]);
    setErrorMessage(null);
    setSubmitSummary(null);
  };

  const handleRemoveItem = (itemKey: string) => {
    setSelectedItems((current) => current.filter((item) => item.key !== itemKey));
    setSubmitSummary(null);
    setErrorMessage(null);
  };

  const handleRecipePortionChange = (itemKey: string, nextPortion: RecipePortionOption) => {
    setSelectedItems((current) =>
        current.map((item) =>
            item.key === itemKey && item.kind === 'RECIPE'
                ? { ...item, portion: nextPortion }
                : item
        )
    );
    setSubmitSummary(null);
  };

  const handleIngredientPortionChange = (itemKey: string, nextPortion: IngredientPortionOption) => {
    setSelectedItems((current) =>
        current.map((item) =>
            item.key === itemKey && item.kind === 'INGREDIENT'
                ? { ...item, portion: nextPortion }
                : item
        )
    );
    setSubmitSummary(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedItems.length === 0) {
      setErrorMessage('Önce en az bir tarif veya malzeme seç.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSubmitSummary(null);

    try {
      const itemsToSubmit = [...selectedItems];
      const results = await Promise.allSettled(
          itemsToSubmit.map((item) =>
              consumptionService.logConsumption({
                userId: user.id,
                recipeId: item.kind === 'RECIPE' ? item.recipe.id : undefined,
                ingredientId: item.kind === 'INGREDIENT' ? item.ingredient.id : undefined,
                inventoryGroupId: !isOutside && selectedGroup ? selectedGroup.id : undefined,
                foodName: getSelectedItemName(item),
                mealType,
                portionSize: item.portion.portionSize,
                portionLabel: item.portion.label,
                portionMultiplier: item.kind === 'RECIPE' ? item.portion.multiplier : undefined,
                portionGrams: item.kind === 'INGREDIENT' ? item.portion.grams : undefined,
                isCustomEntry: false,
                isFromInventory: !isOutside && Boolean(selectedGroup)
              })
          )
      );

      const successfulResponses: ConsumptionResponse[] = [];
      const failedItems: SelectedConsumptionItem[] = [];
      let firstFailureMessage: string | null = null;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResponses.push(result.value);
          return;
        }

        failedItems.push(itemsToSubmit[index]);
        if (!firstFailureMessage) {
          firstFailureMessage = getErrorMessage(result.reason, 'Tuketim kaydi olusturulamadi.');
        }
      });

      setSearchQuery('');
      setSelectedItems(failedItems);
      setRecipeResults([]);
      setIngredientResults([]);

      if (successfulResponses.length > 0) {
        setSubmitSummary({
          responses: successfulResponses,
          failedNames: failedItems.map((item) => getSelectedItemName(item))
        });
      }

      if (failedItems.length > 0) {
        const failedLabel = formatNameList(failedItems.map((item) => getSelectedItemName(item)), 4);
        const prefix = successfulResponses.length > 0
            ? `${successfulResponses.length} oge kaydedildi ancak bazi ogeler tekrar denemeli.`
            : 'Secilen ogeler kaydedilemedi.';
        setErrorMessage(`${prefix} ${failedLabel}${firstFailureMessage ? ` · ${firstFailureMessage}` : ''}`);
      }

      if (successfulResponses.length > 0 && !isOutside && selectedGroup) {
        await loadInventoryGroups();
      }

      if (onConsumptionLogged && successfulResponses.length > 0) {
        await Promise.allSettled(
            successfulResponses.map((response) => Promise.resolve(onConsumptionLogged(response)))
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resultCards = entryMode === 'RECIPE' ? recipeResults : ingredientResults;
  const activeEntryModeLabel = ENTRY_MODE_OPTIONS.find((option) => option.value === entryMode)?.label ?? entryMode;
  const successTitle = submitSummary
      ? submitSummary.failedNames.length > 0
          ? `${submitSummary.responses.length} oge kaydedildi, ${submitSummary.failedNames.length} oge tekrar bekliyor`
          : `${submitSummary.responses.length} oge basariyla kaydedildi`
      : null;
  const successNames = submitSummary ? formatNameList(submitSummary.responses.map((response) => response.foodName)) : '';
  const successUsesInventory = submitSummary?.responses.some((response) => Boolean(response.isFromInventory)) ?? false;

  return (
      <section className="meal-card rounded-[2.75rem] shadow-brand-hero">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="meal-badge-neon px-4 text-[11px] font-bold tracking-[0.22em]">
                <Sparkles size={14} />
                Smart Consumption
              </div>
              <h2 className="meal-section-title mt-4 text-4xl lg:text-5xl">Ne yediğini hızlıca kaydet, gerekiyorsa stoğu otomatik düş.</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-espresso-midnight/60 dark:text-alabaster/60">
                Home veya Office seçersen tarifin içindeki malzemeler seçili lokasyondan otomatik düşülür. Outside / Other seçeneğinde ise yalnızca kalori ve makrolar loglanır.
              </p>
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="meal-metric-card px-5 py-4 dark:bg-white/5">
                <p className="meal-overline tracking-[0.18em]">Mode</p>
                <p className="mt-3 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{activeEntryModeLabel}</p>
              </div>
              <div className="meal-metric-card px-5 py-4 dark:bg-white/5">
                <p className="meal-overline tracking-[0.18em]">Location</p>
                <p className="mt-3 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{locationLabel(selectedGroup)}</p>
              </div>
              <div className="meal-metric-card col-span-2 px-5 py-4 dark:bg-white/5 sm:col-span-1 border-terracotta/20">
                <p className="meal-overline tracking-[0.18em]">Selected</p>
                <p className="mt-3 text-sm font-bold text-terracotta">{selectionLabel}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-white/40 p-6 backdrop-blur-sm dark:bg-white/[0.02]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="meal-overline tracking-[0.18em] text-espresso-midnight/50 dark:text-alabaster/50">Meal Context</p>
                <h3 className="text-xl font-bold text-espresso-midnight dark:text-alabaster">Nerede ve hangi öğünde yedin?</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2 rounded-2xl bg-white/50 p-1.5 dark:bg-white/5">
                  <button
                      type="button"
                      onClick={() => {
                        setSelectedLocationId(OUTSIDE_LOCATION);
                        setSubmitSummary(null);
                      }}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                          isOutside ? 'bg-espresso-midnight text-white shadow-lg' : 'text-espresso-midnight/60 hover:text-terracotta dark:text-alabaster/60'
                      }`}
                  >
                    <MapPin size={16} />
                    Dışarı
                  </button>
                  {inventoryGroups.map((group) => (
                      <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setSelectedLocationId(String(group.id));
                            setSubmitSummary(null);
                          }}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                              selectedLocationId === String(group.id)
                                  ? 'bg-terracotta text-white shadow-lg'
                                  : 'text-espresso-midnight/60 hover:text-terracotta dark:text-alabaster/60'
                          }`}
                      >
                        <Home size={16} />
                        {group.name}
                      </button>
                  ))}
                </div>
                <div className="h-8 w-px bg-card-border/50 hidden md:block" />
                <div className="flex flex-wrap gap-2 rounded-2xl bg-white/50 p-1.5 dark:bg-white/5">
                  {MEAL_OPTIONS.map((option) => (
                      <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setMealType(option.value);
                            setSubmitSummary(null);
                          }}
                          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                              mealType === option.value
                                  ? 'bg-moss-sage text-espresso-midnight shadow-lg'
                                  : 'text-espresso-midnight/60 hover:text-terracotta dark:text-alabaster/60'
                          }`}
                      >
                        {option.label}
                      </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-sm dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="meal-overline tracking-[0.18em]">Entry Type</p>
                  <h3 className="meal-section-title mt-2 text-2xl">Tarif ya da malzeme sec</h3>
                </div>
                <div className="inline-flex rounded-full border border-card-border bg-white/70 p-1 dark:bg-white/5">
                  {ENTRY_MODE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = option.value === entryMode;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setEntryMode(option.value)}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                                selected ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20' : 'text-espresso-midnight/60 hover:text-terracotta dark:text-alabaster/60'
                            }`}
                        >
                          <Icon size={16} />
                          {option.label}
                        </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">{entryMode === 'RECIPE' ? 'Tarif ara' : 'Malzeme ara'}</span>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-midnight/30 dark:text-alabaster/30" />
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setErrorMessage(null);
                        setSubmitSummary(null);
                      }}
                      placeholder={entryMode === 'RECIPE' ? 'Mercimek çorbası, menemen...' : 'Yoğurt, muz, badem...'}
                      className="base-input py-4 pl-12 pr-4"
                  />
                </div>
              </label>

              <div className="mt-4 flex items-center gap-2 text-xs text-espresso-midnight/45 dark:text-alabaster/45">
                {searching || isSearchStale ? <Loader2 size={14} className="animate-spin text-terracotta" /> : <Clock3 size={14} className="text-moss-sage" />}
                <span>{searching || isSearchStale ? 'Arama guncelleniyor...' : 'Asagidaki sonuclardan bir veya daha fazla sec.'}</span>
              </div>

              <div className="mt-4 grid gap-3">
                {resultCards.length === 0 && deferredQuery.length >= 2 && !searching ? (
                    <div className="meal-metric-card rounded-[1.5rem] border-dashed border-card-border px-4 py-6 text-sm text-espresso-midnight/55 dark:text-alabaster/55">
                      Sonuç bulunamadı. Daha kısa veya farklı bir arama dene.
                    </div>
                ) : null}

                {entryMode === 'RECIPE' && recipeResults.map((recipe) => (
                    <button
                        key={recipe.id}
                        type="button"
                        onClick={() => handleRecipeSelect(recipe)}
                        className="rounded-[1.7rem] border border-card-border bg-white/80 px-4 py-4 text-left transition-all hover:border-terracotta/30 dark:bg-white/5 dark:text-alabaster"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-serif text-xl font-bold">{recipe.title}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">
                            {formatCategoryLabel(recipe.category)}
                          </p>
                        </div>
                        <div className="rounded-full bg-moss-sage/10 px-3 py-1 text-xs font-bold text-moss-forest dark:text-moss-sage">
                          {formatCalories(recipe.totalCalories)}
                        </div>
                      </div>
                    </button>
                ))}

                {entryMode === 'INGREDIENT' && ingredientResults.map((ingredient) => (
                    <button
                        key={ingredient.id}
                        type="button"
                        onClick={() => handleIngredientSelect(ingredient)}
                        className="rounded-[1.7rem] border border-card-border bg-white/80 px-4 py-4 text-left transition-all hover:border-terracotta/30 dark:bg-white/5 dark:text-alabaster"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-serif text-xl font-bold">{ingredient.name}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">
                            {formatCategoryLabel(ingredient.category)}
                          </p>
                        </div>
                        <div className="rounded-full bg-moss-sage/10 px-3 py-1 text-xs font-bold text-moss-forest dark:text-moss-sage">
                          {ingredient.caloriesPer100g != null || ingredient.nutrition?.caloriesPer100g != null
                              ? `${Math.round(ingredient.caloriesPer100g ?? ingredient.nutrition!.caloriesPer100g)} kcal / 100g`
                              : 'Besin verisi bekleniyor'}
                        </div>
                      </div>
                    </button>
                ))}
              </div>

              <div className="mt-6 rounded-[1.8rem] border-2 border-dashed border-card-border bg-white/50 p-4 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="meal-overline tracking-[0.18em]">Selected Items</p>
                    <h4 className="mt-2 text-lg font-serif font-bold text-espresso-midnight dark:text-alabaster">Secilenleri burada yonet</h4>
                  </div>
                  <div className="rounded-full border border-terracotta/20 bg-terracotta/10 px-4 py-2 text-sm font-bold text-terracotta">
                    {selectedItems.length} Oge
                  </div>
                </div>

                {selectedItems.length === 0 ? (
                    <div className="mt-4 flex min-h-[96px] items-center justify-center rounded-[1.4rem] bg-white/60 px-4 text-sm text-espresso-midnight/45 dark:bg-white/[0.02] dark:text-alabaster/45">
                      Henuz secim yapmadin. Arama sonuclarindan ogeleri ekledikce burada gorunecekler.
                    </div>
                ) : (
                    <div className="mt-4 grid gap-6">
                      {selectedItems.map((item) => {
                        const itemNutrition = getSelectedItemNutrition(item);

                        return (
                            <article
                                key={item.key}
                                className="rounded-[2rem] border border-card-border bg-white/90 p-6 shadow-md transition-all hover:shadow-lg dark:bg-white/[0.04]"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-serif text-xl font-bold text-espresso-midnight dark:text-alabaster">
                                    {getSelectedItemName(item)}
                                  </p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-moss-forest/50 dark:text-moss-sage/60">
                                    {getSelectedItemCategory(item)}
                                  </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.key)}
                                    disabled={submitting}
                                    className="rounded-xl bg-terracotta/10 p-2 text-terracotta transition-all hover:bg-terracotta hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="mt-4">
                                <div className="space-y-4">
                                  {item.kind === 'RECIPE' && (
                                    <div className="mt-4 space-y-3">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-espresso-midnight/30">Porsiyon</p>
                                      <div className="flex flex-wrap gap-2">
                                        {RECIPE_PORTION_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => handleRecipePortionChange(item.key, option)}
                                                disabled={submitting}
                                                className={`rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                                                    item.portion.id === option.id
                                                        ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20'
                                                        : 'border border-card-border bg-white text-espresso-midnight/70 hover:text-terracotta dark:bg-white/[0.03] dark:text-alabaster/70'
                                                }`}
                                            >
                                              {option.label}
                                            </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {item.kind === 'INGREDIENT' && (
                                      <div className="mt-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Step 1: Quick Selection */}
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <p className="text-[10px] font-bold uppercase tracking-widest text-espresso-midnight/30">Hızlı Seçim</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {getIngredientUnits(item.ingredient.id).quickUnits.map((unit: string) => {
                                                const weights = (item.ingredient.id && ingredientSpecificWeights[item.ingredient.id]) || unitWeights;
                                                const weight = weights[unit.toLowerCase()];
                                                const currentParts = item.portion.label.split(' ');
                                                const currentQty = parseFloat(currentParts[0]) || 0;
                                                const currentUnit = currentParts.length > 1 ? currentParts[1] : '';
                                                const isSelected = currentUnit.toLowerCase() === unit.toLowerCase() && currentQty > 0;

                                                return (
                                                  <div
                                                    key={unit}
                                                    className={`group relative flex items-center overflow-hidden rounded-xl border transition-all ${
                                                      isSelected
                                                        ? 'bg-espresso-midnight text-white border-transparent'
                                                        : 'border-card-border bg-espresso-midnight/5 text-espresso-midnight/80 hover:border-terracotta/40 dark:bg-white/10 dark:text-alabaster/80'
                                                    }`}
                                                  >
                                                    {/* Decrease Button */}
                                                    <button
                                                      type="button"
                                                      disabled={submitting}
                                                      onClick={() => handleQuickUnitAdjust(item.key, item.ingredient, unit, -1)}
                                                      className={`flex h-full items-center justify-center border-r px-2 py-2 transition-colors ${
                                                        isSelected
                                                          ? 'border-white/10 hover:bg-white/10'
                                                          : 'border-espresso-midnight/5 hover:bg-terracotta/10 hover:text-terracotta'
                                                      }`}
                                                    >
                                                      <Minus size={12} />
                                                    </button>

                                                    {/* Unit Display / Increment */}
                                                    <button
                                                      type="button"
                                                      disabled={submitting}
                                                      onClick={() => handleQuickUnitAdjust(item.key, item.ingredient, unit, 1)}
                                                      className="px-3 py-2 text-left"
                                                    >
                                                      <span className="text-xs font-bold leading-none">
                                                        {isSelected ? `${currentQty} ` : ''}{unit}
                                                      </span>
                                                      {weight && (
                                                        <span className={`block text-[8px] mt-0.5 leading-none ${isSelected ? 'text-white/60' : 'text-foreground/30'}`}>
                                                          ~{(weight * (isSelected ? currentQty : 1)).toFixed(0)}g
                                                        </span>
                                                      )}
                                                    </button>

                                                    {/* Increase Button (Plus) - if we want it separate, but clicking the middle usually increments too. 
                                                       User said "sağına + soluna - koyarak". 
                                                       Let's add a clear Plus on the right too. */}
                                                    <button
                                                      type="button"
                                                      disabled={submitting}
                                                      onClick={() => handleQuickUnitAdjust(item.key, item.ingredient, unit, 1)}
                                                      className={`flex h-full items-center justify-center border-l px-2 py-2 transition-colors ${
                                                        isSelected
                                                          ? 'border-white/10 hover:bg-white/10'
                                                          : 'border-espresso-midnight/5 hover:bg-emerald-500/10 hover:text-emerald-500'
                                                      }`}
                                                    >
                                                      <Plus size={12} />
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                              {getIngredientUnits(item.ingredient.id).quickUnits.length === 0 && (
                                                <p className="text-[10px] italic text-foreground/30">Ozel birim bulunamadi.</p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Step 2: Amount and Standard Unit - Optional */}
                                          <div className="space-y-3">
                                            <button
                                                type="button"
                                                onClick={() => toggleManualInput(item.key)}
                                                className="flex w-full items-center justify-between rounded-xl bg-espresso-midnight/5 px-3 py-2 text-left transition-all hover:bg-espresso-midnight/10 dark:bg-white/5 dark:hover:bg-white/10"
                                            >
                                              <span className="text-[10px] font-bold uppercase tracking-widest text-espresso-midnight/30">Spesifik Miktar / Birim</span>
                                              {expandedManualInputs[item.key] ? <ChevronUp size={14} className="text-espresso-midnight/30" /> : <ChevronDown size={14} className="text-espresso-midnight/30" />}
                                            </button>

                                            {expandedManualInputs[item.key] && (
                                              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="flex gap-2">
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    disabled={submitting}
                                                    value={item.portion.label.split(' ')[0] || ''}
                                                    className="w-1/2 rounded-xl border border-card-border bg-white px-3 py-2 text-sm font-bold outline-none focus:border-terracotta dark:bg-white/5"
                                                    onChange={(e) => {
                                                      const parts = item.portion.label.split(' ');
                                                      const unit = parts.length > 1 ? parts[1] : (item.ingredient.physicalState === 'LIQUID' ? 'ML' : 'GRAM');
                                                      handleManualPortionUpdate(item.key, item.ingredient, e.target.value, unit);
                                                    }}
                                                  />
                                                  <select
                                                    disabled={submitting}
                                                    className="w-1/2 rounded-xl border border-card-border bg-white px-3 py-2 text-xs font-bold outline-none cursor-pointer dark:bg-white/5"
                                                    value={(() => {
                                                        const parts = item.portion.label.split(' ');
                                                        return (parts.length > 1 ? parts[1] : (item.ingredient.physicalState === 'LIQUID' ? 'ML' : 'GRAM')).toUpperCase();
                                                    })()}
                                                    onChange={(e) => {
                                                      const val = item.portion.label.split(' ')[0] || '100';
                                                      handleManualPortionUpdate(item.key, item.ingredient, val, e.target.value);
                                                    }}
                                                  >
                                                    {getIngredientUnits(item.ingredient.id).standardUnits.map((unit: string) => (
                                                      <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                    {getIngredientUnits(item.ingredient.id).quickUnits.map((unit: string) => (
                                                      <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                              </div>
                                            )}
                                            
                                            <div className="flex items-center gap-1.5 text-[9px] text-terracotta/70 italic px-1">
                                              <AlertCircle size={10} />
                                              Seçili: {item.portion.grams.toFixed(1)}g eşdeğeri
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <div className="rounded-[1.1rem] bg-espresso-midnight/[0.03] px-3 py-3 dark:bg-white/5">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Calories</p>
                                  <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatCalories(itemNutrition.calories)}</p>
                                </div>
                                <div className="rounded-[1.1rem] bg-espresso-midnight/[0.03] px-3 py-3 dark:bg-white/5">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Protein</p>
                                  <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatMacro(itemNutrition.protein)}</p>
                                </div>
                                <div className="rounded-[1.1rem] bg-espresso-midnight/[0.03] px-3 py-3 dark:bg-white/5">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Carbs</p>
                                  <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatMacro(itemNutrition.carbs)}</p>
                                </div>
                                <div className="rounded-[1.1rem] bg-espresso-midnight/[0.03] px-3 py-3 dark:bg-white/5">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Fat</p>
                                  <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatMacro(itemNutrition.fat)}</p>
                                </div>
                              </div>
                            </article>
                        );
                      })}
                    </div>
                )}
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-sm dark:bg-white/5">
              <p className="meal-overline tracking-[0.18em]">Selection Flow</p>
              <h3 className="meal-section-title mt-2 text-2xl">Her kart kendi porsiyonuyla hesaplanir</h3>

              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.5rem] border border-card-border bg-white/80 px-4 py-4 text-sm text-espresso-midnight/60 dark:bg-white/[0.03] dark:text-alabaster/60">
                  Arama sonuclarindan birden fazla oge ekleyebilirsin.
                </div>
                <div className="rounded-[1.5rem] border border-card-border bg-white/80 px-4 py-4 text-sm text-espresso-midnight/60 dark:bg-white/[0.03] dark:text-alabaster/60">
                  Her secilen kartta porsiyonu ayarladiginda toplam makrolar aninda guncellenir.
                </div>
                <div className="rounded-[1.5rem] border border-card-border bg-white/80 px-4 py-4 text-sm text-espresso-midnight/60 dark:bg-white/[0.03] dark:text-alabaster/60">
                  Kaydet dediginde secilen her oge mevcut API uzerinden ayri bir tuketim kaydi olarak gonderilir.
                </div>
              </div>
            </div>


            {errorMessage && (
                <div className="rounded-[1.8rem] border border-red-200/70 bg-red-50/90 px-4 py-4 text-red-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        {submitSummary?.responses.length ? 'Bazi ogeler kaydedilemedi' : 'Kayit olusturulamadi'}
                      </p>
                      <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
                    </div>
                  </div>
                </div>
            )}

            {submitSummary && successTitle && (
                <div className="rounded-[1.8rem] border border-moss-sage/30 bg-moss-sage/10 px-4 py-4 text-moss-forest">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-moss-sage" />
                    <div>
                      <p className="font-semibold">{successTitle}</p>
                      <p className="mt-1 text-sm text-moss-forest/80">
                        {successNames}
                      </p>
                      <p className="mt-1 text-sm text-moss-forest/80">
                        {formatCalories(submittedNutrition.calories)} · {formatMacro(submittedNutrition.protein)} protein · {successUsesInventory ? `${locationLabel(selectedGroup)} envanteri guncellendi.` : 'Envanter etkilenmedi.'}
                      </p>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[2rem] meal-highlight-frame bg-white p-6 text-espresso-midnight shadow-brand-hero dark:bg-espresso-midnight dark:text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="meal-overline tracking-[0.18em] text-espresso-midnight/45 dark:text-white/45">Quick Summary</p>
              <h3 className="meal-section-title mt-2 text-2xl text-espresso-midnight dark:text-white">
                {summaryTitle}
              </h3>
              {summarySubtitle ? (
                  <p className="mt-2 text-sm text-espresso-midnight/60 dark:text-white/60">{summarySubtitle}</p>
              ) : null}
            </div>
            <div className="rounded-full bg-terracotta/10 p-3 text-terracotta">
              {entryMode === 'RECIPE' ? <Soup size={18} /> : <UtensilsCrossed size={18} />}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Calories</p>
              <p className="mt-2 font-serif text-3xl font-bold">{formatCalories(nutritionPreview.calories)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Protein</p>
              <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.protein)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Carbs</p>
              <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.carbs)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Fat</p>
              <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.fat)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex-1 rounded-[1.5rem] border border-card-border bg-espresso-midnight/[0.02] px-5 py-4 text-sm text-espresso-midnight/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              {isOutside
                  ? 'Outside / Other seçildi. Yalnızca günlük tüketim özeti güncellenecek.'
                  : `${locationLabel(selectedGroup)} stokundan otomatik düşüm yapılacak.`}
            </div>

            <button
                type="submit"
                disabled={submitting || selectedItems.length === 0}
                className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-[1.6rem] bg-terracotta px-8 py-5 font-bold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.01] hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {submitting ? 'Kaydediliyor...' : selectedItems.length > 1 ? 'Tüketimleri Kaydet' : 'Tüketimi Kaydet'}
            </button>
          </div>
        </div>
      </form>
      </section>
  );
};

export default SmartConsumptionPanel;
