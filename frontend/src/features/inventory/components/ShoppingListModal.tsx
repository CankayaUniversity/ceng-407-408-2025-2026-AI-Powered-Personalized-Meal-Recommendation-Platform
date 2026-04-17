import React, { useState } from 'react';
import { X, ShoppingCart, AlertTriangle, Package, MapPin, Filter, Check } from 'lucide-react';
import { InventoryGroup } from '../../../types';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';

interface ShoppingItem {
  ingredientId: number;
  ingredientName: string;
  currentQuantity: number;
  unit: string;
  groupName: string;
  status: 'MISSING' | 'LOW';
}

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  isLoading: boolean;
  groups: InventoryGroup[];
  selectedGroupIds: number[];
  onGroupChange: (groupIds: number[]) => void;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  isOpen,
  onClose,
  items,
  isLoading,
  groups,
  selectedGroupIds,
  onGroupChange
}) => {
  const [showFilters, setShowFilters] = useState(true);

  if (!isOpen) return null;

  const toggleGroup = (id: number) => {
    if (selectedGroupIds.includes(id)) {
      onGroupChange(selectedGroupIds.filter(gid => gid !== id));
    } else {
      onGroupChange([...selectedGroupIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-card rounded-[3rem] shadow-brand-hero border border-card-border overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-12 duration-500">
        {/* Header */}
        <div className="p-8 border-b border-card-border/50 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-[1.5rem] bg-terracotta/10 text-terracotta shadow-brand-card">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h3 className="meal-section-title text-2xl font-serif text-foreground">Alışveriş Listesi</h3>
              <p className="text-xs font-medium text-foreground-muted mt-0.5">Azalan ve biten malzemeleriniz</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-full transition-all ${showFilters ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20' : 'hover:bg-foreground/5 text-foreground/40'}`}
              title="Filtrele"
            >
              <Filter size={20} />
            </button>
            <button 
              onClick={onClose} 
              className="p-3 rounded-full hover:bg-foreground/5 text-foreground/20 hover:text-terracotta transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Location Filters */}
        {showFilters && (
          <div className="px-8 py-6 border-b border-card-border/30 bg-foreground/[0.02] animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Lokasyon Seçimi</span>
              <div className="flex gap-4">
                <button 
                  onClick={() => onGroupChange(groups.map(g => g.id))}
                  className="text-[10px] font-bold text-terracotta hover:underline focus:outline-none"
                  type="button"
                >
                  Tümünü Seç
                </button>
                <button 
                  onClick={() => onGroupChange([])}
                  className="text-[10px] font-bold text-foreground/40 hover:underline focus:outline-none"
                  type="button"
                >
                  Temizle
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedGroupIds.includes(group.id)
                      ? 'bg-terracotta border-terracotta text-white shadow-md shadow-terracotta/10'
                      : 'bg-card border-card-border text-foreground-muted hover:border-terracotta/30'
                  }`}
                >
                  {selectedGroupIds.includes(group.id) && <Check size={12} />}
                  {group.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-foreground/[0.01]">
          {isLoading ? (
            <LoadingSpinner size="md" message="Liste hazırlanıyor..." />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="w-24 h-24 rounded-[2.5rem] bg-moss-sage/5 flex items-center justify-center text-moss-sage/40">
                <Package size={40} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-serif text-foreground">Her şey yolunda!</h4>
                <p className="text-sm text-foreground-muted max-w-[280px]">
                  {selectedGroupIds.length === 0 
                    ? 'Lütfen en az bir lokasyon seçin.' 
                    : 'Seçili lokasyonlarda alışveriş listesine eklenecek azalan bir malzeme bulunamadı.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div 
                  key={`${item.ingredientId}-${index}`}
                  className="group relative p-5 rounded-[2rem] bg-card border border-card-border hover:border-terracotta/30 hover:shadow-brand-card transition-all duration-500 overflow-hidden"
                >
                  {/* Status Indicator */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${item.status === 'MISSING' ? 'bg-terracotta' : 'bg-amber-500'}`} />
                  
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3.5 rounded-2xl ${item.status === 'MISSING' ? 'bg-terracotta/10 text-terracotta' : 'bg-amber-500/10 text-amber-500'}`}>
                        {item.status === 'MISSING' ? <AlertTriangle size={18} /> : <Package size={18} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30 mb-0.5">
                          {item.status === 'MISSING' ? 'BİTTİ' : 'AZALDI'}
                        </span>
                        <h4 className="text-lg font-bold text-foreground truncate group-hover:text-terracotta transition-colors">{item.ingredientName}</h4>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-foreground-muted">
                          <span className="flex items-center gap-1">
                            <MapPin size={10} className="text-foreground/20" /> {item.groupName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black text-foreground/20 uppercase tracking-tighter">MEVCUT STOK</span>
                      <div className={`px-4 py-2 rounded-xl font-black text-sm shadow-inner transition-all ${
                        item.status === 'MISSING' 
                          ? 'bg-terracotta/5 text-terracotta' 
                          : 'bg-amber-500/5 text-amber-500'
                      }`}>
                        {item.currentQuantity} {item.unit}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-card-border/50 bg-card flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 px-6 rounded-2xl border border-card-border font-bold text-xs hover:bg-foreground/5 text-foreground transition-all uppercase tracking-widest"
          >
            Kapat
          </button>
          {items.length > 0 && (
            <button 
              onClick={() => window.print()}
              className="flex-[2] py-4 px-6 rounded-2xl bg-terracotta text-white font-bold text-xs shadow-lg shadow-terracotta/20 hover:scale-[1.02] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              LİSTEYİ YAZDIR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
