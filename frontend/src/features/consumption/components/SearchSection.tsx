import React from 'react';
import { useTranslation } from 'react-i18next';
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

import { IngredientSelector } from '../../../shared/components/IngredientSelector';

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
  hasCompletedIngredientSearch?: boolean;
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
  userId,
  hasCompletedIngredientSearch = false
}) => {
  const { t } = useTranslation();

  return (
    <div className="meal-card rounded-[2rem] bg-foreground/[0.02] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="meal-overline text-foreground/40 tracking-[0.18em]">Entry Type</p>
          <h3 className="meal-section-title mt-2 text-2xl text-foreground">{t('consumption.search.selectMode')}</h3>
        </div>
        <div className="inline-flex rounded-full border border-card-border bg-card p-1">
          {ENTRY_MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = option.value === entryMode;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onEntryModeChange(option.value)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  selected ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20' : 'text-foreground/60 hover:text-terracotta'
                }`}
              >
                <Icon size={16} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {entryMode === 'RECIPE' ? (
        <>
          <label className="mt-5 block space-y-2">
            <span className="text-sm font-semibold text-foreground/80 px-2">
              {t('consumption.search.searchRecipe')}
            </span>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder={t('consumption.search.recipePlaceholder')}
                className="base-input py-4 pl-12 pr-4 text-foreground"
              />
            </div>
          </label>

          <div className="mt-4 flex items-center gap-2 text-xs text-foreground/40">
            {searching || isSearchStale ? <Loader2 size={14} className="animate-spin text-terracotta" /> : <Clock3 size={14} className="text-moss-sage" />}
            <span>{searching || isSearchStale ? t('consumption.search.updating') : t('consumption.search.selectFromBelow')}</span>
          </div>

          <div className="mt-4 grid gap-3">
            {recipeResults.length === 0 && searchQuery.trim().length >= 2 && !searching ? (
              <div className="meal-metric-card rounded-[1.5rem] border-dashed border-card-border px-4 py-6 text-sm text-foreground/50 bg-transparent">
                {t('consumption.search.noResults')}
              </div>
            ) : null}

            {recipeResults.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => onRecipeSelect(recipe, userId)}
                className="rounded-[1.7rem] border border-card-border bg-card px-4 py-4 text-left transition-all hover:border-terracotta/30 text-foreground"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-xl font-bold">{recipe.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-foreground/40">
                      {formatCategoryLabel(recipe.category)}
                    </p>
                  </div>
                  <div className="rounded-full bg-moss-sage/10 px-3 py-1 text-xs font-bold text-moss-sage">
                    {formatCalories(recipe.totalCalories)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6">
          <IngredientSelector
            query={ingredientSearchQuery}
            onQueryChange={onIngredientSearchQueryChange}
            onSelect={(ing) => onIngredientSelect(ing, userId)}
            selectedIngredient={null}
            searching={searching}
            results={ingredientResults}
            hasCompletedSearch={hasCompletedIngredientSearch}
            placeholder={t('consumption.search.ingredientPlaceholder')}
            label={t('consumption.search.searchIngredient')}
            showSelectedDetails={false}
          />
        </div>
      )}
    </div>
  );
};
