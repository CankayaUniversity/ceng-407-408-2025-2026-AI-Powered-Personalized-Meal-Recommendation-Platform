import React from 'react';
import { X, Home, Loader2, Trash2 } from 'lucide-react';
import { GroupDraft } from '../types/inventory.types';
import { LOCATION_ICONS } from '../utils/inventoryUtils';
import ModalPortal from '../../../shared/components/ModalPortal';

interface InventoryGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupDraft: GroupDraft;
  setGroupDraft: React.Dispatch<React.SetStateAction<GroupDraft>>;
  editingGroupId: number | null;
  savingGroup: boolean;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: number) => void;
}

export const InventoryGroupModal: React.FC<InventoryGroupModalProps> = ({
  isOpen,
  onClose,
  groupDraft,
  setGroupDraft,
  editingGroupId,
  savingGroup,
  onSave,
  onDelete
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-espresso-midnight/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-xl bg-card rounded-[2.5rem] shadow-brand-hero border border-card-border overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-500">
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-terracotta/10 text-terracotta">
                  <Home size={24} />
                </div>
                <div>
                  <p className="meal-overline text-foreground/40">{editingGroupId ? 'Update Location' : 'New Location'}</p>
                  <h3 className="meal-section-title mt-1 text-2xl text-foreground">{editingGroupId ? 'Lokasyonu Düzenle' : 'Yeni Lokasyon Ekle'}</h3>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5 text-foreground/30"><X size={20} /></button>
            </div>

            <form onSubmit={onSave} className="mt-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 px-2">Lokasyon Adı</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Örn: Benim Mutfağım, Ofis Kilieri..."
                  value={groupDraft.name}
                  onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
                  className="w-full rounded-2xl border border-card-border bg-card px-5 py-4 font-bold text-foreground focus:border-terracotta focus:ring-4 focus:ring-terracotta/10 transition-all outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 px-2">İkon Seçimi</label>
                <div className="grid grid-cols-5 gap-3">
                  {LOCATION_ICONS.map((option) => {
                    const Icon = option.icon;
                    const selected = groupDraft.icon === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGroupDraft({ ...groupDraft, icon: option.value })}
                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                          selected
                            ? 'border-terracotta bg-terracotta/5 text-terracotta shadow-inner'
                            : 'border-card-border bg-card hover:bg-foreground/5 text-foreground/30'
                        }`}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-card-border/50 sticky bottom-0 bg-card py-4 z-20">
                {editingGroupId && (
                  <button
                    type="button"
                    onClick={() => onDelete(editingGroupId)}
                    className="flex-none p-4 rounded-2xl border border-terracotta/20 text-terracotta hover:bg-terracotta hover:text-white transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingGroup || !groupDraft.name.trim()}
                  className="flex-1 rounded-2xl bg-terracotta py-4 font-bold text-white shadow-xl shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingGroup ? <Loader2 className="mx-auto animate-spin" size={20} /> : (editingGroupId ? 'GÜNCELLE' : 'OLUŞTUR')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
