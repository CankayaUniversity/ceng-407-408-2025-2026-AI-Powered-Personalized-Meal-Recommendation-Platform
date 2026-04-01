import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
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
import { useToast } from '../../shared/hooks/useToast';
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
  { value: MealType.BREAKFAST, label: 'Kahvaltı' },
  { value: MealType.LUNCH, label: 'Öğle' },
  { value: MealType.DINNER, label: 'Akşam' },
  { value: MealType.SNACK, label: 'Ara Öğün' }
];

const RECIPE_PORTION_OPTIONS: RecipePortionOption[] = [
  { id: 'recipe-half', label: '1/2 kase', multiplier: 0.5, portionSize: PortionSize.SMALL, note: 'Hafif tadım' },
  { id: 'recipe-one', label: '1 kase', multiplier: 1.0, portionSize: PortionSize.MEDIUM, note: 'Standart porsiyon' },
  { id: 'recipe-large', label: '1 büyük kase', multiplier: 1.5, portionSize: PortionSize.LARGE, note: 'Doyurucu öğün' },
  { id: 'recipe-double', label: '2 kase', multiplier: 2.0, portionSize: PortionSize.LARGE, note: 'Büyük porsiyon' }
];

const INGREDIENT_PORTION_OPTIONS: IngredientPortionOption[] = [
  { id: 'ingredient-slice', label: '1 dilim', grams: 30, portionSize: PortionSize.SMALL, note: 'İnce kesim' },
  { id: 'ingredient-piece', label: '1 adet', grams: 90, portionSize: PortionSize.MEDIUM, note: 'Günlük porsiyon' },
  { id: 'ingredient-bowl', label: '1 kase', grams: 160, portionSize: PortionSize.LARGE, note: 'Tam kase' },
  { id: 'ingredient-cup', label: '1 bardak', grams: 240, portionSize: PortionSize.LARGE, note: 'Bol porsiyon' }
];

const locationLabel = (group: InventoryGroup | null) => group?.name ?? 'Dışarı / Diğer';

const formatMacro = (value?: number | null) =>
    value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value)}g`;

const formatCalories = (value?: number | null) =>
    value == null ? '--' : `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value)} kcal`;

const scaleValue = (value: number | null | undefined, factor: number) =>
    value == null ? null : value * factor;

type SmartConsumptionPanelProps = {
  onConsumptionLogged?: (response: ConsumptionResponse) => void | Promise<void>;
};

const SmartConsumptionPanel: React.FC<SmartConsumptionPanelProps> = ({ onConsumptionLogged }) => {
  const { authenticated, user } = useAuth();
  const { showToast } = useToast();
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

  // Porsiyon seçimlerini ayrı ayrı state'lerde tutuyoruz
  const [selectedRecipePortion, setSelectedRecipePortion] = useState<RecipePortionOption>(RECIPE_PORTION_OPTIONS[1]);
  const [selectedIngredientPortion, setSelectedIngredientPortion] = useState<IngredientPortionOption>(INGREDIENT_PORTION_OPTIONS[1]);

  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedGroup = useMemo(
      () => inventoryGroups.find((group) => String(group.id) === selectedLocationId) ?? null,
      [inventoryGroups, selectedLocationId]
  );
  const isOutside = selectedLocationId === OUTSIDE_LOCATION;
  const isSearchStale = searchQuery.trim() !== deferredQuery;
  const activeItemName = entryMode === 'RECIPE' ? selectedRecipe?.title : selectedIngredient?.name;

  // HESAPLAMA MANTIGI: Seçilen nesneye (Recipe/Ingredient) ve porsiyon çarpanına göre tetiklenir
  const nutritionPreview = useMemo(() => {
    if (entryMode === 'RECIPE' && selectedRecipe) {
      const factor = selectedRecipePortion.multiplier;
      return {
        calories: scaleValue(selectedRecipe.totalCalories, factor),
        protein: scaleValue(selectedRecipe.totalProtein, factor),
        carbs: scaleValue(selectedRecipe.totalCarbs, factor),
        fat: scaleValue(selectedRecipe.totalFat, factor)
      };
    }

    if (entryMode === 'INGREDIENT' && selectedIngredient?.nutrition) {
      const factor = selectedIngredientPortion.grams / 100;
      return {
        calories: scaleValue(selectedIngredient.nutrition.caloriesPer100g, factor),
        protein: scaleValue(selectedIngredient.nutrition.proteinPer100g, factor),
        carbs: scaleValue(selectedIngredient.nutrition.carbsPer100g, factor),
        fat: scaleValue(selectedIngredient.nutrition.fatPer100g, factor)
      };
    }

    return null;
  }, [entryMode, selectedRecipe, selectedRecipePortion, selectedIngredient, selectedIngredientPortion]);

  const loadInventoryGroups = async () => {
    try {
      const groups = await inventoryService.getInventoryGroups();
      setInventoryGroups(groups);
    } catch (error) {
      showToast('Lokasyon bilgileri yüklenemedi.', 'error');
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
        } else {
          const ingredients = await inventoryService.searchIngredients(deferredQuery, 6);
          if (!active) return;
          startTransition(() => {
            setIngredientResults(ingredients);
            setRecipeResults([]);
          });
        }
      } catch (error) {
        if (!active) return;
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          showToast('Arama sonuçları yüklenemedi.', 'error');
        }
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
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSelectedRecipe(null);
    setSearchQuery(ingredient.name);
    setIngredientResults([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipe && !selectedIngredient) {
      showToast('Önce bir tarif veya malzeme seçin.', 'info');
      return;
    }
    setSubmitting(true);
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
      showToast(`${response.foodName} başarıyla kaydedildi.`, 'success');
      setSearchQuery('');
      setSelectedRecipe(null);
      setSelectedIngredient(null);
      if (!isOutside && selectedGroup) { await loadInventoryGroups(); }
      if (onConsumptionLogged) { void Promise.resolve(onConsumptionLogged(response)).catch(() => undefined); }
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Tüketim kaydı oluşturulamadı.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resultCards = entryMode === 'RECIPE' ? recipeResults : ingredientResults;
  const activeEntryModeLabel = ENTRY_MODE_OPTIONS.find((option) => option.value === entryMode)?.label ?? entryMode;

  return (
      <section className="meal-card rounded-5xl shadow-brand-hero border border-card-border transition-all duration-500 bg-background dark:bg-espresso-midnight/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="meal-badge-neon px-4 text-[11px] font-bold tracking-[0.22em]">
              <Sparkles size={14} />
              Smart Consumption
            </div>
            <h2 className="meal-section-title mt-4 text-foreground dark:text-alabaster">Ne yediğini hızlıca kaydet, gerekiyorsa stoğu otomatik düş.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-foreground-muted">
              Ev veya Ofis seçersen tarifin içindeki malzemeler seçili lokasyondan otomatik düşülür. Dışarı / Diğer seçeneğinde ise yalnızca kalori ve makrolar loglanır.
            </p>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="meal-metric-card px-4 bg-background dark:bg-white/5 border border-card-border">
              <p className="meal-overline tracking-[0.18em] text-foreground/40">Mod</p>
              <p className="mt-3 font-serif text-2xl font-bold text-foreground dark:text-alabaster">{activeEntryModeLabel}</p>
            </div>
            <div className="meal-metric-card px-4 bg-background dark:bg-white/5 border border-card-border">
              <p className="meal-overline tracking-[0.18em] text-foreground/40">Lokasyon</p>
              <p className="mt-3 font-serif text-2xl font-bold text-foreground dark:text-alabaster">{locationLabel(selectedGroup)}</p>
            </div>
            <div className="meal-metric-card col-span-2 px-4 sm:col-span-1 bg-background dark:bg-white/5 border border-card-border">
              <p className="meal-overline tracking-[0.18em] text-foreground/40">Seçili</p>
              <p className="mt-3 text-sm font-bold text-terracotta truncate">{activeItemName ?? 'Seçim Bekleniyor'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="meal-card rounded-3xl bg-background/60 dark:bg-white/5 p-5 border border-card-border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="meal-overline tracking-[0.18em] text-foreground/40">Giriş Tipi</p>
                  <h3 className="meal-section-title mt-2 text-2xl text-foreground dark:text-alabaster">Tarif ya da malzeme seç</h3>
                </div>
                <div className="inline-flex rounded-full border border-card-border bg-background p-1 dark:bg-white/5">
                  {ENTRY_MODE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = option.value === entryMode;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setEntryMode(option.value)}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                                selected ? 'bg-terracotta text-white shadow-md shadow-terracotta/20' : 'text-foreground-muted hover:text-terracotta'
                            }`}
                        >
                          <Icon size={14} />
                          {option.label}
                        </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-6 block space-y-2">
                <span className="text-xs font-bold text-foreground/70 uppercase tracking-wider">{entryMode === 'RECIPE' ? 'Tarif Ara' : 'Malzeme Ara'}</span>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" />
                  <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        if (entryMode === 'RECIPE') setSelectedRecipe(null);
                        if (entryMode === 'INGREDIENT') setSelectedIngredient(null);
                      }}
                      placeholder={entryMode === 'RECIPE' ? 'Mercimek çorbası, menemen...' : 'Yoğurt, muz, badem...'}
                      className="base-input py-4 pl-12 pr-4 bg-background dark:bg-white/5"
                  />
                </div>
              </label>

              <div className="mt-4 grid gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {resultCards.length === 0 && deferredQuery.length >= 2 && !searching && (
                    <div className="meal-metric-card border-dashed border-card-border px-4 py-8 text-center text-sm text-foreground-muted">
                      Sonuç bulunamadı.
                    </div>
                )}
                {entryMode === 'RECIPE' && recipeResults.map((recipe) => (
                    <button
                        key={recipe.id}
                        type="button"
                        onClick={() => handleRecipeSelect(recipe)}
                        className={`rounded-2xl border p-4 text-left transition-all group ${
                            selectedRecipe?.id === recipe.id
                                ? 'border-transparent bg-terracotta text-white shadow-lg shadow-terracotta/20'
                                : 'border-card-border bg-background dark:bg-white/5 hover:border-sage/50 text-foreground dark:text-alabaster'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-serif text-lg font-bold">{recipe.title}</p>
                          <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${selectedRecipe?.id === recipe.id ? 'text-white/70' : 'text-foreground/40'}`}>
                            {recipe.category || 'Genel'}
                          </p>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-[10px] font-bold ${selectedRecipe?.id === recipe.id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
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
                        className={`rounded-2xl border p-4 text-left transition-all ${
                            selectedIngredient?.id === ingredient.id
                                ? 'border-transparent bg-terracotta text-white shadow-lg shadow-terracotta/20'
                                : 'border-card-border bg-background dark:bg-white/5 hover:border-sage/50 text-foreground dark:text-alabaster'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-serif text-lg font-bold">{ingredient.name}</p>
                          <p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${selectedIngredient?.id === ingredient.id ? 'text-white/70' : 'text-foreground/40'}`}>
                            {ingredient.category}
                          </p>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-[10px] font-bold ${selectedIngredient?.id === ingredient.id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                          {ingredient.nutrition ? `${Math.round(ingredient.nutrition.caloriesPer100g)} kcal` : '--'}
                        </div>
                      </div>
                    </button>
                ))}
              </div>
            </div>

            <div className="meal-card rounded-3xl bg-background/60 dark:bg-white/5 p-5 border border-card-border">
              <p className="meal-overline tracking-[0.18em] text-foreground/40">Lokasyon</p>
              <h3 className="meal-section-title mt-2 text-2xl text-foreground dark:text-alabaster">Nerede yedin?</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setSelectedLocationId(OUTSIDE_LOCATION)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                        isOutside ? 'bg-espresso-midnight dark:bg-terracotta text-white shadow-md' : 'border border-card-border bg-background text-foreground-muted hover:text-terracotta'
                    }`}
                >
                  <MapPin size={14} />
                  Dışarı / Diğer
                </button>
                {inventoryGroups.map((group) => (
                    <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedLocationId(String(group.id))}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                            selectedLocationId === String(group.id)
                                ? 'bg-terracotta text-white shadow-md'
                                : 'border border-card-border bg-background text-foreground-muted hover:text-terracotta'
                        }`}
                    >
                      <Home size={14} />
                      {group.name}
                    </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="meal-card rounded-3xl bg-background/60 dark:bg-white/5 p-5 border border-card-border">
              <p className="meal-overline tracking-[0.18em] text-foreground/40">Porsiyon</p>
              <h3 className="meal-section-title mt-2 text-2xl text-foreground dark:text-alabaster">Miktarı belirle</h3>
              <div className="mt-5 grid gap-3">
                {(entryMode === 'RECIPE' ? RECIPE_PORTION_OPTIONS : INGREDIENT_PORTION_OPTIONS).map((option: any) => {
                  const isSelected = entryMode === 'RECIPE'
                      ? selectedRecipePortion.id === option.id
                      : selectedIngredientPortion.id === option.id;
                  return (
                      <button
                          key={option.id}
                          type="button"
                          onClick={() => entryMode === 'RECIPE' ? setSelectedRecipePortion(option) : setSelectedIngredientPortion(option)}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                              isSelected
                                  ? 'border-transparent bg-terracotta text-white shadow-lg'
                                  : 'border-card-border bg-background dark:bg-white/5 hover:border-sage/50 text-foreground dark:text-alabaster'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm">{option.label}</p>
                            <p className={`mt-0.5 text-[10px] ${isSelected ? 'text-white/70' : 'text-foreground/40'}`}>{option.note}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isSelected ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                          {option.multiplier ? `x${option.multiplier}` : `${option.grams}g`}
                        </span>
                        </div>
                      </button>
                  );
                })}
              </div>
            </div>

            {/* Özet Görünüm Kartı - TERRACCOTA ÇERÇEVE VE HESAPLAMA FIX */}
            <div className={`rounded-3xl p-6 shadow-brand-hero border-2 relative overflow-hidden group transition-all duration-500 ${
                'bg-white dark:bg-espresso-midnight border-terracotta/20 dark:border-terracotta/30'
            }`}>

              {/* Arka Plan İkonu */}
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none text-terracotta">
                {entryMode === 'RECIPE' ? <Soup size={120} /> : <UtensilsCrossed size={120} />}
              </div>

              <div className="relative z-10">
                <p className="meal-overline text-terracotta/60 dark:text-terracotta/40 tracking-[0.18em]">Özet Görünüm</p>
                <h3 className="meal-section-title mt-2 text-2xl text-foreground dark:text-white truncate">
                  {activeItemName ?? 'Seçim Bekleniyor'}
                </h3>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Kalori', val: nutritionPreview?.calories, formatter: formatCalories },
                    { label: 'Protein', val: nutritionPreview?.protein, formatter: formatMacro },
                    { label: 'Karb', val: nutritionPreview?.carbs, formatter: formatMacro },
                    { label: 'Yağ', val: nutritionPreview?.fat, formatter: formatMacro }
                  ].map((m, i) => (
                      <div key={i} className="rounded-2xl bg-terracotta/[0.03] dark:bg-white/5 p-4 border border-terracotta/10 dark:border-white/5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/40 dark:text-white/40">{m.label}</p>
                        <p className="mt-1 font-serif text-2xl font-bold text-foreground dark:text-white">
                          {/* m.val değiştiğinde burası anlık güncellenir */}
                          {m.val != null ? m.formatter(m.val) : '--'}
                        </p>
                      </div>
                  ))}
                </div>

                <button
                    type="submit"
                    disabled={submitting || (!selectedRecipe && !selectedIngredient)}
                    className="mt-8 w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-terracotta text-white font-bold shadow-lg shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {submitting ? 'KAYDEDİLİYOR...' : 'TÜKETİMİ KAYDET'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>
  );
};

export default SmartConsumptionPanel;
