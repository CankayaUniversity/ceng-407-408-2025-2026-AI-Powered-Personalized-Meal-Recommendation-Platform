import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { useInventoryService } from '../../../services/inventoryService';
import { useIngredientService } from '../../../services/ingredientService';
import { useRecipeService } from '../../../services/recipeService';
import { useConsumptionService } from '../../../services/consumptionService';
import { useToast } from '../../../shared/hooks/useToast';
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
  type RecipeIngredient,
  type RecipeListItem,
  type Ingredient,
  MealType
} from '../../../types';


export const useSmartConsumption = (onConsumptionLogged?: () => void, initialRecipe?: any) => {
  const { t } = useTranslation();
  const { authenticated, user } = useAuth();
  const { showToast } = useToast();
  const inventoryService = useInventoryService();
  const ingredientService = useIngredientService();
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
  const [nutritionPreview, setNutritionPreview] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [individualPreviews, setIndividualPreviews] = useState<Record<string, { calories: number; protein: number; carbs: number; fat: number }>>({});
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitSummary, setSubmitSummary] = useState<SubmitSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recipeDetailsMap, setRecipeDetailsMap] = useState<Record<number, Recipe>>({});
  const [selectedMembers, setSelectedMembersForLocation] = useState<Record<string, { [userId: string]: boolean }>>({});
  const [conversions, setConversions] = useState<Record<string, { list: any[]; loading: boolean }>>({});

  const isOutside = selectedLocationId === OUTSIDE_LOCATION;
  const isSearchStale = searchQuery.trim() !== deferredQuery;

  const selectedGroup = useMemo(
    () => inventoryGroups.find((group) => String(group.id) === selectedLocationId) ?? null,
    [inventoryGroups, selectedLocationId]
  );

  // Auto-select initial recipe if provided
  useEffect(() => {
    if (initialRecipe && authenticated) {
      handleRecipeSelect(initialRecipe);
    }
  }, [initialRecipe, authenticated]);

  useEffect(() => {
    if (authenticated && user && selectedLocationId && selectedGroup) {
      const currentSelected = selectedMembers[selectedLocationId] || {};
      const loggedInUserIdStr = String(user.id);
      // Login olan kullanıcıyı otomatik seçme, sadece diğer üyeler seçilebilir olsun.
      // Eğer kullanıcı listede varsa bile varsayılan olarak seçili gelmesin.
      if (currentSelected[loggedInUserIdStr] !== false) {
          setSelectedMembersForLocation(prev => ({
              ...prev,
              [selectedLocationId]: {
                  ...prev[selectedLocationId],
                  [loggedInUserIdStr]: false
              }
          }));
      }
    }
  }, [authenticated, user, selectedLocationId, selectedGroup]);

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
      showToast(getErrorMessage(error, t('toasts.consumption.locationLoadError')), 'error');
    }
  }, [inventoryService, showToast]);

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
                const searchRes = await ingredientService.searchIngredients(q.query, 6);
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
        showToast(getErrorMessage(error, t('toasts.consumption.searchError')), 'error');
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
  // --- Nutrition Preview Sync ---
  useEffect(() => {
    const allItems = [...selectedItems, ...Object.values(memberSelections).flat()];
    if (allItems.length === 0) {
      setNutritionPreview(null);
      setIndividualPreviews({});
      return;
    }

    const updatePreview = async () => {
      try {
        const itemPreviews: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
        
        const previews = await Promise.all(allItems.map(async item => {
          const payload = {
            recipeId: item.kind === 'RECIPE' ? item.recipe.id : undefined,
            ingredientId: item.kind === 'INGREDIENT' ? item.ingredient.id : undefined,
            portionMultiplier: item.kind === 'RECIPE' ? item.portion.multiplier : undefined,
            portionAmount: item.kind === 'INGREDIENT' ? item.portion.amount : undefined,
            portionUnit: item.kind === 'INGREDIENT' ? (item.portion.unit || item.unit) : undefined,
            portionGrams: item.kind === 'INGREDIENT' ? item.portion.grams : undefined
          };
          const nutrition = await consumptionService.getNutritionPreview(payload as any);
          itemPreviews[item.key] = nutrition;
          return nutrition;
        }));

        const total = previews.reduce((acc, curr) => ({
          calories: acc.calories + curr.calories,
          protein: acc.protein + curr.protein,
          carbs: acc.carbs + curr.carbs,
          fat: acc.fat + curr.fat
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        setNutritionPreview(total);
        setIndividualPreviews(itemPreviews);
      } catch (error) {
        console.error('Besin degeri tahmini guncellenemedi:', error);
      }
    };

    const timeout = setTimeout(updatePreview, 300);
    return () => clearTimeout(timeout);
  }, [selectedItems, memberSelections, consumptionService]);

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
      portion: INGREDIENT_PORTION_OPTIONS[1],
      unit: ingredient.physicalState === 'LIQUID' ? 'ML' : 'GRAM'
    };

    if (targetUserId) {
      setMemberSelections((prev) => {
        const userItems = prev[targetUserId] || [];
        if (userItems.some((i) => i.kind === 'INGREDIENT' && i.ingredient.id === ingredient.id)) return prev;
        
        const newItems = [...userItems, item];
        // Fetch conversions for the new item
        const amount = item.portion.amount || (item.portion.grams / (ingredientSpecificWeights[item.ingredient.id]?.[item.unit.toLowerCase()] || unitWeights[item.unit.toLowerCase()] || 1));
        void fetchConversions(item.key, item.ingredient.id, amount, item.unit);
        
        return { ...prev, [targetUserId]: newItems };
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
        
        const amount = item.portion.amount || (item.portion.grams / (ingredientSpecificWeights[item.ingredient.id]?.[item.unit.toLowerCase()] || unitWeights[item.unit.toLowerCase()] || 1));
        void fetchConversions(item.key, item.ingredient.id, amount, item.unit);
        
        return [...current, item];
      });
      setSearchQuery('');
      setIngredientSearchQuery('');
    }

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

  const fetchConversions = useCallback(async (itemKey: string, ingredientId: number, amount: number, unit: string) => {
    if (!ingredientId || !amount || !unit) return;

    // Loading durumuna alırken listeyi sıfırlama (mevcut butonları koru)
    setConversions(prev => ({
        ...prev,
        [itemKey]: { list: prev[itemKey]?.list || [], loading: true }
    }));

    try {
        const results = await ingredientService.getUnitConversions(ingredientId, amount, unit);
        
        setConversions(prev => {
            // Eğer yeni bir miktar için geliyorsa ve mevcut bir liste varsa, 
            // sadece miktarları (amounts) güncelle, yüksek öncelikli butonların listesini değiştirme.
            const existingList = prev[itemKey]?.list || [];
            
            let mergedList = results;
            if (existingList.length > 0 && results.length > 0) {
                // Mevcut listedeki birimlerin sırasını koru, sadece değerlerini güncelle
                mergedList = existingList.map((existing: any) => {
                    const fresh = results.find((r: any) => r.unit.toLowerCase() === existing.unit.toLowerCase());
                    if (fresh) {
                        return { ...existing, amount: fresh.amount };
                    }
                    return existing;
                });
                
                // Mevcut listede olmayan ama yeni sonuçlarda olanları (eğer varsa) sona ekle
                results.forEach((fresh: any) => {
                    if (!mergedList.find((m: any) => m.unit.toLowerCase() === fresh.unit.toLowerCase())) {
                        mergedList.push(fresh);
                    }
                });
            }

            return {
                ...prev,
                [itemKey]: { list: mergedList, loading: false }
            };
        });
    } catch (error) {
        console.error('Dönüşümler alınamadı:', error);
        setConversions(prev => ({
            ...prev,
            [itemKey]: { list: prev[itemKey]?.list || [], loading: false }
        }));
    }
  }, [ingredientService]);

  const handleIngredientPortionChange = (itemKey: string, nextPortion: IngredientPortionOption, userId?: string) => {
    if (userId) {
      setMemberSelections((prev: any) => {
        const userItems = prev[userId] || [];
        const updatedItems = userItems.map((item: any) => {
            if (item.key === itemKey && item.kind === 'INGREDIENT') {
                const nextUnit = typeof nextPortion === 'string' ? item.unit : (nextPortion.unit || item.unit);
                const amount = typeof nextPortion === 'string'
                    ? parseFloat(nextPortion)
                    : (nextPortion.amount || (nextPortion.grams / (ingredientSpecificWeights[item.ingredient.id]?.[nextUnit.toLowerCase()] || unitWeights[nextUnit.toLowerCase()] || 1)));
                
                fetchConversions(itemKey, item.ingredient.id, amount, nextUnit);
                
                return { ...item, portion: nextPortion, unit: nextUnit };
            }
            return item;
        });
        return { ...prev, [userId]: updatedItems };
      });
    } else {
      setSelectedItems((current) =>
        current.map((item) => {
            if (item.key === itemKey && item.kind === 'INGREDIENT') {
                const nextUnit = typeof nextPortion === 'string' ? item.unit : (nextPortion.unit || item.unit);
                const amount = typeof nextPortion === 'string'
                    ? parseFloat(nextPortion)
                    : (nextPortion.amount || (nextPortion.grams / (ingredientSpecificWeights[item.ingredient.id]?.[nextUnit.toLowerCase()] || unitWeights[nextUnit.toLowerCase()] || 1)));
                
                fetchConversions(itemKey, item.ingredient.id, amount, nextUnit);
                
                return { ...item, portion: nextPortion, unit: nextUnit };
            }
            return item;
        })
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
      showToast(t('toasts.consumption.selectFirst'), 'info');
      return;
    }

    setSubmitting(true);
    setSubmitSummary(null);

    try {
      const currentGroup = !isOutside && selectedGroup ? selectedGroup : null;
      const activeLocationMembers = currentGroup ? selectedMembers[String(currentGroup.id)] || {} : {};
      
      const membersToLog: any[] = [];
      
      // Login olan kullanıcıyı ekle
      if (selectedItems.length > 0 && user) {
          membersToLog.push({
              userId: user.id,
              items: selectedItems
          });
      }

      // Diğer seçili grup üyelerini ekle
      if (currentGroup) {
          Object.entries(activeLocationMembers)
              .filter(([uid, isSelected]) => isSelected && uid !== user?.id)
              .forEach(([userId]) => {
                  const items = memberSelections[userId] || [];
                  if (items.length > 0) {
                      membersToLog.push({ userId, items });
                  }
              });
      }

      if (membersToLog.length === 0) {
          showToast(t('toasts.consumption.selectFirst'), 'info');
          setSubmitting(false);
          return;
      }

      // Backend'e tek bir toplu istek gönderiyoruz
      const bulkRequest = {
          inventoryGroupId: currentGroup?.id,
          mealType,
          members: membersToLog.flatMap(m => m.items.map((item: any) => {
              return {
                  userId: m.userId,
                  recipeId: item.kind === 'RECIPE' ? item.recipe.id : undefined,
                  ingredientId: item.kind === 'INGREDIENT' ? item.ingredient.id : undefined,
                  foodName: getSelectedItemName(item),
                  portionLabel: item.portion.label,
                  portionMultiplier: item.kind === 'RECIPE' ? item.portion.multiplier : undefined,
                  portionAmount: item.kind === 'INGREDIENT' ? item.portion.amount : undefined,
                  portionUnit: item.kind === 'INGREDIENT' ? (item.portion.unit || item.unit) : undefined,
              };
          }))
      };

      const response = await consumptionService.logConsumption(bulkRequest);
      
      setSelectedItems([]);
      setMemberSelections({});
      setSearchQuery('');
      setIngredientSearchQuery('');
      setSubmitSummary({ responses: [response], failedNames: [] });
      showToast(t('toasts.consumption.saved'), 'success');
      if (onConsumptionLogged) onConsumptionLogged();
      
    } catch (error) {
      showToast(getErrorMessage(error, t('toasts.consumption.unexpectedError')), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getIngredientUnits = useCallback((selectedIngredient?: Ingredient, itemKey?: string) => {
    const ingredientId = selectedIngredient?.id;
    
    // Eğer elimizde backend'den gelen taze dönüşüm verileri varsa onları kullanalım (en akıllısı budur)
    const backendConversions = itemKey ? conversions[itemKey]?.list : null;

    if (backendConversions && backendConversions.length > 0) {
      const quick = backendConversions
        .filter((c: any) => c.highPriority)
        .map((c: any) => c.unit.toUpperCase());
      
      const standard = backendConversions
        .map((c: any) => c.unit.toUpperCase());

      return {
        quickUnits: quick.slice(0, 6),
        standardUnits: standard
      };
    }

    // Fallback logic
    const base = ['GRAM', 'KG', 'ML', 'L', 'ADET'];
    const weights = (ingredientId && ingredientSpecificWeights[ingredientId]) || unitWeights;
    const extra = Object.keys(weights).map((u: any) => u.toUpperCase());
    const allUnits = Array.from(new Set([...base, ...extra]));

    const standard = allUnits.sort((a, b) => {
        if (a === 'GRAM') return -1;
        if (b === 'GRAM') return 1;
        return a.localeCompare(b);
    });

    return {
      quickUnits: [],
      standardUnits: standard
    };
  }, [ingredientSpecificWeights, unitWeights, conversions]);

  const inventoryDeductions = useMemo(() => {
    if (isOutside) return [];
    const summary: Record<number, { name: string; amount: number; unit: string; grams: number; id: number }> = {};
    const allItems = [...selectedItems, ...Object.values(memberSelections).flat()];
    
    allItems.forEach(item => {
      if (item.kind === 'INGREDIENT') {
        const id = item.ingredient.id;
        if (!summary[id]) {
          summary[id] = { 
            id,
            name: item.ingredient.name, 
            amount: 0, 
            unit: item.unit || item.ingredient.preferredUnit || (item.ingredient.physicalState === 'LIQUID' ? 'ML' : 'GRAM'),
            grams: 0 
          };
        }
        summary[id].amount += (item.portion.amount || 0);
        summary[id].grams += item.portion.grams;
      } else {
        const recipe = recipeDetailsMap[item.recipe.id];
        if (recipe?.ingredients) {
          recipe.ingredients.forEach((ri: RecipeIngredient) => {
            const id = ri.ingredientId;
            const name = ri.ingredient?.name || (ri.ingredientId && stockedIngredients.find((si: any) => si.id === ri.ingredientId)?.name) || `Ingredient #${id}`;
            if (!summary[id]) {
              summary[id] = { 
                id,
                name, 
                amount: 0, 
                unit: ri.unit || 'g', 
                grams: 0 
              };
            }
            summary[id].amount += (ri.amount || ri.grams) * item.portion.multiplier;
            summary[id].grams += ri.grams * item.portion.multiplier;
          });
        }
      }
    });
    return Object.values(summary).sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  }, [selectedItems, memberSelections, recipeDetailsMap, isOutside]);

  const inventoryStatus = useMemo(() => {
    if (isOutside || !selectedGroup) return { isSufficient: true, missingIngredients: [] };
    
    const missing: Array<{ id: number; name: string; required: number; available: number }> = [];
    
    // Inventory mapped by ingredient ID
    const inventoryMap: Record<number, number> = {};
    (selectedGroup.items || []).forEach((item: any) => {
      if (item.ingredient?.id) {
        inventoryMap[item.ingredient.id] = (inventoryMap[item.ingredient.id] || 0) + (item.totalGrams || 0);
      }
    });

    inventoryDeductions.forEach(deduction => {
      const available = inventoryMap[deduction.id] || 0;
      if (available < deduction.grams) {
        missing.push({
          id: deduction.id,
          name: deduction.name,
          required: deduction.grams,
          available
        });
      }
    });

    return {
      isSufficient: missing.length === 0,
      missingIngredients: missing
    };
  }, [inventoryDeductions, selectedGroup, isOutside]);

  const getItemInventoryStatus = useCallback((item: SelectedConsumptionItem) => {
    if (isOutside || !selectedGroup) return { isSufficient: true, missing: [] };

    const inventoryMap: Record<number, number> = {};
    (selectedGroup.items || []).forEach((invItem: any) => {
      if (invItem.ingredient?.id) {
        inventoryMap[invItem.ingredient.id] = (inventoryMap[invItem.ingredient.id] || 0) + (invItem.totalGrams || 0);
      }
    });

    const missing: string[] = [];
    if (item.kind === 'INGREDIENT') {
      const available = inventoryMap[item.ingredient.id] || 0;
      if (available < item.portion.grams) {
        missing.push(item.ingredient.name);
      }
    } else {
      const recipe = recipeDetailsMap[item.recipe.id];
      if (recipe?.ingredients) {
        recipe.ingredients.forEach((ri: RecipeIngredient) => {
          const available = inventoryMap[ri.ingredientId] || 0;
          if (available < (ri.grams * item.portion.multiplier)) {
            missing.push(ri.ingredient?.name || `Ingredient #${ri.ingredientId}`);
          }
        });
      }
    }

    return {
      isSufficient: missing.length === 0,
      missing
    };
  }, [selectedGroup, isOutside, recipeDetailsMap]);

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
    nutritionPreview,
    individualPreviews,
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
    recipeDetailsMap,
    conversions,
    hasCompletedIngredientSearch: !!deferredIngredientQuery.trim() && !searching,
    inventoryDeductions,
    inventoryStatus,
    getItemInventoryStatus
  };
};
