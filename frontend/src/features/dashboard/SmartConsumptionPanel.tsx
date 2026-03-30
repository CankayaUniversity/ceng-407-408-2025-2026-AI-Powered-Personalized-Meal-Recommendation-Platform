import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock3,
  Home,
  Loader2,
  MapPin,
  Search,
  Soup,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useConsumptionService } from '../../services/consumptionService';
import { ApiError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { useRecipeService } from '../../services/recipeService';
import {
  type ConsumptionResponse,
  type Ingredient,
  type InventoryGroup,
  MealType,
  PortionSize,
  type RecipeListItem
} from '../../types';

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

const formatMacro = (value?: number | null) =>
  value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value)}g`;

const formatCalories = (value?: number | null) =>
  value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value)} kcal`;

const scaleValue = (value: number | null | undefined, factor: number) =>
  value == null ? null : Math.round(value * factor * 10) / 10;

type SmartConsumptionPanelProps = {
  onConsumptionLogged?: (response: ConsumptionResponse) => void | Promise<void>;
};

const SmartConsumptionPanel: React.FC<SmartConsumptionPanelProps> = ({ onConsumptionLogged }) => {
  const { authenticated, user } = useAuth();
  const inventoryService = useInventoryService();
  const recipeService = useRecipeService();
  const consumptionService = useConsumptionService();

  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(OUTSIDE_LOCATION);
  const [entryMode, setEntryMode] = useState<EntryMode>('RECIPE');
  const [mealType, setMealType] = useState<MealType>(MealType.LUNCH);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery.trim());
  const [recipeResults, setRecipeResults] = useState<RecipeListItem[]>([]);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeListItem | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedRecipePortion, setSelectedRecipePortion] = useState<RecipePortionOption>(RECIPE_PORTION_OPTIONS[1]);
  const [selectedIngredientPortion, setSelectedIngredientPortion] = useState<IngredientPortionOption>(INGREDIENT_PORTION_OPTIONS[1]);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<ConsumptionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedGroup = useMemo(
    () => inventoryGroups.find((group) => String(group.id) === selectedLocationId) ?? null,
    [inventoryGroups, selectedLocationId]
  );
  const isOutside = selectedLocationId === OUTSIDE_LOCATION;
  const isSearchStale = searchQuery.trim() !== deferredQuery;
  const activeItemName = entryMode === 'RECIPE' ? selectedRecipe?.title : selectedIngredient?.name;

  const nutritionPreview = useMemo(() => {
    if (selectedRecipe) {
      const factor = selectedRecipePortion.multiplier;
      return {
        calories: scaleValue(selectedRecipe.totalCalories, factor),
        protein: scaleValue(selectedRecipe.totalProtein, factor),
        carbs: scaleValue(selectedRecipe.totalCarbs, factor),
        fat: scaleValue(selectedRecipe.totalFat, factor)
      };
    }

    if (selectedIngredient?.nutrition) {
      const factor = selectedIngredientPortion.grams / 100;
      return {
        calories: scaleValue(selectedIngredient.nutrition.caloriesPer100g, factor),
        protein: scaleValue(selectedIngredient.nutrition.proteinPer100g, factor),
        carbs: scaleValue(selectedIngredient.nutrition.carbsPer100g, factor),
        fat: scaleValue(selectedIngredient.nutrition.fatPer100g, factor)
      };
    }

    return null;
  }, [selectedIngredient, selectedIngredientPortion.grams, selectedRecipe, selectedRecipePortion.multiplier]);

  const loadInventoryGroups = async () => {
    try {
      const groups = await inventoryService.getInventoryGroups();
      setInventoryGroups(groups);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Lokasyon bilgileri yüklenemedi.'));
    } finally {
      setLoadingGroups(false);
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
    setSelectedRecipe(null);
    setSelectedIngredient(null);
    setErrorMessage(null);
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
            setRecipeResults(recipes);
            setIngredientResults([]);
          });
          return;
        }

        const ingredients = await inventoryService.searchIngredients(deferredQuery, 6);
        if (!active) return;
        startTransition(() => {
          setIngredientResults(ingredients);
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
  }, [authenticated, deferredQuery, entryMode, inventoryService, recipeService]);

  if (!authenticated || !user) return null;

  const handleRecipeSelect = (recipe: RecipeListItem) => {
    setSelectedRecipe(recipe);
    setSelectedIngredient(null);
    setSearchQuery(recipe.title);
    setRecipeResults([]);
    setIngredientResults([]);
    setErrorMessage(null);
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSelectedRecipe(null);
    setSearchQuery(ingredient.name);
    setRecipeResults([]);
    setIngredientResults([]);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRecipe && !selectedIngredient) {
      setErrorMessage('Önce bir tarif veya malzeme seç.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);

    try {
      const response = await consumptionService.logConsumption({
        userId: user.id,
        recipeId: selectedRecipe?.id,
        ingredientId: selectedIngredient?.id,
        inventoryGroupId: !isOutside && selectedGroup ? selectedGroup.id : undefined,
        foodName: selectedRecipe?.title ?? selectedIngredient?.name ?? searchQuery.trim(),
        mealType,
        portionSize: selectedRecipe ? selectedRecipePortion.portionSize : selectedIngredientPortion.portionSize,
        portionLabel: selectedRecipe ? selectedRecipePortion.label : selectedIngredientPortion.label,
        portionMultiplier: selectedRecipe ? selectedRecipePortion.multiplier : undefined,
        portionGrams: selectedIngredient ? selectedIngredientPortion.grams : undefined,
        isCustomEntry: false,
        isFromInventory: !isOutside && Boolean(selectedGroup)
      });

      setSuccess(response);
      setSearchQuery('');
      setSelectedRecipe(null);
      setSelectedIngredient(null);
      setRecipeResults([]);
      setIngredientResults([]);

      if (!isOutside && selectedGroup) {
        await loadInventoryGroups();
      }

      if (onConsumptionLogged) {
        void Promise.resolve(onConsumptionLogged(response)).catch(() => undefined);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Tüketim kaydı oluşturulamadı.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resultCards = entryMode === 'RECIPE' ? recipeResults : ingredientResults;
  const activeEntryModeLabel = ENTRY_MODE_OPTIONS.find((option) => option.value === entryMode)?.label ?? entryMode;

  return (
    <section className="glass-card rounded-[2.75rem] border border-white/60 p-6 shadow-[0_28px_80px_-36px_rgba(40,36,33,0.44)] dark:border-white/10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-terracotta/20 bg-terracotta/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
            <Sparkles size={14} />
            Smart Consumption
          </div>
          <h2 className="mt-4 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">Ne yediğini hızlıca kaydet, gerekiyorsa stoğu otomatik düş.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-espresso-midnight/60 dark:text-alabaster/60">
            Home veya Office seçersen tarifin içindeki malzemeler seçili lokasyondan otomatik düşülür. Outside / Other seçeneğinde ise yalnızca kalori ve makrolar loglanır.
          </p>
        </div>

        <div className="grid min-w-[260px] grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-[1.7rem] border border-white/60 bg-white/70 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/50">Mode</p>
            <p className="mt-3 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{activeEntryModeLabel}</p>
          </div>
          <div className="rounded-[1.7rem] border border-white/60 bg-white/70 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/50">Location</p>
            <p className="mt-3 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{locationLabel(selectedGroup)}</p>
          </div>
          <div className="col-span-2 rounded-[1.7rem] border border-white/60 bg-white/70 px-4 py-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/50">Selected</p>
            <p className="mt-3 text-sm font-semibold text-terracotta">{activeItemName ?? 'Awaiting selection'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">Entry Type</p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Tarif ya da malzeme sec</h3>
              </div>
              <div className="inline-flex rounded-full border border-espresso-midnight/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
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
              <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-gray-300">{entryMode === 'RECIPE' ? 'Tarif ara' : 'Malzeme ara'}</span>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-midnight/30 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    if (entryMode === 'RECIPE') setSelectedRecipe(null);
                    if (entryMode === 'INGREDIENT') setSelectedIngredient(null);
                    setSuccess(null);
                  }}
                  placeholder={entryMode === 'RECIPE' ? 'Mercimek çorbası, menemen...' : 'Yoğurt, muz, badem...'}
                  className="w-full rounded-[1.6rem] border border-espresso-midnight/10 dark:border-gray-700 bg-white/80 dark:bg-gray-800/50 py-4 pl-12 pr-4 text-sm text-espresso-midnight dark:text-gray-100 shadow-sm outline-none transition-all focus:border-terracotta focus:ring-4 focus:ring-terracotta/10"
                />
              </div>
            </label>

            <div className="mt-4 flex items-center gap-2 text-xs text-espresso-midnight/45 dark:text-alabaster/45">
              {searching || isSearchStale ? <Loader2 size={14} className="animate-spin text-terracotta" /> : <Clock3 size={14} className="text-moss-sage" />}
              <span>{searching || isSearchStale ? 'Arama guncelleniyor...' : 'Asagidaki sonuclardan secim yap.'}</span>
            </div>

            <div className="mt-4 grid gap-3">
              {resultCards.length === 0 && deferredQuery.length >= 2 && !searching ? (
                <div className="rounded-[1.5rem] border border-dashed border-espresso-midnight/10 px-4 py-6 text-sm text-espresso-midnight/55 dark:border-white/10 dark:text-alabaster/55">
                  Sonuç bulunamadı. Daha kısa veya farklı bir arama dene.
                </div>
              ) : null}

              {entryMode === 'RECIPE' && recipeResults.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => handleRecipeSelect(recipe)}
                  className={`rounded-[1.7rem] border px-4 py-4 text-left transition-all ${
                    selectedRecipe?.id === recipe.id
                      ? 'border-transparent bg-terracotta text-white shadow-xl shadow-terracotta/20'
                      : 'border-white/70 dark:border-gray-800 bg-white/80 dark:bg-gray-800/40 hover:border-moss-sage/30 dark:text-alabaster'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-serif text-xl font-bold">{recipe.title}</p>
                      <p className={`mt-2 text-xs uppercase tracking-[0.18em] ${selectedRecipe?.id === recipe.id ? 'text-white/70' : 'text-moss-forest/45 dark:text-moss-sage/55'}`}>
                        {recipe.category || 'Genel'}
                      </p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-bold ${selectedRecipe?.id === recipe.id ? 'bg-white/15 text-white' : 'bg-moss-sage/10 text-moss-forest dark:text-moss-sage'}`}>
                      {formatCalories(recipe.totalCalories)}
                    </div>
                  </div>
                  <div className={`mt-4 flex flex-wrap gap-3 text-xs ${selectedRecipe?.id === recipe.id ? 'text-white/75' : 'text-espresso-midnight/45 dark:text-alabaster/45'}`}>
                    <span>{formatMacro(recipe.totalProtein)} protein</span>
                    <span>{formatMacro(recipe.totalCarbs)} carbs</span>
                    <span>{recipe.servings ? `${recipe.servings} porsiyon` : 'Tek tarif'}</span>
                  </div>
                </button>
              ))}

              {entryMode === 'INGREDIENT' && ingredientResults.map((ingredient) => (
                <button
                  key={ingredient.id}
                  type="button"
                  onClick={() => handleIngredientSelect(ingredient)}
                  className={`rounded-[1.7rem] border px-4 py-4 text-left transition-all ${
                    selectedIngredient?.id === ingredient.id
                      ? 'border-transparent bg-terracotta text-white shadow-xl shadow-terracotta/20'
                      : 'border-white/70 dark:border-gray-800 bg-white/80 dark:bg-gray-800/40 hover:border-moss-sage/30 dark:text-alabaster'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-serif text-xl font-bold">{ingredient.name}</p>
                      <p className={`mt-2 text-xs uppercase tracking-[0.18em] ${selectedIngredient?.id === ingredient.id ? 'text-white/70' : 'text-moss-forest/45 dark:text-moss-sage/55'}`}>
                        {ingredient.category}
                      </p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-bold ${selectedIngredient?.id === ingredient.id ? 'bg-white/15 text-white' : 'bg-moss-sage/10 text-moss-forest dark:text-moss-sage'}`}>
                      {ingredient.nutrition ? `${Math.round(ingredient.nutrition.caloriesPer100g)} kcal / 100g` : 'Besin verisi bekleniyor'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">Meal Context</p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Nerede ve hangi ogunde yedin?</h3>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSelectedLocationId(OUTSIDE_LOCATION)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all ${
                  isOutside ? 'bg-espresso-midnight text-white shadow-lg shadow-black/10 dark:bg-terracotta dark:shadow-terracotta/20' : 'border border-espresso-midnight/10 bg-white/75 text-espresso-midnight/65 hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/65'
                }`}
              >
                <MapPin size={16} />
                Disari / Diger
              </button>
              {inventoryGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedLocationId(String(group.id))}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all ${
                    selectedLocationId === String(group.id)
                      ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20'
                      : 'border border-espresso-midnight/10 bg-white/75 text-espresso-midnight/65 hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/65'
                  }`}
                >
                  <Home size={16} />
                  {group.name}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {MEAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMealType(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    mealType === option.value
                      ? 'bg-moss-sage text-espresso-midnight shadow-lg shadow-moss-sage/20'
                      : 'border border-espresso-midnight/10 bg-white/75 text-espresso-midnight/65 hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/65'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={`mt-5 rounded-[1.6rem] border px-4 py-4 text-sm ${
              isOutside
                ? 'border-ochre-soft/20 bg-ochre-soft/10 text-espresso-midnight/70 dark:text-alabaster/70'
                : 'border-moss-sage/25 bg-moss-sage/10 text-moss-forest dark:text-moss-sage'
            }`}>
              {loadingGroups
                ? 'Lokasyonlar hazırlanıyor...'
                : isOutside
                  ? 'Bu kayit yalnizca kalori ve makrolari loglar. Envanter etkilenmez.'
                  : `${selectedGroup?.name ?? 'Secili lokasyon'} envanteri kayittan sonra otomatik guncellenir.`}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">Household Portion</p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Kolay bir household unit sec</h3>

            <div className="mt-5 grid gap-3">
              {entryMode === 'RECIPE' && RECIPE_PORTION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedRecipePortion(option)}
                  className={`rounded-[1.7rem] border px-4 py-4 text-left transition-all ${
                    selectedRecipePortion.id === option.id
                      ? 'border-transparent bg-terracotta text-white shadow-xl shadow-terracotta/20'
                      : 'border-white/70 bg-white/80 hover:border-moss-sage/30 dark:border-white/10 dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{option.label}</p>
                      <p className={`mt-1 text-xs ${selectedRecipePortion.id === option.id ? 'text-white/70' : 'text-espresso-midnight/45 dark:text-alabaster/45'}`}>{option.note}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${selectedRecipePortion.id === option.id ? 'bg-white/15 text-white' : 'bg-moss-sage/10 text-moss-forest dark:text-moss-sage'}`}>
                      x{option.multiplier}
                    </span>
                  </div>
                </button>
              ))}

              {entryMode === 'INGREDIENT' && INGREDIENT_PORTION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedIngredientPortion(option)}
                  className={`rounded-[1.7rem] border px-4 py-4 text-left transition-all ${
                    selectedIngredientPortion.id === option.id
                      ? 'border-transparent bg-terracotta text-white shadow-xl shadow-terracotta/20'
                      : 'border-white/70 bg-white/80 hover:border-moss-sage/30 dark:border-white/10 dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{option.label}</p>
                      <p className={`mt-1 text-xs ${selectedIngredientPortion.id === option.id ? 'text-white/70' : 'text-espresso-midnight/45 dark:text-alabaster/45'}`}>{option.note}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${selectedIngredientPortion.id === option.id ? 'bg-white/15 text-white' : 'bg-moss-sage/10 text-moss-forest dark:text-moss-sage'}`}>
                      {option.grams}g
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-espresso-midnight p-5 text-white shadow-[0_28px_80px_-40px_rgba(40,36,33,0.7)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Quick Summary</p>
                <h3 className="mt-2 font-serif text-2xl font-bold">{activeItemName ?? 'Secimini bekliyorum'}</h3>
              </div>
              <div className="rounded-full bg-white/10 p-3 text-terracotta">
                {entryMode === 'RECIPE' ? <Soup size={18} /> : <UtensilsCrossed size={18} />}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] bg-white/5 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Calories</p>
                <p className="mt-2 font-serif text-3xl font-bold">{formatCalories(nutritionPreview?.calories)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/5 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Protein</p>
                <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview?.protein)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/5 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Carbs</p>
                <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview?.carbs)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/5 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Fat</p>
                <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview?.fat)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
              {isOutside
                ? 'Outside / Other seçildi. Yalnızca günlük tüketim özeti güncellenecek.'
                : `${locationLabel(selectedGroup)} stokundan otomatik düşüm yapılacak.`}
            </div>

            <button
              type="submit"
              disabled={submitting || (!selectedRecipe && !selectedIngredient)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[1.6rem] bg-terracotta px-5 py-4 font-semibold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.01] hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {submitting ? 'Kaydediliyor...' : 'Tuketimi Kaydet'}
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-[1.8rem] border border-red-200/70 bg-red-50/90 px-4 py-4 text-red-700 shadow-[0_18px_48px_-28px_rgba(185,28,28,0.35)]">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Kayit olusturulamadi</p>
                  <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-[1.8rem] border border-moss-sage/30 bg-moss-sage/10 px-4 py-4 text-moss-forest shadow-[0_18px_48px_-28px_rgba(74,93,78,0.35)]">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-moss-sage" />
                <div>
                  <p className="font-semibold">{success.foodName} basariyla kaydedildi</p>
                  <p className="mt-1 text-sm text-moss-forest/80 dark:text-moss-sage">
                    {formatCalories(success.estimatedCalories)} · {formatMacro(success.estimatedProtein)} protein · {success.isFromInventory ? `${locationLabel(selectedGroup)} envanteri guncellendi.` : 'Envanter etkilenmedi.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </section>
  );
};

export default SmartConsumptionPanel;
