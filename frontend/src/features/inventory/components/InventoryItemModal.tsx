import React from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X, Utensils, Search, Loader2, Plus, Minus } from 'lucide-react';
import { ItemDraft } from '../types/inventory.types';
import { IngredientSelector } from '../../../shared/components/IngredientSelector';
import { ConversionPreview } from './ConversionPreview';
import ModalPortal from '../../../shared/components/ModalPortal';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemDraft: ItemDraft;
  setItemDraft: React.Dispatch<React.SetStateAction<ItemDraft>>;
  editingItemId: number | null;
  savingItem: boolean;
  searchingIngredients: boolean;
  ingredientResults: Ingredient[];
  ingredientSearchError: string | null;
  hasCompletedIngredientSearch: boolean;
  canSearchIngredients: boolean;
  expandedManualInput: boolean;
  setExpandedManualInput: (val: boolean) => void;
  conversions: any[];
  loadingConversions: boolean;
  onSearchIngredients: (query: string) => void;
  onSelectIngredient: (ing: Ingredient) => void;
  onQuickUnitAdjust: (unit: string, delta: number) => void;
  onSave: (e: React.FormEvent) => void;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  isOpen,
  onClose,
  itemDraft,
  setItemDraft,
  editingItemId,
  savingItem,
  searchingIngredients,
  ingredientResults,
  ingredientSearchError,
  hasCompletedIngredientSearch,
  canSearchIngredients,
  expandedManualInput,
  setExpandedManualInput,
  conversions,
  loadingConversions,
  onSearchIngredients,
  onSelectIngredient,
  onQuickUnitAdjust,
  onSave
}) => {
  const { t } = useTranslation();

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="w-full max-w-2xl bg-card rounded-[3rem] shadow-brand-hero border border-card-border overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-12 duration-500">
        <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="p-5 rounded-[1.8rem] bg-terracotta/10 text-terracotta shadow-brand-card">
                <Utensils size={28} />
              </div>
              <div>
                <p className="meal-overline text-foreground/40">{editingItemId ? 'Update Item' : 'Add Item'}</p>
                <h3 className="meal-section-title mt-1 text-3xl font-serif text-foreground">{editingItemId ? t('inventory.edit') : t('inventory.addNew')}</h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 rounded-full hover:bg-foreground/5 text-foreground/20 hover:text-terracotta transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={onSave} className="mt-10 space-y-8">
            <IngredientSelector
              label={t('inventory.searchIngredient')}
              query={itemDraft.ingredientQuery}
              onQueryChange={onSearchIngredients}
              onSelect={onSelectIngredient}
              selectedIngredient={itemDraft.selectedIngredient}
              searching={searchingIngredients}
              results={ingredientResults}
              error={ingredientSearchError}
              hasCompletedSearch={hasCompletedIngredientSearch}
              onClearSelection={() => setItemDraft({ ...itemDraft, selectedIngredient: null, ingredientQuery: '' })}
              renderExtraDetails={() => (
                <>
                  {!expandedManualInput && (
                    <div className="flex flex-wrap gap-3">
                      {conversions && conversions.filter(c => c.highPriority).slice(0, 6).map((conv) => {
                        const isSelected = itemDraft.unit.toLowerCase() === conv.unit.toLowerCase() && parseFloat(itemDraft.quantity) > 0;
                        return (
                          <div
                            key={conv.unit}
                            className={`group flex-1 min-w-[130px] flex items-center overflow-hidden rounded-[1.5rem] border transition-all ${
                              isSelected
                                ? 'bg-foreground text-background border-transparent shadow-lg'
                                : 'border-card-border bg-card text-foreground/80 hover:border-terracotta/40 shadow-sm'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={savingItem}
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickUnitAdjust(conv.unit, -1);
                              }}
                              className={`flex h-full items-center justify-center border-r px-3 py-4 transition-colors ${
                                isSelected ? 'border-background/10 hover:bg-background/10' : 'border-foreground/5 hover:bg-terracotta/10 hover:text-terracotta'
                              }`}
                            >
                              <Minus size={14} />
                            </button>
                            
                            <button
                              type="button"
                              disabled={savingItem}
                              onClick={() => onQuickUnitAdjust(conv.unit, 1)}
                              className="flex-1 px-3 py-4 text-left min-w-0"
                            >
                              <span className="text-xs font-bold block truncate">
                                {isSelected ? `${parseFloat(itemDraft.quantity)} ` : ''}
                                {conv.displayName.toLowerCase() === 'su bardağı' ? 'S.Bardağı' : 
                                 conv.displayName.toLowerCase() === 'yemek kaşığı' ? 'Y.Kaşık' : 
                                 conv.displayName.toLowerCase() === 'tatlı kaşığı' ? 'T.Kaşık' : 
                                 conv.displayName.toLowerCase() === 'çay kaşığı' ? 'Ç.Kaşık' : 
                                 conv.displayName.toLowerCase() === 'kahve fincanı' ? 'K.Fincanı' :
                                 conv.displayName}
                              </span>
                              <span className={`block text-[8px] mt-0.5 font-black uppercase tracking-widest ${isSelected ? 'text-background/40' : 'text-foreground/20'}`}>
                                {isSelected ? t('inventory.quickAdjust') : t('inventory.quickAdd')}
                              </span>
                            </button>

                            <button
                              type="button"
                              disabled={savingItem}
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickUnitAdjust(conv.unit, 1);
                              }}
                              className={`flex h-full items-center justify-center border-l px-3 py-4 transition-colors ${
                                isSelected ? 'border-background/10 hover:bg-background/10' : 'border-foreground/5 hover:bg-emerald-500/10 hover:text-emerald-500'
                              }`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        );
                      })}
                      {(!conversions || conversions.filter(c => c.highPriority).length === 0) && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const unit = itemDraft.selectedIngredient?.preferredUnit || (itemDraft.selectedIngredient?.physicalState === 'LIQUID' ? 'L' : 'KG');
                            onQuickUnitAdjust(unit, 1);
                          }}
                          className="group flex-1 p-5 rounded-[2rem] border border-card-border bg-card hover:border-terracotta hover:bg-terracotta/[0.02] transition-all text-left shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2.5 rounded-xl bg-terracotta/10 text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors">
                              <Plus size={16} />
                            </div>
                            <span className="text-[10px] font-black text-foreground/20 uppercase tracking-widest">{t('inventory.quickAdd')}</span>
                          </div>
                          <p className="text-sm font-bold text-foreground">
                            {itemDraft.selectedIngredient?.preferredUnit 
                              ? `1 ${itemDraft.selectedIngredient.preferredUnit.charAt(0).toUpperCase() + itemDraft.selectedIngredient.preferredUnit.slice(1)}` 
                              : (itemDraft.selectedIngredient?.physicalState === 'LIQUID' ? t('inventory.oneLitre') : t('inventory.oneKilo'))}
                          </p>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <button 
                        type="button" 
                        onClick={() => setExpandedManualInput(!expandedManualInput)}
                        className="text-[10px] font-black uppercase tracking-widest text-terracotta/60 hover:text-terracotta transition-colors flex items-center gap-1.5"
                      >
                        {expandedManualInput ? t('inventory.backToQuick') : t('inventory.manualAmount')}
                      </button>
                      <div className="flex gap-2">
                        {['ADD', 'SUBTRACT', 'SET'].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setItemDraft({ ...itemDraft, updateMode: mode as any })}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${
                              itemDraft.updateMode === mode 
                                ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20' 
                                : 'bg-card text-foreground/40 border border-card-border'
                            }`}
                          >
                            {mode === 'ADD' ? t('inventory.modeAdd') : mode === 'SUBTRACT' ? t('inventory.modeSubtract') : t('inventory.modeSet')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(expandedManualInput || itemDraft.updateMode === 'SET') && (
                      <div className="flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={itemDraft.quantity}
                            onChange={(e) => setItemDraft({ ...itemDraft, quantity: e.target.value })}
                            className="w-full rounded-2xl border border-card-border bg-card px-5 py-4 font-bold text-foreground focus:border-terracotta transition-all outline-none shadow-sm"
                            required
                          />
                        </div>
                        <select
                          value={itemDraft.unit.toUpperCase()}
                          onChange={(e) => setItemDraft({ ...itemDraft, unit: e.target.value })}
                          className="w-40 rounded-2xl border border-card-border bg-card px-4 py-4 font-bold text-foreground focus:border-terracotta transition-all outline-none shadow-sm uppercase"
                        >
                          {conversions && conversions.length > 0 ? (
                            conversions.map(conv => (
                              <option key={conv.unit} value={conv.unit.toUpperCase()}>
                                {conv.displayName}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="GRAM">Gram</option>
                              <option value="KG">Kg</option>
                              <option value="ML">Ml</option>
                              <option value="L">L</option>
                              <option value="ADET">Adet</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}
                    
                    <ConversionPreview 
                      loadingConversions={loadingConversions}
                      conversions={conversions}
                      itemDraft={itemDraft}
                    />
                  </div>
                </>
              )}
            />

            <div className="flex gap-4 pt-4 mt-10 border-t border-card-border/50 sticky bottom-0 bg-card py-4 z-10">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-5 rounded-[1.8rem] border border-card-border font-bold text-xs hover:bg-foreground/5 transition-all text-foreground/60"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={savingItem || !itemDraft.selectedIngredient || itemDraft.quantity === '' || parseFloat(itemDraft.quantity) < 0}
                className="flex-[2] rounded-[1.8rem] bg-terracotta py-5 font-bold text-white shadow-2xl shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingItem ? <Loader2 className="animate-spin" size={20} /> : (editingItemId ? t('inventory.saveChanges') : t('inventory.addToInventory'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
