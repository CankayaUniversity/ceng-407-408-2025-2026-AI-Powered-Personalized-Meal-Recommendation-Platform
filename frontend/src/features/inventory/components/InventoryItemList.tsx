import React from 'react';
import { Pencil, Utensils, Trash2, Search, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Inventory } from '../../../types';
import { formatCategory, formatQuantity } from '../utils/inventoryUtils';

interface InventoryItemListProps {
  activeGroupName: string;
  totalItems: number;
  categoryCount: number;
  lowStockCount: number;
  items: Inventory[];
  searchQuery: string;
  shoppingListItems: any[];
  onSearchChange: (query: string) => void;
  onEditGroup: () => void;
  onAddItem: () => void;
  onEditItem: (item: Inventory) => void;
  onDeleteItem: (id: number) => void;
  onConsumeItem: (item: Inventory) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  loadingItems: boolean;
}

export const InventoryItemList: React.FC<InventoryItemListProps> = ({
  activeGroupName,
  totalItems,
  categoryCount: totalCategoryCount,
  lowStockCount: totalLowStockCount,
  items,
  searchQuery,
  shoppingListItems,
  onSearchChange,
  onEditGroup,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onConsumeItem,
  currentPage,
  onPageChange,
  loadingItems
}) => {
  const { t } = useTranslation();

  const getStockStatus = (item: Inventory) => {
    return shoppingListItems.find(
      si => si.ingredientId === item.ingredient?.id && si.groupName === activeGroupName
    )?.status;
  };

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="meal-card meal-highlight-frame shadow-brand-card flex flex-col justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="meal-overline">{t('inventory.itemList.currentInventory')}</p>
              <h3 className="meal-section-title mt-1 text-2xl sm:text-3xl">{activeGroupName || t('inventory.itemList.defaultGroupName')}</h3>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={onEditGroup} 
                className="btn-responsive px-4 py-2.5 rounded-xl border border-card-border bg-background text-xs font-bold hover:text-terracotta transition-colors dark:bg-foreground/5"
              >
                <Pencil size={14} /> <span className="meal-no-wrap">{t('inventory.itemList.edit')}</span>
              </button>
              <button 
                onClick={onAddItem} 
                className="flex-[2] sm:flex-none btn-flex-icon bg-espresso-midnight text-white text-[11px] sm:text-sm font-black hover:bg-terracotta hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-espresso-midnight/20 dark:bg-terracotta dark:shadow-terracotta/30"
              >
                <PlusCircle size={20} className="hidden sm:block" />
                <span className="meal-no-wrap text-center">{t('inventory.itemList.addItem')}</span>
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-foreground/[0.02] border border-card-border/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('inventory.itemList.totalItems')}</p>
              <p className="mt-2 text-3xl font-serif font-bold text-foreground">{totalItems}</p>
            </div>
            <div className="p-5 rounded-3xl bg-foreground/[0.02] border border-card-border/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{t('inventory.itemList.categories')}</p>
              <p className="mt-2 text-3xl font-serif font-bold text-foreground">{totalCategoryCount}</p>
            </div>
            <div className="p-5 rounded-3xl bg-terracotta/5 border border-terracotta/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-terracotta/40">{t('inventory.itemList.criticalStock')}</p>
              <p className="mt-2 text-3xl font-serif font-bold text-terracotta">{totalLowStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={18} />
          <input
            type="text"
            placeholder={t('inventory.itemList.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-2xl border border-card-border bg-card py-3.5 pl-12 pr-4 text-sm font-medium text-foreground outline-none transition-all focus:border-terracotta/50 focus:ring-4 focus:ring-terracotta/5 dark:bg-espresso-midnight dark:placeholder:text-alabaster/20"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-2xl border border-card-border/50">
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
            {t('inventory.itemList.showing', { count: items.length })}
          </span>
        </div>
      </div>

      <div className="meal-card shadow-brand-card overflow-hidden">
        {loadingItems ? (
          <div className="px-6 py-20 text-center">
            <div className="flex flex-col items-center gap-3 opacity-20 animate-pulse">
              <Utensils size={48} />
              <p className="font-serif text-lg font-bold">{t('common.loading')}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-card-border/50 bg-foreground/[0.01]">
                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">{t('inventory.itemList.colProduct')}</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 hidden md:table-cell">{t('common.category')}</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">{t('inventory.itemList.colQuantity')}</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">{t('inventory.itemList.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border/30">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <Utensils size={48} />
                          <p className="font-serif text-lg font-bold">{t('inventory.itemList.empty')}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <tr key={item.id} className={`group transition-colors ${status ? 'bg-terracotta/[0.02]' : 'hover:bg-foreground/[0.01]'}`}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all font-black ${
                                status 
                                  ? 'bg-terracotta text-white' 
                                  : 'bg-foreground/5 text-foreground/20 group-hover:bg-terracotta group-hover:text-white'
                              }`}>
                                {item.ingredient?.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{item.ingredient?.name}</span>
                                {status && (
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${status === 'MISSING' ? 'text-terracotta' : 'text-amber-600'}`}>
                                    {status === 'MISSING' ? t('inventory.itemList.statusMissing') : t('inventory.itemList.statusLow')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 hidden md:table-cell">
                            <span className="px-3 py-1 bg-foreground/5 rounded-full text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                              {formatCategory(item.ingredient?.category)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right meal-no-wrap">
                            <div className="flex flex-col items-end">
                              <span className={`text-lg font-serif font-black ${status ? 'text-terracotta' : 'text-foreground'}`}>
                                {formatQuantity(item.quantity)}
                              </span>
                              <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                                {item.unit}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                              <button 
                                onClick={() => onConsumeItem(item)}
                                className="btn-table-action bg-moss-sage/10 text-moss-sage hover:bg-moss-sage hover:text-white"
                              >
                                <Utensils size={14} className="sm:hidden" />
                                <span className="hidden sm:inline">{t('inventory.itemList.consume')}</span>
                              </button>
                              <div className="flex items-center">
                                <button 
                                  onClick={() => onEditItem(item)} 
                                  className="p-2 rounded-xl text-foreground/20 hover:text-terracotta hover:bg-terracotta/5 transition-all"
                                  title={t('inventory.itemList.edit')}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => onDeleteItem(item.id)} 
                                  className="p-2 rounded-xl text-foreground/20 hover:text-terracotta hover:bg-terracotta/5 transition-all"
                                  title={t('admin.ingredients.delete')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 bg-foreground/[0.01] border-t border-card-border/50">
              <p className="text-xs font-bold text-foreground/30 uppercase tracking-widest">
                {t('recipes.page')} {currentPage + 1}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="p-2 rounded-xl border border-card-border/50 text-foreground/30 hover:text-terracotta hover:bg-terracotta/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={items.length < 10}
                  className="p-2 rounded-xl border border-card-border/50 text-foreground/30 hover:text-terracotta hover:bg-terracotta/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
