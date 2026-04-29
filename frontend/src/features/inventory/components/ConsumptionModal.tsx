import React from 'react';
import { X, Users, Check, Plus, Loader2 } from 'lucide-react';
import { Inventory } from '../../../types';

interface ConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumingItem: Inventory | null;
  activeGroupMembers: any[];
  selectedUserIds: string[];
  setSelectedUserIds: React.Dispatch<React.SetStateAction<string[]>>;
  memberAmounts: Record<string, string>;
  setMemberAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isConsuming: boolean;
  onConfirm: (e: React.FormEvent) => void;
}

export const ConsumptionModal: React.FC<ConsumptionModalProps> = ({
  isOpen,
  onClose,
  consumingItem,
  activeGroupMembers,
  selectedUserIds,
  setSelectedUserIds,
  memberAmounts,
  setMemberAmounts,
  isConsuming,
  onConfirm
}) => {
  if (!isOpen || !consumingItem) return null;

  const totalConsumed = selectedUserIds.reduce(
    (sum, id) => sum + (parseFloat(memberAmounts[id]) || 0), 
    0
  );
  const hasInvalidAmounts = selectedUserIds.some((id) => {
    const parsedAmount = parseFloat(memberAmounts[id]);
    return !Number.isFinite(parsedAmount) || parsedAmount <= 0;
  });
  
  const isOverLimit = totalConsumed > consumingItem.quantity;
  const canSubmit = !isConsuming && selectedUserIds.length > 0 && !isOverLimit && !hasInvalidAmounts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-card rounded-[3rem] shadow-brand-hero border border-card-border overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-12 duration-500">
        <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-start justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className="p-5 rounded-[1.8rem] bg-moss-sage/10 text-moss-sage shadow-brand-soft">
                <Users size={28} />
              </div>
              <div>
                <p className="meal-overline text-foreground/40">Consuming Item</p>
                <h3 className="meal-section-title mt-1 text-3xl font-serif text-foreground">{consumingItem.ingredient?.name}</h3>
                <p className="mt-1 text-sm font-medium text-foreground-muted flex items-center gap-1.5">
                  Mevcut Stok: <span className="text-foreground font-black">{consumingItem.quantity} {consumingItem.unit}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 rounded-full hover:bg-foreground/5 text-foreground/20 hover:text-terracotta transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={onConfirm} className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 px-2">Tüketen Kişiler & Miktarlar</p>
              <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {activeGroupMembers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      className={`group p-4 rounded-[2rem] border transition-all duration-300 ${
                        isSelected 
                          ? 'bg-moss-sage/5 border-moss-sage/30 shadow-brand-soft' 
                          : 'border-card-border bg-card hover:border-moss-sage/30 hover:bg-foreground/[0.01]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-2xl ${isSelected ? 'bg-moss-sage text-white' : 'bg-foreground/5 text-foreground/40'}`}>
                            <Users size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground truncate max-w-[150px]">{user.name || 'İsimsiz'}</span>
                            <span className="text-[10px] text-foreground/40 truncate max-w-[150px]">{user.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isSelected && (
                            <div className="relative w-28 animate-in zoom-in-95 duration-200">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={memberAmounts[user.id] || ''}
                                onChange={(e) => {
                                  setMemberAmounts(prev => ({ ...prev, [user.id]: e.target.value }));
                                }}
                                className="base-input w-full rounded-xl border-moss-sage/30 py-2 pl-3 pr-10 text-right text-sm font-bold focus:border-moss-sage focus:ring-2 focus:ring-moss-sage/20"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-moss-sage/60 uppercase">
                                {consumingItem.unit}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserIds(prev => {
                                const newSelection = isSelected ? prev.filter(id => id !== user.id) : [...prev, user.id];
                                if (isSelected) {
                                  setMemberAmounts(prevAmts => ({ ...prevAmts, [user.id]: '' }));
                                }
                                return newSelection;
                              });
                            }}
                            className={`p-2 rounded-xl transition-all ${
                              isSelected 
                                ? 'bg-moss-sage text-white shadow-lg shadow-moss-sage/20' 
                                : 'border border-card-border hover:bg-foreground/5 text-foreground/20'
                            }`}
                          >
                            {isSelected ? <Check size={18} /> : <Plus size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedUserIds.length > 0 && hasInvalidAmounts && (
              <div className="rounded-[1.5rem] border border-terracotta/20 bg-terracotta/5 px-4 py-3 text-sm font-medium text-terracotta">
                Kaydetmeden önce seçili her kullanıcı için 0'dan büyük bir miktar girin.
              </div>
            )}

            {selectedUserIds.length > 0 && (
              <div className="bg-foreground/[0.03] p-5 rounded-[2rem] space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                  <span>Toplam Tüketim</span>
                  <span className={isOverLimit ? 'text-terracotta' : 'text-moss-sage'}>
                    {totalConsumed.toFixed(2)} / {consumingItem.quantity} {consumingItem.unit}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${isOverLimit ? 'bg-terracotta' : 'bg-moss-sage'}`}
                    style={{ 
                      width: `${Math.min(100, (totalConsumed / consumingItem.quantity) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-card-border/50 sticky bottom-0 bg-card py-4 z-20">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-4 rounded-2xl border border-card-border font-bold text-xs hover:bg-foreground/5 text-foreground/60 transition-all"
              >
                İPTAL
              </button>
              <button 
                type="submit" 
                disabled={!canSubmit}
                className="flex-[2] py-4 rounded-2xl bg-terracotta text-white font-bold shadow-xl shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConsuming ? <Loader2 className="mx-auto animate-spin" size={20} /> : 'TÜKETİMİ KAYDET'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
