import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  Briefcase,
  CheckCircle2,
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
import { ApiError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { type Ingredient, type Inventory, type InventoryGroup, type InventoryGroupRequest } from '../../types';

type GroupDraft = { name: string; icon: string };
type ItemDraft = { ingredientQuery: string; selectedIngredient: Ingredient | null; quantity: string; unit: string };

const LOCATION_ICONS = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'briefcase', label: 'Office', icon: Briefcase },
  { value: 'map-pin', label: 'City', icon: MapPin },
  { value: 'package', label: 'Pantry', icon: Package },
  { value: 'leaf', label: 'Summer', icon: Leaf }
] as const;

const UNIT_OPTIONS = ['GRAM', 'ADET', 'ML', 'PAKET', 'LITRE'] as const;

const createGroupDraft = (): GroupDraft => ({ name: '', icon: 'home' });
const createItemDraft = (): ItemDraft => ({ ingredientQuery: '', selectedIngredient: null, quantity: '', unit: 'GRAM' });

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

const formatCategory = (category?: string | null) =>
  category
    ? category.split('_').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ')
    : 'Uncategorized';

const formatQuantity = (value: number) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);

const InventoryPage: React.FC = () => {
  const { authenticated } = useAuth();
  const inventoryService = useInventoryService();
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
      setPageError(getErrorMessage(error, 'Envanter bilgileri alınamadı.'));
    } finally {
      if (options?.showLoader) setLoading(false);
    }
  }, [inventoryService]);

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
    }, 250);
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
    setSavingGroup(true);
    setPageError(null);
    setSuccessMessage(null);
    const payload: InventoryGroupRequest = { name: groupDraft.name.trim(), icon: groupDraft.icon };
    try {
      const response = editingGroupId
        ? await inventoryService.updateInventoryGroup(editingGroupId, payload)
        : await inventoryService.createInventoryGroup(payload);
      await loadGroups({ preferredGroupId: response.id });
      closeLocationModal();
      setSuccessMessage(editingGroupId ? 'Lokasyon güncellendi.' : 'Yeni lokasyon oluşturuldu.');
    } catch (error) {
      setPageError(getErrorMessage(error, 'Lokasyon işlemi tamamlanamadı.'));
    } finally {
      setSavingGroup(false);
    }
  };

  const handleItemSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeGroup || !itemDraft.selectedIngredient) {
      setPageError('Önce lokasyon ve malzeme seçmelisin.');
      return;
    }
    const quantity = Number(itemDraft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setPageError('Geçerli bir miktar gir.');
      return;
    }
    setSavingItem(true);
    setPageError(null);
    setSuccessMessage(null);
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
      setSuccessMessage(editingItemId ? 'Malzeme güncellendi.' : 'Malzeme lokasyona eklendi.');
    } catch (error) {
      setPageError(getErrorMessage(error, 'Envanter kalemi kaydedilemedi.'));
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    if (!window.confirm(`${activeGroup.name} lokasyonunu silmek istediğine emin misin?`)) return;
    try {
      await inventoryService.deleteInventoryGroup(activeGroup.id);
      await loadGroups();
      setSuccessMessage('Lokasyon silindi.');
    } catch (error) {
      setPageError(getErrorMessage(error, 'Lokasyon silinemedi.'));
    }
  };

  const handleDeleteItem = async (item: Inventory) => {
    if (!activeGroup) return;
    if (!window.confirm(`${item.ingredient?.name || 'Bu malzeme'} öğesini kaldırmak istediğine emin misin?`)) return;
    try {
      await inventoryService.deleteInventoryItem(activeGroup.id, item.id);
      await loadGroups({ preferredGroupId: activeGroup.id });
      setSuccessMessage('Malzeme stoktan çıkarıldı.');
    } catch (error) {
      setPageError(getErrorMessage(error, 'Envanter kalemi silinemedi.'));
    }
  };

  const openCreateLocationModal = () => {
    setPageError(null);
    setSuccessMessage(null);
    setEditingGroupId(null);
    setGroupDraft(createGroupDraft());
    setLocationModalOpen(true);
  };

  const openEditLocationModal = () => {
    if (!activeGroup) return;
    setPageError(null);
    setSuccessMessage(null);
    setEditingGroupId(activeGroup.id);
    setGroupDraft({ name: activeGroup.name, icon: activeGroup.icon || 'home' });
    setLocationModalOpen(true);
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    setItemDraft((current) => ({
      ...current,
      ingredientQuery: ingredient.name,
      selectedIngredient: ingredient
    }));
    setIngredientResults([]);
  };

  const handleEditItem = (item: Inventory) => {
    if (!item.ingredient) return;
    setEditingItemId(item.id);
    setItemDraft({
      ingredientQuery: item.ingredient.name,
      selectedIngredient: item.ingredient,
      quantity: String(item.quantity),
      unit: item.unit
    });
    setIngredientResults([]);
  };

  if (!authenticated) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card rounded-[2.5rem] border border-white/60 px-8 py-7 shadow-[0_24px_60px_-30px_rgba(40,36,33,0.45)] dark:border-white/10 flex items-center gap-4">
          <Loader2 size={24} className="animate-spin text-terracotta" />
          <div>
            <p className="font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Inventory loading</p>
            <p className="text-sm text-espresso-midnight/60 dark:text-alabaster/60">Lokasyonlar ve malzemeler getiriliyor.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="relative overflow-hidden rounded-[2.75rem] bg-espresso-midnight px-8 py-8 text-white shadow-[0_30px_90px_-36px_rgba(40,36,33,0.78)]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-terracotta/30 blur-[90px]" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-moss-sage/20 blur-[100px]" />
          </div>
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-alabaster/80">
                <Boxes size={14} className="text-terracotta" />
                Multi-Inventory
              </div>
              <div>
                <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">Lokasyon bazlı stoklarını yönet.</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-alabaster/70 sm:text-lg">
                  Home, Office ve Summer House gibi ayrı inventory alanları oluştur; bulunduğun yere göre farklı malzeme setleri tut.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.18em] text-alabaster/40">Locations</p>
                <p className="mt-2 text-3xl font-serif font-bold">{groups.length}</p>
              </div>
              <button type="button" onClick={openCreateLocationModal} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-5 py-3 font-semibold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.02] hover:bg-terracotta/90">
                <Plus size={18} />
                Yeni Lokasyon
              </button>
            </div>
          </div>
        </header>

        {pageError && (
          <div className="rounded-[2rem] border border-red-200/70 bg-red-50/90 px-5 py-4 text-red-700 shadow-[0_18px_48px_-28px_rgba(185,28,28,0.35)]">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">İşlem tamamlanamadı</p>
                <p className="mt-1 text-sm text-red-600">{pageError}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-[2rem] border border-moss-sage/30 bg-moss-sage/10 px-5 py-4 text-moss-forest shadow-[0_18px_48px_-28px_rgba(74,93,78,0.35)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-moss-sage" />
              <div>
                <p className="font-semibold">İşlem tamamlandı</p>
                <p className="mt-1 text-sm text-moss-forest/80 dark:text-moss-sage">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-forest/50 dark:text-moss-sage/50">Location Selector</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Nerede olduğunu seç</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {groups.map((group) => {
              const iconConfig = LOCATION_ICONS.find((option) => option.value === group.icon) ?? LOCATION_ICONS[0];
              const Icon = iconConfig.icon;
              const active = activeGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`min-w-[220px] rounded-[2rem] border px-5 py-4 text-left transition-all ${
                    active ? 'border-transparent bg-terracotta text-white shadow-xl shadow-terracotta/25' : 'glass-card border-white/60 text-espresso-midnight shadow-[0_18px_46px_-30px_rgba(40,36,33,0.35)] hover:border-moss-sage/30 dark:border-white/10 dark:text-alabaster'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-2xl p-3 ${active ? 'bg-white/15' : 'bg-moss-sage/10 text-moss-forest dark:bg-white/5 dark:text-moss-sage'}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${active ? 'text-white/70' : 'text-espresso-midnight/40 dark:text-alabaster/40'}`}>{group.itemCount} items</span>
                  </div>
                  <p className="mt-4 font-serif text-2xl font-bold">{group.name}</p>
                  <p className={`mt-1 text-sm ${active ? 'text-white/80' : 'text-espresso-midnight/55 dark:text-alabaster/55'}`}>{iconConfig.label} stock zone</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="glass-card rounded-[2.5rem] border border-white/60 p-6 shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)] dark:border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-forest/45 dark:text-moss-sage/50">Stock Editor</p>
                <h3 className="mt-2 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">{editingItemId ? 'Malzemeyi Güncelle' : 'Malzeme Ekle'}</h3>
              </div>
              {editingItemId && (
                <button type="button" onClick={resetItemForm} className="inline-flex items-center gap-2 rounded-full border border-espresso-midnight/10 bg-white/60 px-3 py-2 text-xs font-semibold text-espresso-midnight/65 transition-colors hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/65">
                  <X size={14} />
                  İptal
                </button>
              )}
            </div>

            <form id="inventory-item-form" onSubmit={handleItemSubmit} className="mt-6 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Malzeme Ara</span>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-midnight/30 dark:text-alabaster/30" />
                  <input
                    type="text"
                    value={itemDraft.ingredientQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setItemDraft((current) => ({ ...current, ingredientQuery: value, selectedIngredient: current.selectedIngredient?.name === value ? current.selectedIngredient : null }));
                    }}
                    placeholder="Domates, yoğurt, zeytinyağı..."
                    className="w-full rounded-[1.6rem] border border-espresso-midnight/10 bg-white/75 py-4 pl-12 pr-4 text-sm text-espresso-midnight shadow-sm outline-none transition-all focus:border-terracotta focus:ring-4 focus:ring-terracotta/10 dark:border-white/10 dark:bg-white/5 dark:text-alabaster"
                  />
                  {(ingredientResults.length > 0 || searchingIngredients) && (
                    <div className="absolute inset-x-0 top-[calc(100%+0.65rem)] z-20 overflow-hidden rounded-[1.75rem] border border-white/70 bg-alabaster shadow-[0_24px_60px_-30px_rgba(40,36,33,0.45)] dark:border-white/10 dark:bg-[#221e1c]">
                      {searchingIngredients ? (
                        <div className="flex items-center gap-3 px-4 py-4 text-sm text-espresso-midnight/60 dark:text-alabaster/60">
                          <Loader2 size={16} className="animate-spin text-terracotta" />
                          Malzemeler aranıyor...
                        </div>
                      ) : (
                        ingredientResults.map((ingredient) => (
                          <button key={ingredient.id} type="button" onClick={() => handleIngredientSelect(ingredient)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-terracotta/8">
                            <div>
                              <p className="font-semibold text-espresso-midnight dark:text-alabaster">{ingredient.name}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-moss-forest/50 dark:text-moss-sage/50">{formatCategory(ingredient.category)}</p>
                            </div>
                            <Plus size={16} className="text-terracotta" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Miktar</span>
                  <input type="number" min="0" step="0.01" value={itemDraft.quantity} onChange={(event) => setItemDraft((current) => ({ ...current, quantity: event.target.value }))} placeholder="2.5" className="w-full rounded-[1.6rem] border border-espresso-midnight/10 bg-white/75 px-4 py-4 text-sm text-espresso-midnight shadow-sm outline-none transition-all focus:border-terracotta focus:ring-4 focus:ring-terracotta/10 dark:border-white/10 dark:bg-white/5 dark:text-alabaster" />
                </label>
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Birim</span>
                  <div className="flex flex-wrap gap-2">
                    {UNIT_OPTIONS.map((unit) => (
                      <button key={unit} type="button" onClick={() => setItemDraft((current) => ({ ...current, unit }))} className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-all ${itemDraft.unit === unit ? 'bg-terracotta text-white shadow-lg shadow-terracotta/20' : 'border border-espresso-midnight/10 bg-white/70 text-espresso-midnight/60 hover:border-moss-sage/30 hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/60'}`}>
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={savingItem || !activeGroup} className="inline-flex w-full items-center justify-center gap-2 rounded-[1.6rem] bg-espresso-midnight px-5 py-4 font-semibold text-white shadow-xl shadow-black/10 transition-all hover:bg-espresso-midnight/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-terracotta dark:shadow-terracotta/20">
                {savingItem ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {savingItem ? 'Kaydediliyor' : editingItemId ? 'Malzemeyi Güncelle' : 'Seçili Lokasyona Ekle'}
              </button>
            </form>
          </section>

          <section className="space-y-6">
            <div className="glass-card rounded-[2.5rem] border border-white/60 p-6 shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)] dark:border-white/10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-forest/45 dark:text-moss-sage/50">Selected Location</p>
                  <h3 className="mt-2 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">{activeGroup?.name || 'Inventory'}</h3>
                  <p className="mt-2 text-sm leading-6 text-espresso-midnight/60 dark:text-alabaster/60">Seçtiğin lokasyondaki malzemeler burada filtrelenir ve gelecekte öneri akışına doğrudan bağlanabilir.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={openEditLocationModal} disabled={!activeGroup} className="inline-flex items-center gap-2 rounded-2xl border border-espresso-midnight/10 bg-white/75 px-4 py-3 text-sm font-semibold text-espresso-midnight/70 transition-all hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-alabaster/70">
                    <Pencil size={16} />
                    Düzenle
                  </button>
                  <button type="button" onClick={handleDeleteGroup} disabled={groups.length <= 1 || !activeGroup} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
                    <Trash2 size={16} />
                    Lokasyonu Sil
                  </button>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-[1.8rem] border border-white/70 bg-white/70 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-white/5"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">Items</p><p className="mt-3 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">{activeItems.length}</p></div>
                <div className="rounded-[1.8rem] border border-white/70 bg-white/70 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-white/5"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">Categories</p><p className="mt-3 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">{categoryCount}</p></div>
                <div className="rounded-[1.8rem] border border-white/70 bg-white/70 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-white/5"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">Theme</p><p className="mt-3 text-sm font-semibold text-terracotta">Sage Green + Spiced Terracotta</p></div>
              </div>
            </div>

            {activeItems.length === 0 ? (
              <div className="glass-card rounded-[2.5rem] border border-dashed border-moss-sage/25 px-6 py-10 text-center shadow-[0_24px_60px_-30px_rgba(40,36,33,0.28)] dark:border-white/10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta"><Package size={28} /></div>
                <h3 className="mt-5 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">Bu lokasyon henüz boş.</h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-espresso-midnight/60 dark:text-alabaster/60">Örneğin ofis için yulaf ve kahve, yazlık için domates ve zeytinyağı gibi ayrı stoklar oluşturabilirsin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {activeItems.map((item) => (
                  <article key={item.id} className="glass-card rounded-[2.2rem] border border-white/60 p-5 shadow-[0_22px_56px_-32px_rgba(40,36,33,0.34)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(40,36,33,0.42)] dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-forest/45 dark:text-moss-sage/55">{formatCategory(item.ingredient?.category)}</p>
                        <h3 className="mt-2 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{item.ingredient?.name || 'Unknown ingredient'}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleEditItem(item)} className="rounded-full bg-white/80 p-2 text-espresso-midnight/60 transition-colors hover:text-terracotta dark:bg-white/5 dark:text-alabaster/60" aria-label="Malzemeyi düzenle"><Pencil size={15} /></button>
                        <button type="button" onClick={() => handleDeleteItem(item)} className="rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100" aria-label="Malzemeyi sil"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="mt-6 rounded-[1.8rem] border border-white/60 bg-white/70 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Available Stock</p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="font-serif text-4xl font-bold text-espresso-midnight dark:text-alabaster">{formatQuantity(item.quantity)}</span>
                        <span className="pb-1 text-sm font-semibold uppercase tracking-[0.18em] text-terracotta">{item.unit}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-midnight/45 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[2.75rem] bg-alabaster shadow-[0_38px_100px_-34px_rgba(40,36,33,0.72)] dark:bg-[#201c1a]">
            <div className="px-7 py-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-moss-forest/45 dark:text-moss-sage/55">Location Manager</p>
                  <h3 className="mt-2 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">{editingGroupId ? 'Lokasyonu Güncelle' : 'Yeni Lokasyon Oluştur'}</h3>
                </div>
                <button type="button" onClick={closeLocationModal} className="rounded-full bg-white/70 p-2 text-espresso-midnight/55 transition-colors hover:text-terracotta dark:bg-white/5 dark:text-alabaster/55" aria-label="Modalı kapat"><X size={16} /></button>
              </div>
              <form onSubmit={handleLocationSubmit} className="mt-6 space-y-5">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Lokasyon Adı</span>
                  <input type="text" value={groupDraft.name} onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Örn. Office Pantry" className="w-full rounded-[1.6rem] border border-espresso-midnight/10 bg-white/75 px-4 py-4 text-sm text-espresso-midnight shadow-sm outline-none transition-all focus:border-terracotta focus:ring-4 focus:ring-terracotta/10 dark:border-white/10 dark:bg-white/5 dark:text-alabaster" />
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {LOCATION_ICONS.map((option) => {
                    const Icon = option.icon;
                    const selected = groupDraft.icon === option.value;
                    return (
                      <button key={option.value} type="button" onClick={() => setGroupDraft((current) => ({ ...current, icon: option.value }))} className={`rounded-[1.8rem] border px-4 py-4 text-left transition-all ${selected ? 'border-transparent bg-terracotta text-white shadow-lg shadow-terracotta/20' : 'border-espresso-midnight/10 bg-white/70 text-espresso-midnight/70 hover:border-moss-sage/30 hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/70'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`rounded-2xl p-3 ${selected ? 'bg-white/15' : 'bg-moss-sage/10 text-moss-forest dark:bg-white/5 dark:text-moss-sage'}`}><Icon size={18} /></div>
                          <div>
                            <p className="font-semibold">{option.label}</p>
                            <p className={`mt-1 text-[11px] uppercase tracking-[0.16em] ${selected ? 'text-white/70' : 'text-espresso-midnight/35 dark:text-alabaster/35'}`}>{option.value}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeLocationModal} className="rounded-2xl border border-espresso-midnight/10 bg-white/75 px-5 py-3 font-semibold text-espresso-midnight/70 transition-colors hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/70">Vazgeç</button>
                  <button type="submit" disabled={savingGroup} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-espresso-midnight px-5 py-3 font-semibold text-white shadow-xl shadow-black/10 transition-all hover:bg-espresso-midnight/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-terracotta dark:shadow-terracotta/20">
                    {savingGroup ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    {savingGroup ? 'Kaydediliyor' : editingGroupId ? 'Lokasyonu Kaydet' : 'Lokasyonu Oluştur'}
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
