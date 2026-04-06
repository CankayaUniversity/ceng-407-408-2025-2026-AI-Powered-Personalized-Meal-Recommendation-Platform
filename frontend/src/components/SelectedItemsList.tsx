import React from 'react';
import { X, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  type SelectedConsumptionItem, 
  type RecipePortionOption, 
  RECIPE_PORTION_OPTIONS 
} from './SmartConsumption.types';
import { 
  getSelectedItemName, 
  getSelectedItemCategory, 
  getSelectedItemNutrition, 
  formatCalories, 
  formatMacro 
} from './SmartConsumption.utils';
import { type Ingredient } from '../types';

interface SelectedItemsListProps {
  selectedItems: SelectedConsumptionItem[];
  submitting: boolean;
  onRemoveItem: (key: string, userId?: string) => void;
  onRecipePortionChange: (key: string, portion: RecipePortionOption, userId?: string) => void;
  getIngredientUnits: (id?: number) => { quickUnits: string[]; standardUnits: string[] };
  unitWeights: Record<string, number>;
  ingredientSpecificWeights: Record<number, Record<string, number>>;
  onQuickUnitAdjust: (key: string, ingredient: Ingredient, unit: string, delta: number, userId?: string) => void;
  manualInputs: Set<string>;
  toggleManualInput: (key: string) => void;
  onManualPortionUpdate: (key: string, ingredient: Ingredient, qty: string, unit: string, userId?: string) => void;
  userId?: string;
  title?: string;
}

export const SelectedItemsList: React.FC<SelectedItemsListProps> = ({
  selectedItems,
  submitting,
  onRemoveItem,
  onRecipePortionChange,
  getIngredientUnits,
  unitWeights,
  ingredientSpecificWeights,
  onQuickUnitAdjust,
  manualInputs,
  toggleManualInput,
  onManualPortionUpdate,
  userId,
  title = "Sizin Seçimleriniz"
}) => {
  if (selectedItems.length === 0) return null;

  return (
    <div className="space-y-4">
      <p className="meal-overline tracking-[0.18em]">{title}</p>
      {selectedItems.map((item) => {
        const nutrition = getSelectedItemNutrition(item);
        const isManual = manualInputs.has(item.key);

        return (
          <div key={item.key} className="rounded-[2rem] border border-card-border bg-white/80 p-5 dark:bg-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif text-xl font-bold">{getSelectedItemName(item)}</h4>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-terracotta/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-terracotta">
                    {getSelectedItemCategory(item)}
                  </span>
                  <span className="rounded-full bg-moss-sage/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-moss-forest dark:text-moss-sage">
                    {formatCalories(nutrition.calories)} · {formatMacro(nutrition.protein)} P
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveItem(item.key, userId)}
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
                          onClick={() => onRecipePortionChange(item.key, option, userId)}
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
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-espresso-midnight/30">Hızlı Seçim</p>
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
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => onQuickUnitAdjust(item.key, item.ingredient, unit, -1, userId)}
                                  className={`flex h-full items-center justify-center border-r px-2 py-2 transition-colors ${
                                    isSelected ? 'border-white/10 hover:bg-white/10' : 'border-espresso-midnight/5 hover:bg-terracotta/10 hover:text-terracotta'
                                  }`}
                                >
                                  <Minus size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => onQuickUnitAdjust(item.key, item.ingredient, unit, 1, userId)}
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
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => onQuickUnitAdjust(item.key, item.ingredient, unit, 1, userId)}
                                  className={`flex h-full items-center justify-center border-l px-2 py-2 transition-colors ${
                                    isSelected ? 'border-white/10 hover:bg-white/10' : 'border-espresso-midnight/5 hover:bg-emerald-500/10 hover:text-emerald-500'
                                  }`}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleManualInput(item.key)}
                          className="flex w-full items-center justify-between rounded-xl bg-espresso-midnight/5 px-3 py-2 text-left transition-all hover:bg-espresso-midnight/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest text-espresso-midnight/30">Miktar Gir</span>
                          {isManual ? <ChevronUp size={14} className="text-terracotta" /> : <ChevronDown size={14} />}
                        </button>
                        {isManual && (
                          <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                            <input
                              type="number"
                              defaultValue={parseFloat(item.portion.label.split(' ')[0]) || ''}
                              onBlur={(e) => onManualPortionUpdate(item.key, item.ingredient, e.target.value, item.portion.label.split(' ')[1] || 'GRAM', userId)}
                              className="w-20 rounded-xl border border-card-border bg-white px-3 py-2 text-xs font-bold focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 dark:bg-white/5"
                              placeholder="0"
                            />
                            <select
                              value={item.portion.label.split(' ')[1]?.toUpperCase() || 'GRAM'}
                              onChange={(e) => onManualPortionUpdate(item.key, item.ingredient, item.portion.label.split(' ')[0], e.target.value, userId)}
                              className="flex-1 rounded-xl border border-card-border bg-white px-3 py-2 text-xs font-bold focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 dark:bg-white/5"
                            >
                              {getIngredientUnits(item.ingredient.id).standardUnits.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
