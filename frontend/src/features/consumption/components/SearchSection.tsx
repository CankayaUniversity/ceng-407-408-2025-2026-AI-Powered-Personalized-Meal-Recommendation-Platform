import React from 'react';
import { Search, Loader2, Clock3 } from 'lucide-react';
import { 
  type EntryMode, 
  ENTRY_MODE_OPTIONS 
} from '../types/SmartConsumption.types';
import { 
  formatCategoryLabel, 
  formatCalories 
} from '../utils/SmartConsumption.utils';
import { 
  type RecipeListItem, 
  type Ingredient 
} from '../../../types';

interface SearchSectionProps {
  entryMode: EntryMode;
  onEntryModeChange: (mode: EntryMode) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  ingredientSearchQuery: string;
  onIngredientSearchQueryChange: (query: string) => void;
  searching: boolean;
  isSearchStale: boolean;
  recipeResults: RecipeListItem[];
  ingredientResults: Ingredient[];
  onRecipeSelect: (recipe: RecipeListItem, userId?: string) => void;
  onIngredientSelect: (ingredient: Ingredient, userId?: string) => void;
  userId?: string;
}

export const SearchSection: React.FC<SearchSectionProps> = ({
  entryMode,
  onEntryModeChange,
  searchQuery,
  onSearchQueryChange,
  ingredientSearchQuery,
  onIngredientSearchQueryChange,
  searching,
  isSearchStale,
  recipeResults,
  ingredientResults,
  onRecipeSelect,
  onIngredientSelect,
  userId
}) => {
  const mQuery = entryMode === 'RECIPE' ? (searchQuery || '') : (ingredientSearchQuery || '');
  const resultCards = entryMode === 'RECIPE' ? recipeResults : ingredientResults;

  return (
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
                onClick={() => onEntryModeChange(option.value)}
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
        <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">
          {entryMode === 'RECIPE' ? 'Tarif ara' : 'Malzeme ara'}
        </span>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-midnight/30 dark:text-alabaster/30" />
          <input
            type="text"
            value={mQuery}
            onChange={(event) => {
              const val = event.target.value;
              if (entryMode === 'RECIPE') {
                onSearchQueryChange(val);
              } else {
                onIngredientSearchQueryChange(val);
              }
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
        {(resultCards || []).length === 0 && mQuery.trim().length >= 2 && !searching ? (
          <div className="meal-metric-card rounded-[1.5rem] border-dashed border-card-border px-4 py-6 text-sm text-espresso-midnight/55 dark:text-alabaster/55">
            Sonuç bulunamadı. Daha kısa veya farklı bir arama dene.
          </div>
        ) : null}

        {entryMode === 'RECIPE' && recipeResults.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => onRecipeSelect(recipe, userId)}
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
            onClick={() => onIngredientSelect(ingredient, userId)}
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
                {formatCalories(ingredient.caloriesPer100g ?? ingredient.nutrition?.caloriesPer100g)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
