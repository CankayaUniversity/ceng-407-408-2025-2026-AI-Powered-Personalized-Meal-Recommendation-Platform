import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Minus, Plus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { 
  type SelectedConsumptionItem, 
  type SelectedIngredientItem,
  type RecipePortionOption, 
  RECIPE_PORTION_OPTIONS 
} from '../types/SmartConsumption.types';
import { 
  getSelectedItemName, 
  getSelectedItemCategory,
  isValidSelectedConsumptionItem,
} from '../utils/SmartConsumption.utils';
import { type Ingredient } from '../../../types';

interface SelectedItemsListProps {
  selectedItems: SelectedConsumptionItem[];
  submitting: boolean;
  onRemoveItem: (key: string, userId?: string) => void;
  onRecipePortionChange: (key: string, portion: RecipePortionOption, userId?: string) => void;
  getIngredientUnits: (ingredient?: Ingredient, itemKey?: string) => { quickUnits: string[]; standardUnits: string[] };
  unitWeights: Record<string, number>;
  ingredientSpecificWeights: Record<number, Record<string, number>>;
  onQuickUnitAdjust: (key: string, ingredient: Ingredient, unit: string, delta: number, userId?: string) => void;
  manualInputs: Set<string>;
  toggleManualInput: (key: string) => void;
  onManualPortionUpdate: (key: string, ingredient: Ingredient, qty: string, unit: string, userId?: string) => void;
  individualPreviews?: Record<string, { calories: number; protein: number; carbs: number; fat: number }>;
  conversions?: Record<string, { list: any[]; loading: boolean }>;
  getItemInventoryStatus?: (item: SelectedConsumptionItem) => { isSufficient: boolean; missing: string[] };
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
  individualPreviews,
  conversions,
  getItemInventoryStatus,
  userId,
  title
}) => {
  const { t } = useTranslation();
  const visibleItems = selectedItems.filter(isValidSelectedConsumptionItem);
  if (visibleItems.length === 0) return null;

  const InventoryWarning: React.FC<{ item: SelectedConsumptionItem }> = ({ item }) => {
    const status = getItemInventoryStatus?.(item);
    if (!status || status.isSufficient) return null;

    return (
      <div className="mt-2 flex items-start gap-2 rounded-xl bg-terracotta/5 border border-terracotta/10 px-3 py-2 text-terracotta">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-tight leading-none mb-1">{t('consumption.summary.stockShortage')}</p>
          <p className="text-[10px] opacity-80 leading-tight">
            Missing: {status.missing.join(', ')}
          </p>
        </div>
      </div>
    );
  };

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

    const currentUnit = (item as SelectedIngredientItem).unit || (item.portion.label.split(' ').length > 1 ? item.portion.label.split(' ').slice(1).join(' ') : '');

    const filteredConversions = data.list.filter((c: any) => c.unit.toLowerCase() !== currentUnit.toLowerCase());
    if (filteredConversions.length === 0) return null;

    const preferredUnit = (item as SelectedIngredientItem).ingredient?.preferredUnit;

    const sortedConversions = [...filteredConversions].sort((a: any, b: any) => {
      if (preferredUnit) {
        if (a.unit.toLowerCase() === preferredUnit.toLowerCase()) return -1;
        if (b.unit.toLowerCase() === preferredUnit.toLowerCase()) return 1;
      }
      return 0;
    });

    const displayCount = 8;

    return (
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('consumption.selectedItems.conversions')}</p>
        <div className="flex flex-wrap gap-1.5">
          {sortedConversions.slice(0, displayCount).map((conv: any) => (
            <div
              key={conv.unit}
              className="px-2.5 py-1 bg-terracotta/5 border border-terracotta/15 rounded-lg text-[10px] font-medium text-terracotta/90 flex items-center gap-1.5"
            >
              <span className="font-bold opacity-70">{conv.displayName}:</span>
              <span className="font-black">{conv.amount}</span>
            </div>
          ))}
          {sortedConversions.length > displayCount && (
            <div className="px-2 py-1 text-[9px] text-foreground/30 flex items-center">
              +{sortedConversions.length - displayCount}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <p className="meal-overline tracking-[0.18em]">{title || t('consumption.selectedItems.defaultTitle')}</p>
      {visibleItems.map((item) => {
        const isManual = manualInputs.has(item.key);
        const category = getSelectedItemCategory(item);
        const shouldShowCategory = category.trim().length > 0 && category !== 'Genel';

        return (
          <div key={item.key} className="rounded-[2rem] border border-card-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif text-xl font-bold text-foreground">{getSelectedItemName(item)}</h4>
                </div>
                {shouldShowCategory && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-terracotta/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-terracotta">
                      {category}
                    </span>
                  </div>
                )}
                <InventoryWarning item={item} />
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
                          {getIngredientUnits(item.ingredient, item.key).quickUnits.map((unit: string) => {
                            const weights = (item.ingredient.id && ingredientSpecificWeights[item.ingredient.id]) || unitWeights;
                            const weight = weights[unit.toLowerCase()];
                            const currentParts = item.portion.label.split(' ');
                            const currentQty = parseFloat(currentParts[0]) || 0;
                            const currentUnit = currentParts.slice(1).join(' ');
                            const isSelected = currentUnit.toLowerCase() === unit.toLowerCase() && currentQty > 0;

                            return (
                              <div
                                key={unit}
                                className={`group relative flex items-center overflow-hidden rounded-xl border transition-all ${
                                  isSelected
                                    ? 'bg-foreground text-background border-transparent shadow-lg'
                                    : 'border-card-border bg-foreground/5 text-foreground/80 hover:border-terracotta/40'
                                }`}
                                style={{ minWidth: '130px', flex: '1 1 0px' }}
                              >
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickUnitAdjust(item.key, item.ingredient, unit, -1, userId);
                                  }}
                                  className={`flex h-full items-center justify-center border-r px-2 py-2.5 transition-colors ${
                                    isSelected ? 'border-background/10 hover:bg-background/10' : 'border-foreground/5 hover:bg-terracotta/10 hover:text-terracotta'
                                  }`}
                                >
                                  <Minus size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={() => onQuickUnitAdjust(item.key, item.ingredient, unit, 1, userId)}
                                  className="px-2.5 py-2 text-left flex-1 min-w-0"
                                >
                                  <span className="text-[11px] font-bold leading-tight block truncate">
                                    {isSelected ? `${currentQty} ` : ''}
                                    {unit.toLowerCase() === 'su bardağı' ? 'S.Bardağı' : 
                                     unit.toLowerCase() === 'yemek kaşığı' ? 'Y.Kaşık' : 
                                     unit.toLowerCase() === 'tatlı kaşığı' ? 'T.Kaşık' : 
                                     unit.toLowerCase() === 'çay kaşığı' ? 'Ç.Kaşık' : 
                                     unit.toLowerCase() === 'kahve fincanı' ? 'K.Fincanı' :
                                     unit}
                                  </span>
                                  {weight && (
                                    <span className={`block text-[8px] mt-0.5 font-black uppercase tracking-widest leading-none ${isSelected ? 'text-background/40' : 'text-foreground/20'}`}>
                                      ~{(weight * (isSelected ? currentQty : 1)).toFixed(0)}g
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={submitting}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onQuickUnitAdjust(item.key, item.ingredient, unit, 1, userId);
                                  }}
                                  className={`flex h-full items-center justify-center border-l px-2 py-2.5 transition-colors ${
                                    isSelected ? 'border-background/10 hover:bg-background/10' : 'border-foreground/5 hover:bg-emerald-500/10 hover:text-emerald-500'
                                  }`}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <ConversionPreview itemKey={item.key} item={item} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleManualInput(item.key)}
                            className="flex flex-1 items-center justify-between rounded-xl bg-foreground/5 px-3 py-2 text-left transition-all hover:bg-foreground/10"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('consumption.selectedItems.enterAmount')}</span>
                            {isManual ? <ChevronUp size={14} className="text-terracotta" /> : <ChevronDown size={14} className="text-foreground" />}
                          </button>
                        </div>
                        
                        {individualPreviews?.[item.key] && (
                          <div className="flex items-center gap-3 px-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-terracotta uppercase tracking-tighter leading-none">
                                {Math.round(individualPreviews[item.key].calories)} kcal
                              </span>
                            </div>
                            <div className="h-4 w-[1px] bg-foreground/10" />
                            <div className="flex gap-2">
                              {['protein', 'carbs', 'fat'].map((macro) => (
                                <div key={macro} className="flex flex-col">
                                  <span className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest leading-none mb-0.5">{t(`common.${macro}`).slice(0, 3)}</span>
                                  <span className="text-[10px] font-black text-foreground/70 leading-none">
                                    {(individualPreviews![item.key] as any)[macro].toFixed(1)}g
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isManual && (
                          <>
                            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                              <input
                                type="number"
                                defaultValue={parseFloat(item.portion.label.split(' ')[0]) || ''}
                                onBlur={(e) => onManualPortionUpdate(item.key, item.ingredient, e.target.value, item.portion.label.split(' ').slice(1).join(' ') || 'GRAM', userId)}
                                className="w-20 rounded-xl border border-card-border bg-card px-3 py-2 text-xs font-bold text-foreground focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5"
                                placeholder="0"
                              />
                              <select
                                value={item.portion.label.split(' ').slice(1).join(' ').toUpperCase() || 'GRAM'}
                                onChange={(e) => onManualPortionUpdate(item.key, item.ingredient, item.portion.label.split(' ')[0], e.target.value, userId)}
                                className="flex-1 rounded-xl border border-card-border bg-card px-3 py-2 text-xs font-bold text-foreground focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5"
                              >
                                {getIngredientUnits(item.ingredient, item.key).standardUnits.map(u => (
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
