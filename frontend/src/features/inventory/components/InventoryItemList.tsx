import React from 'react';
import { Pencil, Utensils, Trash2, Search, PlusCircle } from 'lucide-react';
import { Inventory } from '../../../types';
import { formatCategory, formatQuantity } from '../utils/inventoryUtils';

interface InventoryItemListProps {
  activeGroupName: string;
  items: Inventory[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEditGroup: () => void;
  onAddItem: () => void;
  onEditItem: (item: Inventory) => void;
  onDeleteItem: (id: number) => void;
  onConsumeItem: (item: Inventory) => void;
}

export const InventoryItemList: React.FC<InventoryItemListProps> = ({
  activeGroupName,
  items,
  searchQuery,
  onSearchChange,
  onEditGroup,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onConsumeItem
}) => {
  const categoryCount = new Set(items.map((item) => item.ingredient?.category).filter(Boolean)).size;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="meal-card meal-highlight-frame shadow-brand-card flex flex-col justify-between">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="meal-overline">Current Inventory</p>
              <h3 className="meal-section-title mt-1 text-3xl">{activeGroupName || 'Seçili Alan'}</h3>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onEditGroup} 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-card-border bg-background text-xs font-bold hover:text-terracotta transition-colors dark:bg-foreground/5"
              >
                <Pencil size={14} /> Düzenle
              </button>
              <button 
                onClick={onAddItem} 
                className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-espresso-midnight text-white text-sm font-black hover:bg-terracotta hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-espresso-midnight/20 dark:bg-terracotta dark:shadow-terracotta/30"
              >
                <PlusCircle size={20} />
                ÜRÜN EKLE
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-foreground/[0.02] border border-card-border/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Toplam Kalem</p>
              <p className="mt-2 text-3xl font-serif font-bold text-foreground">{items.length}</p>
            </div>
            <div className="p-5 rounded-3xl bg-foreground/[0.02] border border-card-border/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Kategoriler</p>
              <p className="mt-2 text-3xl font-serif font-bold text-foreground">{categoryCount}</p>
            </div>
            <div className="p-5 rounded-3xl bg-terracotta/5 border border-terracotta/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-terracotta/40">Kritik Stok</p>
              <p className="mt-2 text-3xl font-serif font-bold text-terracotta">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={18} />
          <input
            type="text"
            placeholder="Malzeme veya kategori ara..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-card py-3.5 pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 dark:bg-espresso-midnight dark:placeholder:text-alabaster/20"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-2xl border border-card-border/50">
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
            {items.length} KALEM GÖSTERİLİYOR
          </span>
        </div>
      </div>

      <div className="meal-card shadow-brand-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-card-border/50 bg-foreground/[0.01]">
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Ürün / Malzeme</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Kategori</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Miktar</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/30">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Utensils size={48} />
                      <p className="font-serif text-lg font-bold">Burada henüz bir şey yok.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="group hover:bg-foreground/[0.01] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/20 group-hover:bg-terracotta group-hover:text-white transition-all font-black">
                          {item.ingredient?.name.charAt(0)}
                        </div>
                        <span className="font-bold text-foreground">{item.ingredient?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-foreground/5 rounded-full text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                        {formatCategory(item.ingredient?.category)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-serif font-black text-foreground">
                          {formatQuantity(item.quantity)}
                        </span>
                        <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                          {item.unit}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onConsumeItem(item)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-moss-sage/10 text-moss-sage text-[10px] font-black hover:bg-moss-sage hover:text-white transition-all"
                        >
                          TÜKET
                        </button>
                        <button 
                          onClick={() => onEditItem(item)} 
                          className="p-2 rounded-xl text-foreground/20 hover:text-terracotta hover:bg-terracotta/5 transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteItem(item.id)} 
                          className="p-2 rounded-xl text-foreground/20 hover:text-terracotta hover:bg-terracotta/5 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
