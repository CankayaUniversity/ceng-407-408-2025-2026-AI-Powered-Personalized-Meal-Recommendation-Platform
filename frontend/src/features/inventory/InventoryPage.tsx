import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Briefcase,
  Home,
  Leaf,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useInventoryService } from '../../services/inventoryService';
import { useToast } from '../../shared/hooks/useToast';
import { type Ingredient, type Inventory, type InventoryGroup, type InventoryGroupRequest } from '../../types';

/**
 * MealAI - Inventory Management Page
 * Hatalardan arındırılmış, derleme (build) uyumlu versiyon.
 */

type GroupDraft = { name: string; icon: string };
type ItemDraft = { ingredientQuery: string; selectedIngredient: Ingredient | null; quantity: string; unit: string };

const LOCATION_ICONS = [
  { value: 'home', label: 'Ev', icon: Home },
  { value: 'briefcase', label: 'Ofis', icon: Briefcase },
  { value: 'map-pin', label: 'Şehir', icon: MapPin },
  { value: 'package', label: 'Kiler', icon: Package },
  { value: 'leaf', label: 'Yazlık', icon: Leaf }
] as const;

const UNIT_OPTIONS = ['GRAM', 'ADET', 'ML', 'PAKET', 'LITRE'] as const;

const createGroupDraft = (): GroupDraft => ({ name: '', icon: 'home' });
const createItemDraft = (): ItemDraft => ({ ingredientQuery: '', selectedIngredient: null, quantity: '', unit: 'GRAM' });

const formatCategory = (category?: string | null) =>
    category
        ? category.split('_').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ')
        : 'Kategorisiz';

const formatQuantity = (value: number) =>
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);

const InventoryPage: React.FC = () => {
  const { authenticated } = useAuth();
  const { showToast } = useToast();
  const inventoryService = useInventoryService();

  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(createGroupDraft());
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(createItemDraft());
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [searchingIngredients, setSearchingIngredients] = useState(false);

  const activeGroup = useMemo(
      () => groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null,
      [groups, selectedGroupId]
  );

  const activeItems = activeGroup?.items ?? [];
  const categoryCount = new Set(activeItems.map((item) => item.ingredient?.category).filter(Boolean)).size;

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemDraft(createItemDraft());
    setIngredientResults([]);
  };

  const closeLocationModal = () => {
    setLocationModalOpen(false);
    setEditingGroupId(null);
    setGroupDraft(createGroupDraft());
  };

  // Malzeme seçim fonksiyonu (Hatanın ana çözümü)
  const handleIngredientSelect = (ing: Ingredient) => {
    setItemDraft(prev => ({
      ...prev,
      ingredientQuery: ing.name,
      selectedIngredient: ing
    }));
    setIngredientResults([]);
  };

  const loadGroups = useCallback(async (options?: { preferredGroupId?: number | null; showLoader?: boolean }) => {
    if (options?.showLoader) setLoading(true);
    try {
      const nextGroups = await inventoryService.getInventoryGroups();
      setGroups(nextGroups);

      setSelectedGroupId((current) => {
        const preferred = options?.preferredGroupId ?? current;
        if (preferred && nextGroups.some((group) => group.id === preferred)) return preferred;
        return nextGroups[0]?.id ?? null;
      });
    } catch (error) {
      showToast('Envanter bilgileri alınamadı.', 'error');
    } finally {
      if (options?.showLoader) setLoading(false);
    }
  }, [inventoryService, showToast]);

  useEffect(() => {
    if (!authenticated) return;
    void loadGroups({ showLoader: true });
  }, [authenticated, loadGroups]);

  useEffect(() => {
    const query = itemDraft.ingredientQuery.trim();
    if (itemDraft.selectedIngredient && query === itemDraft.selectedIngredient.name) {
      setIngredientResults([]);
      return;
    }
    if (query.length < 2) {
      setIngredientResults([]);
      return;
    }
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchingIngredients(true);
        const results = await inventoryService.searchIngredients(query, 8);
        if (active) setIngredientResults(results);
      } catch {
        if (active) setIngredientResults([]);
      } finally {
        if (active) setSearchingIngredients(false);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [inventoryService, itemDraft.ingredientQuery, itemDraft.selectedIngredient]);

  useEffect(() => {
    resetItemForm();
  }, [selectedGroupId]);

  const handleLocationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!groupDraft.name.trim()) return;

    setSavingGroup(true);
    const payload: InventoryGroupRequest = { name: groupDraft.name.trim(), icon: groupDraft.icon };
    try {
      const response = editingGroupId
          ? await inventoryService.updateInventoryGroup(editingGroupId, payload)
          : await inventoryService.createInventoryGroup(payload);

      await loadGroups({ preferredGroupId: response.id });
      closeLocationModal();
      showToast(editingGroupId ? 'Lokasyon güncellendi.' : 'Yeni lokasyon başarıyla eklendi.', 'success');
    } catch (error) {
      showToast('Lokasyon işlemi sırasında bir hata oluştu.', 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleItemSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeGroup || !itemDraft.selectedIngredient) {
      showToast('Lütfen listeden bir malzeme seçin.', 'info');
      return;
    }
    const quantity = Number(itemDraft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showToast('Lütfen geçerli bir miktar girin.', 'info');
      return;
    }

    setSavingItem(true);
    try {
      if (editingItemId) {
        await inventoryService.updateInventoryItem(activeGroup.id, editingItemId, {
          ingredientId: itemDraft.selectedIngredient.id,
          quantity,
          unit: itemDraft.unit
        });
      } else {
        await inventoryService.createInventoryItem(activeGroup.id, {
          ingredientId: itemDraft.selectedIngredient.id,
          quantity,
          unit: itemDraft.unit
        });
      }
      await loadGroups({ preferredGroupId: activeGroup.id });
      resetItemForm();
      showToast(editingItemId ? 'Stok güncellendi.' : 'Malzeme başarıyla eklendi.', 'success');
    } catch (error) {
      showToast('Stok kaydedilirken hata oluştu.', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    if (!window.confirm(`${activeGroup.name} lokasyonunu ve içindeki tüm stokları silmek istediğine emin misin?`)) return;
    try {
      await inventoryService.deleteInventoryGroup(activeGroup.id);
      await loadGroups();
      showToast('Lokasyon silindi.', 'success');
    } catch (error) {
      showToast('Lokasyon silinemedi.', 'error');
    }
  };

  const handleDeleteItem = async (item: Inventory) => {
    if (!activeGroup) return;
    if (!window.confirm(`${item.ingredient?.name} öğesini stoktan kaldırmak istiyor musun?`)) return;
    try {
      await inventoryService.deleteInventoryItem(activeGroup.id, item.id);
      await loadGroups({ preferredGroupId: activeGroup.id });
      showToast('Ürün stoktan çıkarıldı.', 'success');
    } catch (error) {
      showToast('Ürün silinemedi.', 'error');
    }
  };

  if (!authenticated) return null;

  if (loading) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="meal-card flex items-center gap-4 px-8 py-7 shadow-brand-hero">
            <Loader2 size={24} className="animate-spin text-terracotta" />
            <div>
              <p className="font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Envanter Yükleniyor</p>
              <p className="text-sm text-foreground-muted">Dolaplar kontrol ediliyor...</p>
            </div>
          </div>
        </div>
    );
  }

  return (
      <>
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="relative overflow-hidden rounded-[2.75rem] bg-espresso-midnight px-8 py-10 text-white shadow-brand-hero border border-white/5">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-terracotta/20 blur-[100px]" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-moss-sage/10 blur-[100px]" />
            </div>
            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="meal-badge-neon px-4 text-[11px] font-bold tracking-[0.22em]">
                  <Boxes size={14} />
                  Multi-Inventory
                </div>
                <div>
                  <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">Stoklarını lokasyon bazlı yönet.</h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-alabaster/60 sm:text-lg">
                    Ev, ofis veya yazlık için ayrı envanterler oluştur; elindeki malzemeleri MealAI ile takip et.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-alabaster/40">Lokasyonlar</p>
                  <p className="mt-1 text-3xl font-serif font-bold">{groups.length}</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setEditingGroupId(null); setGroupDraft(createGroupDraft()); setLocationModalOpen(true); }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-6 py-4 font-bold text-white shadow-xl shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus size={18} />
                  Yeni Lokasyon
                </button>
              </div>
            </div>
          </header>

          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div>
                <p className="meal-overline text-foreground/40">Location Selector</p>
                <h2 className="meal-section-title mt-1 text-2xl">Nerede olduğunu seç</h2>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 px-1 custom-scrollbar">
              {groups.map((group) => {
                const iconOption = LOCATION_ICONS.find((o) => o.value === group.icon) ?? LOCATION_ICONS[0];
                const Icon = iconOption.icon;
                const active = activeGroup?.id === group.id;
                return (
                    <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`min-w-[240px] rounded-[2.2rem] border p-5 text-left transition-all ${
                            active
                                ? 'border-transparent bg-terracotta text-white shadow-lg shadow-terracotta/20'
                                : 'border-card-border bg-background hover:border-sage/50 text-foreground shadow-brand-card'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`rounded-2xl p-3 ${active ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                          <Icon size={20} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-white/60' : 'text-foreground/30'}`}>
                        {group.itemCount} Ürün
                    </span>
                      </div>
                      <p className="mt-6 font-serif text-2xl font-bold">{group.name}</p>
                      <p className={`mt-1 text-xs font-medium ${active ? 'text-white/70' : 'text-foreground-muted'}`}>
                        {iconOption.label} envanteri
                      </p>
                    </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
            <section className="meal-card shadow-brand-card self-start border border-card-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="meal-overline">Stock Editor</p>
                  <h3 className="meal-section-title mt-2 text-2xl">{editingItemId ? 'Malzemeyi Güncelle' : 'Malzeme Ekle'}</h3>
                </div>
                {editingItemId && (
                    <button type="button" onClick={resetItemForm} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-foreground/40">
                      <X size={18} />
                    </button>
                )}
              </div>

              <form onSubmit={handleItemSubmit} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Malzeme Ara</span>
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" />
                    <input
                        type="text"
                        value={itemDraft.ingredientQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemDraft(prev => ({ ...prev, ingredientQuery: val, selectedIngredient: prev.selectedIngredient?.name === val ? prev.selectedIngredient : null }));
                        }}
                        placeholder="Domates, pirinç..."
                        className="base-input py-4 pl-12 pr-4 bg-background dark:bg-white/5"
                    />

                    {(ingredientResults.length > 0 || searchingIngredients) && (
                        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-card-border bg-background shadow-brand-hero animate-in fade-in zoom-in-95 duration-200">
                          {searchingIngredients ? (
                              <div className="flex items-center gap-3 p-4 text-xs font-bold text-foreground/40">
                                <Loader2 size={14} className="animate-spin text-terracotta" />
                                ARANIYOR...
                              </div>
                          ) : (
                              ingredientResults.map((ing) => (
                                  <button key={ing.id} type="button" onClick={() => handleIngredientSelect(ing)} className="flex w-full items-center justify-between p-4 text-left hover:bg-terracotta/5 group transition-colors">
                                    <div>
                                      <p className="font-bold text-foreground text-sm">{ing.name}</p>
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/30">{formatCategory(ing.category)}</p>
                                    </div>
                                    <Plus size={14} className="text-terracotta opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                              ))
                          )}
                        </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Miktar</span>
                    <input
                        type="number"
                        step="0.01"
                        value={itemDraft.quantity}
                        onChange={(e) => setItemDraft(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="0.00"
                        className="base-input py-4 bg-background dark:bg-white/5 text-center font-serif text-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Birim</span>
                    <div className="grid grid-cols-2 gap-1.5 h-full content-start">
                      {UNIT_OPTIONS.slice(0, 4).map((unit) => (
                          <button
                              key={unit}
                              type="button"
                              onClick={() => setItemDraft(prev => ({ ...prev, unit }))}
                              className={`py-2.5 rounded-xl text-[10px] font-bold transition-all border ${
                                  itemDraft.unit === unit
                                      ? 'bg-espresso-midnight text-white border-transparent'
                                      : 'bg-background border-card-border text-foreground-muted hover:border-terracotta/40'
                              }`}
                          >
                            {unit}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                    type="submit"
                    disabled={savingItem || !activeGroup}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-espresso-midnight dark:bg-terracotta text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingItem ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {editingItemId ? 'STOK GÜNCELLE' : 'LOKASYONA EKLE'}
                </button>
              </form>
            </section>

            <section className="space-y-6">
              <div className="meal-card shadow-brand-card border border-card-border">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="meal-overline">Current Inventory</p>
                    <h3 className="meal-section-title mt-1 text-3xl">{activeGroup?.name || 'Seçili Alan'}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditingGroupId(activeGroup?.id || null); setGroupDraft({ name: activeGroup?.name || '', icon: activeGroup?.icon || 'home' }); setLocationModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-card-border bg-background text-xs font-bold hover:text-terracotta transition-colors">
                      <Pencil size={14} /> Düzenle
                    </button>
                    <button onClick={handleDeleteGroup} disabled={groups.length <= 1} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                      <Trash2 size={14} /> Lokasyonu Sil
                    </button>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="meal-metric-card border-card-border">
                    <p className="meal-overline text-foreground/30">Ürün Sayısı</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-foreground">{activeItems.length}</p>
                  </div>
                  <div className="meal-metric-card border-card-border">
                    <p className="meal-overline text-foreground/30">Kategoriler</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-foreground">{categoryCount}</p>
                  </div>
                  <div className="meal-metric-card border-card-border col-span-2 md:col-span-1">
                    <p className="meal-overline text-foreground/30">Stil</p>
                    <p className="mt-2 text-xs font-bold text-terracotta uppercase tracking-widest">Sage & Terracotta</p>
                  </div>
                </div>
              </div>

              {activeItems.length === 0 ? (
                  <div className="meal-card border-dashed border-card-border py-16 text-center bg-background/50">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                      <Package size={32} />
                    </div>
                    <h3 className="meal-section-title mt-6 text-xl">Bu lokasyon henüz boş</h3>
                    <p className="mt-2 text-sm text-foreground-muted">Stok editörünü kullanarak ilk malzemeni ekle.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {activeItems.map((item) => (
                        <article key={item.id} className="meal-card rounded-[2rem] border-card-border p-5 shadow-brand-card hover:-translate-y-1 transition-all group">
                          <div className="flex items-start justify-between">
                            <div className="max-w-[70%]">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-primary/60">{formatCategory(item.ingredient?.category)}</p>
                              <h3 className="mt-1 font-serif text-xl font-bold text-foreground truncate">{item.ingredient?.name}</h3>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => { setEditingItemId(item.id); setItemDraft({ ingredientQuery: item.ingredient?.name || '', selectedIngredient: item.ingredient || null, quantity: String(item.quantity), unit: item.unit }); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-foreground/30 hover:text-terracotta transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDeleteItem(item)} className="p-2 rounded-lg hover:bg-red-50 text-foreground/30 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/5">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-foreground/30">Mevcut Stok</p>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">{formatQuantity(item.quantity)}</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-terracotta">{item.unit}</span>
                            </div>
                          </div>
                        </article>
                    ))}
                  </div>
              )}
            </section>
          </div>
        </div>

        {locationModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-midnight/40 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="w-full max-w-xl bg-background rounded-[2.5rem] shadow-brand-hero border border-card-border overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                <div className="p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="meal-overline">Location Manager</p>
                      <h3 className="meal-section-title mt-1 text-2xl">{editingGroupId ? 'Lokasyonu Düzenle' : 'Yeni Lokasyon'}</h3>
                    </div>
                    <button onClick={closeLocationModal} className="p-2 rounded-full hover:bg-black/5 text-foreground/30"><X size={20} /></button>
                  </div>

                  <form onSubmit={handleLocationSubmit} className="mt-8 space-y-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Lokasyon Adı</span>
                      <input
                          type="text"
                          value={groupDraft.name}
                          onChange={(e) => setGroupDraft(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Örn: Ev Mutfağı"
                          className="base-input py-4 bg-background dark:bg-white/5"
                      />
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Simge Seç</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {LOCATION_ICONS.map((opt) => {
                          const Icon = opt.icon;
                          const selected = groupDraft.icon === opt.value;
                          return (
                              <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setGroupDraft(prev => ({ ...prev, icon: opt.value }))}
                                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${
                                      selected ? 'bg-terracotta border-transparent text-white shadow-md' : 'bg-background border-card-border text-foreground-muted hover:border-terracotta/40'
                                  }`}
                              >
                                <Icon size={20} />
                                <span className="text-[9px] font-bold uppercase">{opt.label}</span>
                              </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button type="button" onClick={closeLocationModal} className="flex-1 py-4 rounded-2xl border border-card-border font-bold text-xs hover:bg-black/5 transition-all">İPTAL</button>
                      <button type="submit" disabled={savingGroup} className="flex-[2] py-4 rounded-2xl bg-espresso-midnight text-white font-bold shadow-lg hover:scale-[1.02] transition-all">
                        {savingGroup ? 'KAYDEDİLİYOR...' : 'LOKASYONU KAYDET'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}
      </>
  );
};

export default InventoryPage;
