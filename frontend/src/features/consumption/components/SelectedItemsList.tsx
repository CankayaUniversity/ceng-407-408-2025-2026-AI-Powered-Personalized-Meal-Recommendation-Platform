import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  type SelectedConsumptionItem, 
  type SelectedIngredientItem,
  type RecipePortionOption, 
  RECIPE_PORTION_OPTIONS 
} from '../types/SmartConsumption.types';
import { 
  getSelectedItemName, 
  getSelectedItemCategory, 
  getSelectedItemNutrition, 
  formatCalories, 
  formatMacro 
} from '../utils/SmartConsumption.utils';
import { type Ingredient } from '../../../types';

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
  conversions?: Record<string, { list: any[]; loading: boolean }>;
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
  conversions,
  userId,
  title
}) => {
  const { t } = useTranslation();
  if (selectedItems.length === 0) return null;

  const ConversionPreview: React.FC<{ itemKey: string; item: SelectedConsumptionItem }> = ({ itemKey, item }) => {
    const data = conversions?.[itemKey];
    if (!data || item.kind !== 'INGREDIENT') return null;

    if (data.loading) {
      return (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-foreground/40 animate-pulse">
          <div className="h-3 w-3 rounded-full border border-terracotta border-t-transparent animate-spin" />
          {t('common.calculating')}
        </div>
      );
    }

    if (data.list.length === 0) return null;

    const physicalState = (item as SelectedIngredientItem).ingredient.physicalState;
    const forbiddenUnits = physicalState === 'LIQUID' 
      ? ['GRAM', 'KG', 'ADET', 'PAKET', 'DILIM'] 
      : physicalState === 'SOLID'
        ? ['ML', 'LITRE', 'L']
        : [];

    const filteredConversions = data.list.filter((conv: any) => !forbiddenUnits.includes(conv.unit.toUpperCase()));

    if (filteredConversions.length === 0) return null;

    return (
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('consumption.selectedItems.conversions')}</p>
        <div className="flex flex-wrap gap-1.5">
          {filteredConversions.slice(0, 5).map((conv: any) => (
            <div
              key={conv.unit}
              className="px-2.5 py-1 bg-terracotta/5 border border-terracotta/15 rounded-lg text-[10px] font-medium text-terracotta/90 flex items-center gap-1.5"
            >
              <span className="font-bold opacity-70">{conv.displayName}:</span>
              <span className="font-black">{conv.amount}</span>
            </div>
          ))}
          {filteredConversions.length > 5 && (
            <div className="px-2 py-1 text-[9px] text-foreground/30 flex items-center">
              +{filteredConversions.length - 5}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <p className="meal-overline tracking-[0.18em]">{title || t('consumption.selectedItems.defaultTitle')}</p>
      {selectedItems.map((item) => {
        const nutrition = getSelectedItemNutrition(item);
        const isManual = manualInputs.has(item.key);

        return (
          <div key={item.key} className="rounded-[2rem] border border-card-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif text-xl font-bold text-foreground">{getSelectedItemName(item)}</h4>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('consumption.selectedItems.portion')}</p>
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
                              : 'border border-card-border bg-card text-foreground/70 hover:text-terracotta'
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('consumption.selectedItems.quickSelect')}</p>
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
                                    ? 'bg-foreground text-background border-transparent'
                                    : 'border-card-border bg-foreground/5 text-foreground/80 hover:border-terracotta/40'
                                }`}
                              >
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => onQuickUnitAdjust(item.key, item.ingredient, unit, -1, userId)}
                                  className={`flex h-full items-center justify-center border-r px-2 py-2 transition-colors ${
                                    isSelected ? 'border-background/10 hover:bg-background/10' : 'border-foreground/5 hover:bg-terracotta/10 hover:text-terracotta'
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
                                    {isSelected ? `${currentQty} ` : ''}{unit.toLowerCase() === 'yemek kaşığı' ? 'Y.Kaşık' : unit.toLowerCase() === 'tatlı kaşığı' ? 'T.Kaşık' : unit.toLowerCase() === 'çay kaşığı' ? 'Ç.Kaşık' : unit}
                                  </span>
                                  {weight && (
                                    <span className={`block text-[8px] mt-0.5 leading-none ${isSelected ? 'text-background/60' : 'text-foreground/30'}`}>
                                      ~{(weight * (isSelected ? currentQty : 1)).toFixed(0)}g
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => onQuickUnitAdjust(item.key, item.ingredient, unit, 1, userId)}
                                  className={`flex h-full items-center justify-center border-l px-2 py-2 transition-colors ${
                                    isSelected ? 'border-background/10 hover:bg-background/10' : 'border-foreground/5 hover:bg-emerald-500/10 hover:text-emerald-500'
                                  }`}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <ConversionPreview itemKey={item.key} item={item} />
                      </div>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleManualInput(item.key)}
                          className="flex w-full items-center justify-between rounded-xl bg-foreground/5 px-3 py-2 text-left transition-all hover:bg-foreground/10"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('consumption.selectedItems.enterAmount')}</span>
                          {isManual ? <ChevronUp size={14} className="text-terracotta" /> : <ChevronDown size={14} className="text-foreground" />}
                        </button>
                        {isManual && (
                          <>
                            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                              <input
                                type="number"
                                defaultValue={parseFloat(item.portion.label.split(' ')[0]) || ''}
                                onBlur={(e) => onManualPortionUpdate(item.key, item.ingredient, e.target.value, item.portion.label.split(' ')[1] || 'GRAM', userId)}
                                className="w-20 rounded-xl border border-card-border bg-card px-3 py-2 text-xs font-bold text-foreground focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5"
                                placeholder="0"
                              />
                              <select
                                value={item.portion.label.split(' ')[1]?.toUpperCase() || 'GRAM'}
                                onChange={(e) => onManualPortionUpdate(item.key, item.ingredient, item.portion.label.split(' ')[0], e.target.value, userId)}
                                className="flex-1 rounded-xl border border-card-border bg-card px-3 py-2 text-xs font-bold text-foreground focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5"
                              >
                                {getIngredientUnits(item.ingredient.id).standardUnits.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                            <ConversionPreview itemKey={item.key} item={item} />
                          </>
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
