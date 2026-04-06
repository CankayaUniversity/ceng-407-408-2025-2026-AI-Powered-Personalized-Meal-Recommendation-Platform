import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { useInventoryService } from '../../../services/inventoryService';
import { useRecipeService } from '../../../services/recipeService';
import { useConsumptionService } from '../../../services/consumptionService';
import {
  type EntryMode,
  type SelectedConsumptionItem,
  type SelectedRecipeItem,
  type SelectedIngredientItem,
  type SubmitSummary,
  OUTSIDE_LOCATION,
  RECIPE_PORTION_OPTIONS,
  INGREDIENT_PORTION_OPTIONS,
  type RecipePortionOption,
  type IngredientPortionOption
} from '../types/SmartConsumption.types';
import {
  getItemKey,
  getErrorMessage,
  normalizeSearchText,
  getSelectedItemName
} from '../utils/SmartConsumption.utils';
import {
  type Recipe,
  type RecipeListItem,
  type Ingredient,
  MealType
} from '../../../types';

export const useSmartConsumption = (onConsumptionLogged?: () => void) => {
  const { authenticated, user } = useAuth();
  const inventoryService = useInventoryService();
  const recipeService = useRecipeService();
  const consumptionService = useConsumptionService();

  // --- State ---
  const [unitWeights, setUnitWeights] = useState<Record<string, number>>({});
  const [ingredientSpecificWeights, setIngredientSpecificWeights] = useState<Record<number, Record<string, number>>>({});
  const [inventoryGroups, setInventoryGroups] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(OUTSIDE_LOCATION);
  const [entryMode, setEntryMode] = useState<EntryMode>('RECIPE');
  const [mealType, setMealType] = useState<MealType>(MealType.LUNCH);
  const [searchQuery, setSearchQuery] = useState('');
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery.trim());
  const deferredIngredientQuery = useDeferredValue(ingredientSearchQuery.trim());
  const [recipeResults, setRecipeResults] = useState<RecipeListItem[]>([]);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [memberQueries, setMemberQueries] = useState<Record<string, { query: string; mode: EntryMode }>>({});
  const [memberResults, setMemberResults] = useState<Record<string, { recipeResults: RecipeListItem[]; ingredientResults: Ingredient[]; searching: boolean }>>({});
  const [selectedItems, setSelectedItems] = useState<SelectedConsumptionItem[]>([]);
  const [memberSelections, setMemberSelections] = useState<Record<string, SelectedConsumptionItem[]>>({});
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitSummary, setSubmitSummary] = useState<SubmitSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recipeDetailsMap, setRecipeDetailsMap] = useState<Record<number, Recipe>>({});
  const [selectedMembers, setSelectedMembersForLocation] = useState<Record<string, { [userId: string]: boolean }>>({});

  const isOutside = selectedLocationId === OUTSIDE_LOCATION;
  const isSearchStale = searchQuery.trim() !== deferredQuery;

  const selectedGroup = useMemo(
    () => inventoryGroups.find((group) => String(group.id) === selectedLocationId) ?? null,
    [inventoryGroups, selectedLocationId]
  );

  useEffect(() => {
    if (authenticated && user && selectedLocationId && selectedGroup) {
      const currentSelected = selectedMembers[selectedLocationId] || {};
      const loggedInUserIdStr = String(user.id);
      if (currentSelected[loggedInUserIdStr] === undefined) {
        setSelectedMembersForLocation(prev => ({
          ...prev,
          [selectedLocationId]: {
            ...prev[selectedLocationId],
            [loggedInUserIdStr]: true
          }
        }));
      }
    }
  }, [authenticated, user, selectedLocationId, selectedGroup, selectedMembers]);

  const stockedIngredients = useMemo(
    () =>
      (selectedGroup?.items ?? [])
        .flatMap((item: any) => (item.ingredient ? [item.ingredient] : []))
        .sort((left: any, right: any) => left.name.localeCompare(right.name, 'tr-TR')),
    [selectedGroup]
  );

  // --- API Calls ---
  const loadUnitWeights = useCallback(async (ingredientId?: number) => {
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
  }, [consumptionService]);

  const loadInventoryGroups = useCallback(async () => {
    try {
      const groups = await inventoryService.getInventoryGroups();
      setInventoryGroups(groups);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Lokasyon bilgileri yüklenemedi.'));
    }
  }, [inventoryService]);

  // --- Effects ---
  useEffect(() => {
    if (authenticated) {
      void loadInventoryGroups();
      void loadUnitWeights();
    }
  }, [authenticated, loadInventoryGroups, loadUnitWeights]);

  useEffect(() => {
    const fetchMissingRecipes = async () => {
      const allItems = [...selectedItems, ...Object.values(memberSelections).flat()];
      const recipeIds = Array.from(new Set(
        allItems
          .filter((item): item is SelectedRecipeItem => item.kind === 'RECIPE')
          .map(item => item.recipe.id)
      ));
      
      const missingIds = recipeIds.filter(id => !recipeDetailsMap[id]);
      if (missingIds.length === 0) return;

      try {
        const details = await Promise.all(
          missingIds.map(id => recipeService.getRecipeById(id))
        );
        const nextMap = { ...recipeDetailsMap };
        details.forEach(recipe => {
          nextMap[recipe.id] = recipe;
        });
        setRecipeDetailsMap(nextMap);
      } catch (err) {
        console.error('Error fetching recipe details for inventory calculation:', err);
      }
    };
    
    void fetchMissingRecipes();
  }, [selectedItems, memberSelections, recipeDetailsMap, recipeService]);

  useEffect(() => {
    if (!authenticated) return;
    
    const queriesToRun: Array<{ query: string; mode: EntryMode; userId?: string }> = [];

    // Global search
    const gQuery = entryMode === 'RECIPE' ? (deferredQuery || '') : (deferredIngredientQuery || '');
    if (gQuery.trim().length >= 2) {
      queriesToRun.push({ query: gQuery.trim(), mode: entryMode });
    } else {
      if (entryMode === 'RECIPE') setRecipeResults([]);
      else setIngredientResults([]);
    }

    // Member searches
    Object.entries(memberQueries).forEach(([userId, state]) => {
      const q = state?.query || '';
      if (q.trim().length >= 2) {
        queriesToRun.push({ query: q.trim(), mode: state.mode || 'RECIPE', userId });
      } else {
        // If query is too short, clear results for that member
        setMemberResults(prev => {
          if (!prev[userId] || (prev[userId].recipeResults.length === 0 && prev[userId].ingredientResults.length === 0 && !prev[userId].searching)) return prev;
          return {
            ...prev,
            [userId]: { recipeResults: [], ingredientResults: [], searching: false }
          };
        });
      }
    });

    if (queriesToRun.length === 0) {
      setSearching(false);
      return;
    }

    let active = true;
    const abortController = new AbortController();

    const runSearch = async () => {
      // If no global query, set global searching to false
      if (!queriesToRun.some(q => !q.userId)) setSearching(false);
      
      try {
        await Promise.all(queriesToRun.map(async (q) => {
          if (q.userId) {
            setMemberResults(prev => ({ 
              ...prev, 
              [q.userId!]: { 
                ...(prev[q.userId!] || { recipeResults: [], ingredientResults: [], searching: false }), 
                searching: true 
              } 
            }));
          } else {
            setSearching(true);
          }

          try {
            if (q.mode === 'RECIPE') {
              const recipes = await recipeService.getRecipes({
                title: q.query,
                page: 0,
                size: 6,
                signal: abortController.signal
              });
              if (!active) return;
              
              const filtered = recipes.filter(r => {
                const items = q.userId ? (memberSelections[q.userId] || []) : selectedItems;
                return !items.some(i => i.kind === 'RECIPE' && i.recipe.id === r.id);
              });

              if (q.userId) {
                setMemberResults(prev => ({
                  ...prev,
                  [q.userId!]: { 
                    ...(prev[q.userId!] || { recipeResults: [], ingredientResults: [], searching: false }), 
                    recipeResults: filtered, 
                    searching: false 
                  }
                }));
              } else {
                setRecipeResults(filtered);
                setSearching(false);
              }
            } else {
              let results: Ingredient[] = [];
              if (!isOutside) {
                const normalizedQuery = normalizeSearchText(q.query);
                results = stockedIngredients
                  .filter((ingredient: any) => normalizeSearchText(ingredient.name).includes(normalizedQuery))
                  .filter((ingredient: any) => {
                    const items = q.userId ? (memberSelections[q.userId] || []) : selectedItems;
                    return !items.some(i => i.kind === 'INGREDIENT' && i.ingredient.id === ingredient.id);
                  })
                  .slice(0, 6);
              } else {
                const searchRes = await inventoryService.searchIngredients(q.query, 6);
                results = searchRes.filter(ingredient => {
                  const items = q.userId ? (memberSelections[q.userId] || []) : selectedItems;
                  return !items.some(i => i.kind === 'INGREDIENT' && i.ingredient.id === ingredient.id);
                });
              }

              if (!active) return;
              if (q.userId) {
                setMemberResults(prev => ({
                  ...prev,
                  [q.userId!]: { 
                    ...(prev[q.userId!] || { recipeResults: [], ingredientResults: [], searching: false }), 
                    ingredientResults: results, 
                    searching: false 
                  }
                }));
              } else {
                setIngredientResults(results);
                setSearching(false);
              }
            }
          } catch (err) {
            if (q.userId) {
              setMemberResults(prev => {
                if (!prev[q.userId!]) return prev;
                return { ...prev, [q.userId!]: { ...prev[q.userId!], searching: false } };
              });
            } else {
              setSearching(false);
            }
            throw err;
          }
        }));
      } catch (error) {
        if (!active) return;
        setErrorMessage(getErrorMessage(error, 'Arama sonuçları yüklenemedi.'));
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
    deferredIngredientQuery,
    entryMode,
    memberQueries,
    inventoryService,
    isOutside,
    recipeService,
    selectedItems,
    memberSelections,
    stockedIngredients
  ]);

  // --- Handlers ---
  const handleRecipeSelect = (recipe: RecipeListItem, targetUserId?: string) => {
    const key = getItemKey('RECIPE', recipe.id);
    const item: SelectedRecipeItem = {
      key: targetUserId ? `${targetUserId}-${key}` : key,
      kind: 'RECIPE',
      recipe,
      portion: RECIPE_PORTION_OPTIONS[1]
    };

    if (targetUserId) {
      setMemberSelections((prev) => {
        const userItems = prev[targetUserId] || [];
        if (userItems.some((i) => i.kind === 'RECIPE' && i.recipe.id === recipe.id)) return prev;
        return { ...prev, [targetUserId]: [...userItems, item] };
      });
      // Clear member specific search state
      setMemberQueries(prev => ({
        ...prev,
        [targetUserId]: { 
          ...(prev[targetUserId] || { query: '', mode: 'RECIPE' as EntryMode }), 
          query: '' 
        }
      }));
      setMemberResults(prev => ({
        ...prev,
        [targetUserId]: { recipeResults: [], ingredientResults: [], searching: false }
      }));
    } else {
      setSelectedItems((current) => {
        if (current.some((i) => i.kind === 'RECIPE' && i.recipe.id === recipe.id)) return current;
        return [...current, item];
      });
      setSearchQuery('');
      setIngredientSearchQuery('');
    }

    setErrorMessage(null);
    setSubmitSummary(null);
  };

  const handleIngredientSelect = (ingredient: Ingredient, targetUserId?: string) => {
    const key = getItemKey('INGREDIENT', ingredient.id);

    if (!ingredientSpecificWeights[ingredient.id]) {
      void loadUnitWeights(ingredient.id);
    }

    const item: SelectedIngredientItem = {
      key: targetUserId ? `${targetUserId}-${key}` : key,
      kind: 'INGREDIENT',
      ingredient,
      portion: INGREDIENT_PORTION_OPTIONS[1]
    };

    if (targetUserId) {
      setMemberSelections((prev) => {
        const userItems = prev[targetUserId] || [];
        if (userItems.some((i) => i.kind === 'INGREDIENT' && i.ingredient.id === ingredient.id)) return prev;
        return { ...prev, [targetUserId]: [...userItems, item] };
      });
      setMemberQueries(prev => ({
        ...prev,
        [targetUserId]: { 
          ...(prev[targetUserId] || { query: '', mode: 'RECIPE' as EntryMode }), 
          query: '' 
        }
      }));
      setMemberResults(prev => ({
        ...prev,
        [targetUserId]: { recipeResults: [], ingredientResults: [], searching: false }
      }));
    } else {
      setSelectedItems((current) => {
        if (current.some((i) => i.kind === 'INGREDIENT' && i.ingredient.id === ingredient.id)) return current;
        return [...current, item];
      });
      setSearchQuery('');
      setIngredientSearchQuery('');
    }

    setErrorMessage(null);
    setSubmitSummary(null);
  };

  const handleRemoveItem = (itemKey: string) => {
    setSelectedItems((current) => current.filter((item) => item.key !== itemKey));
    setSubmitSummary(null);
  };

  const handleRemoveMemberItem = (userId: string, itemKey: string) => {
    setMemberSelections((prev: any) => ({
      ...prev,
      [userId]: (prev[userId] || []).filter((item: any) => item.key !== itemKey)
    }));
    setSubmitSummary(null);
  };

  const handleRecipePortionChange = (itemKey: string, nextPortion: RecipePortionOption, userId?: string) => {
    if (userId) {
      setMemberSelections((prev: any) => ({
        ...prev,
        [userId]: (prev[userId] || []).map((item: any) =>
          item.key === itemKey && item.kind === 'RECIPE'
            ? { ...item, portion: nextPortion }
            : item
        )
      }));
    } else {
      setSelectedItems((current) =>
        current.map((item) =>
          item.key === itemKey && item.kind === 'RECIPE'
            ? { ...item, portion: nextPortion }
            : item
        )
      );
    }
    setSubmitSummary(null);
  };

  const handleIngredientPortionChange = (itemKey: string, nextPortion: IngredientPortionOption, userId?: string) => {
    if (userId) {
      setMemberSelections((prev: any) => ({
        ...prev,
        [userId]: (prev[userId] || []).map((item: any) =>
          item.key === itemKey && item.kind === 'INGREDIENT'
            ? { ...item, portion: nextPortion }
            : item
        )
      }));
    } else {
      setSelectedItems((current) =>
        current.map((item) =>
          item.key === itemKey && item.kind === 'INGREDIENT'
            ? { ...item, portion: nextPortion }
            : item
        )
      );
    }
    setSubmitSummary(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const currentGroup = !isOutside && selectedGroup ? selectedGroup : null;
    const activeLocationMembers = currentGroup ? selectedMembers[String(currentGroup.id)] || {} : {};
    
    const selectedMemberIds = new Set<string>();
    if (isOutside) {
        if (user) selectedMemberIds.add(user.id);
    } else {
        Object.entries(activeLocationMembers)
            .filter(([_, isSelected]) => isSelected)
            .forEach(([userId]) => selectedMemberIds.add(userId));
        if (selectedItems.length > 0 && user) selectedMemberIds.add(user.id);
    }

    const totalSelectedCount = Array.from(selectedMemberIds).reduce((acc, uid) => {
        const items = uid === user?.id ? selectedItems : (memberSelections[uid] || []);
        return acc + items.length;
    }, 0);

    if (totalSelectedCount === 0) {
      setErrorMessage('Önce en az bir tarif veya malzeme seç.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSubmitSummary(null);

    try {
      const promises: Promise<any>[] = [];

      selectedMemberIds.forEach((userId) => {
        const userItems = userId === user?.id ? selectedItems : (memberSelections[userId] || []);
        userItems.forEach((item) => {
          promises.push(consumptionService.logConsumption({
            userId: userId,
            recipeId: item.kind === 'RECIPE' ? item.recipe.id : undefined,
            ingredientId: item.kind === 'INGREDIENT' ? item.ingredient.id : undefined,
            inventoryGroupId: currentGroup?.id,
            foodName: getSelectedItemName(item),
            mealType,
            portionSize: item.portion.portionSize,
            portionLabel: item.portion.label,
            portionMultiplier: item.kind === 'RECIPE' ? item.portion.multiplier : undefined,
            portionGrams: item.kind === 'INGREDIENT' ? item.portion.grams : undefined,
            isCustomEntry: false,
            isFromInventory: !isOutside && Boolean(selectedGroup)
          }));
        });
      });

      const results = await Promise.allSettled(promises);
      const successfulResponses: any[] = [];
      let firstFailureMessage: string | null = null;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successfulResponses.push(result.value);
        } else if (!firstFailureMessage) {
          firstFailureMessage = getErrorMessage(result.reason, 'Tuketim kaydi olusturulamadi.');
        }
      });

      if (successfulResponses.length === promises.length) {
        setSelectedItems([]);
        setMemberSelections({});
      }

      setSearchQuery('');
      setIngredientSearchQuery('');
      setSubmitSummary({ responses: successfulResponses, failedNames: [] });
      if (onConsumptionLogged) onConsumptionLogged();
      
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Beklenmedik bir hata oluştu.'));
    } finally {
      setSubmitting(false);
    }
  };

  const getIngredientUnits = useCallback((ingredientId?: number) => {
    const ingredient = ingredientId ? (ingredientResults.find(i => i.id === ingredientId) || stockedIngredients.find((i: any) => i.id === ingredientId)) : null;
    const physicalState = ingredient?.physicalState;

    const solidBase = ['GRAM', 'KG'];
    const liquidBase = ['ML', 'LITRE', 'L'];
    const commonBase = ['GRAM', 'ML', 'KG', 'LITRE', 'L'];

    let base = commonBase;
    if (physicalState === 'SOLID') base = solidBase;
    if (physicalState === 'LIQUID') base = liquidBase;

    const weights = (ingredientId && ingredientSpecificWeights[ingredientId]) || unitWeights;
    const extra = Object.keys(weights).map((u: any) => u.toUpperCase());
    const allUnits = Array.from(new Set([...base, ...extra]));
    const allowedQuickUnits = ['PAKET', 'PORSIYON', 'DILIM', 'CUP', 'ADET', 'KASE', 'BARDAK'];

    const quick = allUnits
      .filter(u => allowedQuickUnits.includes(u))
      .sort((a, b) => {
          const idxA = allowedQuickUnits.indexOf(a);
          const idxB = allowedQuickUnits.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.localeCompare(b);
      });

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
  }, [ingredientResults, stockedIngredients, ingredientSpecificWeights, unitWeights]);

  return {
    user,
    inventoryGroups,
    selectedLocationId,
    setSelectedLocationId,
    entryMode,
    setEntryMode,
    mealType,
    setMealType,
    searchQuery,
    setSearchQuery,
    ingredientSearchQuery,
    setIngredientSearchQuery,
    recipeResults,
    ingredientResults,
    memberQueries,
    setMemberQueries,
    memberResults,
    setMemberResults,
    selectedItems,
    memberSelections,
    setMemberSelections,
    searching,
    isSearchStale,
    errorMessage,
    setErrorMessage,
    submitSummary,
    setSubmitSummary,
    submitting,
    selectedMembers,
    setSelectedMembersForLocation,
    isOutside,
    selectedGroup,
    stockedIngredients,
    handleRecipeSelect,
    handleIngredientSelect,
    handleRemoveItem,
    handleRemoveMemberItem,
    handleRecipePortionChange,
    handleIngredientPortionChange,
    handleSubmit,
    getIngredientUnits,
    unitWeights,
    ingredientSpecificWeights,
    recipeDetailsMap
  };
};
