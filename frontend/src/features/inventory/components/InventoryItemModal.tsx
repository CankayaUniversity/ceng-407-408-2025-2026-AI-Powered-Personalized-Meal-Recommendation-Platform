import React from 'react';
import { X, Utensils, Search, Loader2, Plus } from 'lucide-react';
import { ItemDraft } from '../types/inventory.types';
import { Ingredient } from '../../../types';
import { ConversionPreview } from './ConversionPreview';

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
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setIsSearchFocused(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  if (!isOpen) return null;

  const shouldShowSearchDropdown =
    isSearchFocused &&
    !itemDraft.selectedIngredient &&
    canSearchIngredients &&
    (searchingIngredients || ingredientResults.length > 0 || !!ingredientSearchError || hasCompletedIngredientSearch);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-card rounded-[3rem] shadow-brand-hero border border-card-border overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-12 duration-500">
        <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="p-5 rounded-[1.8rem] bg-terracotta/10 text-terracotta shadow-brand-card">
                <Utensils size={28} />
              </div>
              <div>
                <p className="meal-overline text-foreground/40">{editingItemId ? 'Update Item' : 'Add Item'}</p>
                <h3 className="meal-section-title mt-1 text-3xl font-serif text-foreground">{editingItemId ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h3>
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
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 px-2">Malzeme Ara</label>
              <div ref={searchContainerRef} className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-terracotta transition-colors">
                  <Search size={20} />
                </div>
                <input
                  autoFocus
                  type="text"
                  placeholder="Örn: Domates, Süt, Tavuk..."
                  value={itemDraft.ingredientQuery}
                  onChange={(e) => onSearchIngredients(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchFocused(false);
                    }
                  }}
                  className="w-full rounded-[2rem] border border-card-border bg-foreground/[0.02] pl-16 pr-6 py-5 font-bold text-foreground focus:bg-card focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none"
                  required
                />
                {searchingIngredients && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <Loader2 size={20} className="animate-spin text-terracotta" />
                  </div>
                )}

                {shouldShowSearchDropdown && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-3 max-h-[320px] overflow-y-auto rounded-[2rem] border border-card-border bg-card p-3 shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar">
                    {searchingIngredients ? (
                      <div className="flex items-center justify-center gap-3 px-4 py-6 text-sm font-medium text-foreground/50">
                        <Loader2 size={18} className="animate-spin text-terracotta" />
                        Malzemeler aranıyor...
                      </div>
                    ) : ingredientSearchError ? (
                      <div className="px-4 py-5 text-sm font-semibold text-red-500 bg-red-500/5 rounded-[1.5rem]">
                        {ingredientSearchError}
                      </div>
                    ) : ingredientResults.length > 0 ? (
                      ingredientResults.map((ing) => (
                        <button
                          key={ing.id}
                          type="button"
                          onClick={() => {
                            onSelectIngredient(ing);
                            setIsSearchFocused(false);
                          }}
                          className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all hover:bg-terracotta/5 group"
                        >
                          <div className="h-12 w-12 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/20 group-hover:bg-terracotta group-hover:text-white transition-colors font-black">
                            {ing.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground">{ing.name}</p>
                            <p className="text-[10px] font-medium text-foreground-muted uppercase tracking-widest mt-0.5">{ing.category?.replace('_', ' ') || 'Genel'}</p>
                          </div>
                          <Plus size={16} className="text-foreground/10 group-hover:text-terracotta" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-sm font-medium text-foreground/45">
                        Bu aramayla eşleşen bir malzeme bulunamadı.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {itemDraft.selectedIngredient && (
              <div className="space-y-6 p-8 rounded-[2.5rem] bg-terracotta/[0.03] border border-terracotta/10 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between border-b border-terracotta/10 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-terracotta text-white flex items-center justify-center shadow-lg shadow-terracotta/20">
                      <Utensils size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-terracotta/40">Seçili Malzeme</p>
                      <p className="text-xl font-serif font-bold text-foreground">{itemDraft.selectedIngredient.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/20">Kategori</p>
                    <span className="px-3 py-1 bg-card border border-card-border rounded-full text-[10px] font-bold text-foreground/50 shadow-sm">
                      {itemDraft.selectedIngredient.category?.replace('_', ' ') || 'Genel'}
                    </span>
                  </div>
                </div>

                {!expandedManualInput && (
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button" 
                      onClick={() => onQuickUnitAdjust(itemDraft.selectedIngredient?.physicalState === 'LIQUID' ? 'L' : 'KG', 1)}
                      className="group p-5 rounded-[2rem] border border-card-border bg-card hover:border-terracotta hover:bg-terracotta/[0.02] transition-all text-left shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-terracotta/10 text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors">
                          <Plus size={16} />
                        </div>
                        <span className="text-[10px] font-black text-foreground/20 uppercase tracking-widest">Hızlı Ekle</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">1 {itemDraft.selectedIngredient?.physicalState === 'LIQUID' ? 'Litre' : 'Kilo'}</p>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onQuickUnitAdjust('ADET', 1)}
                      className="group p-5 rounded-[2rem] border border-card-border bg-card hover:border-terracotta hover:bg-terracotta/[0.02] transition-all text-left shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-terracotta/10 text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors">
                          <Plus size={16} />
                        </div>
                        <span className="text-[10px] font-black text-foreground/20 uppercase tracking-widest">Hızlı Ekle</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">1 Adet / Paket</p>
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <button 
                      type="button" 
                      onClick={() => setExpandedManualInput(!expandedManualInput)}
                      className="text-[10px] font-black uppercase tracking-widest text-terracotta/60 hover:text-terracotta transition-colors flex items-center gap-1.5"
                    >
                      {expandedManualInput ? 'HIZLI SEÇENEKLERE DÖN' : 'MANUEL MİKTAR GİR'}
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
                          {mode === 'ADD' ? 'EKLE' : mode === 'SUBTRACT' ? 'ÇIKAR' : 'EŞİTLE'}
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
                        value={itemDraft.unit}
                        onChange={(e) => setItemDraft({ ...itemDraft, unit: e.target.value })}
                        className="w-32 rounded-2xl border border-card-border bg-card px-4 py-4 font-bold text-foreground focus:border-terracotta transition-all outline-none shadow-sm"
                      >
                        <option value="GRAM">Gr</option>
                        <option value="KG">Kg</option>
                        <option value="ML">Ml</option>
                        <option value="LITRE">L</option>
                        <option value="ADET">Adet</option>
                        <option value="PAKET">Paket</option>
                        <option value="DILIM">Dilim</option>
                      </select>
                    </div>
                  )}
                  
                  <ConversionPreview 
                    loadingConversions={loadingConversions}
                    conversions={conversions}
                    itemDraft={itemDraft}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4 mt-10 border-t border-card-border/50 sticky bottom-0 bg-card py-4 z-10">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-5 rounded-[1.8rem] border border-card-border font-bold text-xs hover:bg-foreground/5 transition-all text-foreground/60"
              >
                İPTAL
              </button>
              <button
                type="submit"
                disabled={savingItem || !itemDraft.selectedIngredient || itemDraft.quantity === '' || parseFloat(itemDraft.quantity) < 0}
                className="flex-[2] rounded-[1.8rem] bg-terracotta py-5 font-bold text-white shadow-2xl shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingItem ? <Loader2 className="animate-spin" size={20} /> : (editingItemId ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ENVANTERE EKLE')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
