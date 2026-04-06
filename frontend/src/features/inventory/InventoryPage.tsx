import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Boxes,
  Briefcase,
  Home,
  Leaf,
  Loader2,
  MapPin,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  Utensils
} from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useConsumptionService } from '../../services/consumptionService';
import { useInventoryService } from '../../services/inventoryService';
import { useUserService } from '../../services/userService';
import { useToast } from '../../shared/hooks/useToast';
import {
  type Ingredient,
  type Inventory,
  type InventoryGroup,
  type InventoryGroupRequest,
  type InventoryItemRequest,
  type User
} from '../../types';

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
  const consumptionService = useConsumptionService();

  const [unitWeights, setUnitWeights] = useState<Record<string, number>>({});
  const [ingredientSpecificWeights, setIngredientSpecificWeights] = useState<Record<number, Record<string, number>>>({});
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

  // Tüketim Modalı State'leri
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [consumingItem, setConsumingItem] = useState<Inventory | null>(null);
  const [consumeAmount, setConsumeAmount] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isConsuming, setIsConsuming] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const userService = useUserService();

  const handleUserSearch = async (query: string) => {
    setNewMemberEmail(query);
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const results = await userService.searchUsers(query);
      setUserSearchResults(results);
    } catch (error) {
      console.error("User search failed", error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

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

  const [expandedManualInput, setExpandedManualInput] = useState(false);

  const handleQuickUnitAdjust = (unit: string, delta: number) => {
    setItemDraft(prev => {
      const currentQty = parseFloat(prev.quantity) || 0;
      const currentUnit = prev.unit;

      let nextQty: number;
      if (currentUnit.toLowerCase() === unit.toLowerCase()) {
        nextQty = Math.max(0, currentQty + delta);
      } else {
        nextQty = delta > 0 ? delta : 0;
      }
      
      const qtyStr = nextQty > 0 ? nextQty.toString() : "0";
      
      return {
        ...prev,
        quantity: qtyStr,
        unit: unit.toUpperCase()
      };
    });
  };

  // Malzeme seçim fonksiyonu (Hatanın ana çözümü)
  const handleIngredientSelect = async (ing: Ingredient) => {
    setItemDraft(prev => ({
      ...prev,
      ingredientQuery: ing.name,
      selectedIngredient: ing
    }));
    setIngredientResults([]);

    // Fetch specific weights for this ingredient if not already loaded
    if (!ingredientSpecificWeights[ing.id]) {
      try {
        const weights = await consumptionService.getUnitWeights(ing.id);
        setIngredientSpecificWeights(prev => ({ ...prev, [ing.id]: weights }));
      } catch (error) {
        console.error('Birimler yüklenemedi:', error);
      }
    }
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
    
    const initData = async () => {
      setLoading(true);
      try {
        const [weights] = await Promise.all([
          consumptionService.getUnitWeights(),
          loadGroups()
        ]);
        setUnitWeights(weights);
      } catch (error) {
        console.error('Birimler yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    };
    
    void initData();
  }, [authenticated, inventoryService, consumptionService]);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const data = await inventoryService.getPendingInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Davetler yüklenemedi:', error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [inventoryService]);

  useEffect(() => {
    if (authenticated) {
      loadInvitations();
    }
  }, [authenticated, loadInvitations]);

  const standardUnitsSet = useMemo(() => ['GRAM', 'ML', 'KG', 'LITRE', 'L'], []);

  const { quickUnits, standardUnits } = useMemo(() => {
    const selectedIng = itemDraft.selectedIngredient;
    const physicalState = selectedIng?.physicalState;

    // Temel birim setleri
    const solidBase = ['GRAM', 'KG'];
    const liquidBase = ['ML', 'LITRE', 'L'];
    const commonBase = ['GRAM', 'ML', 'KG', 'LITRE', 'L'];

    let base = commonBase;
    if (physicalState === 'SOLID') base = solidBase;
    if (physicalState === 'LIQUID') base = liquidBase;

    const selectedIngId = selectedIng?.id;
    const weights = (selectedIngId && ingredientSpecificWeights[selectedIngId]) || unitWeights;
    
    // Backend'den gelen birimleri al
    const extra = Object.keys(weights).map(u => u.toUpperCase());
    
    // Birleştir
    const allUnits = Array.from(new Set([...base, ...extra]));
    
    // Hızlı birimler için izin verilen liste
    const allowedQuickUnits = ['PAKET', 'PORSIYON', 'DILIM', 'CUP', 'ADET', 'KASE', 'BARDAK'];
    
    const quick = allUnits.filter(u => allowedQuickUnits.includes(u));
    const standard = allUnits.filter(u => standardUnitsSet.includes(u) || (!allowedQuickUnits.includes(u) && !standardUnitsSet.includes(u)));

    // Sıralama Önceliği
    const quickPriority = ['PAKET', 'PORSIYON', 'DILIM', 'CUP', 'ADET', 'KASE', 'BARDAK'];

    return {
      quickUnits: quick.sort((a, b) => {
          const idxA = quickPriority.indexOf(a);
          const idxB = quickPriority.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.localeCompare(b);
      }),
      standardUnits: standard.sort((a, b) => {
          if (a === 'GRAM') return -1;
          if (b === 'GRAM') return 1;
          if (a === 'ML') return -1;
          if (b === 'ML') return 1;
          return a.localeCompare(b);
      })
    };
  }, [unitWeights, ingredientSpecificWeights, itemDraft.selectedIngredient, standardUnitsSet]);

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
      const selectedIngId = itemDraft.selectedIngredient.id;
      const weights = (selectedIngId && ingredientSpecificWeights[selectedIngId]) || unitWeights;
      let weight = weights[itemDraft.unit.toLowerCase()] || 0;
      
      // Fallback for common units if backend hasn't returned them yet
      if (!weight) {
        const density = itemDraft.selectedIngredient?.density || 1.0;
        if (['ADET', 'PIECE', 'TANE', 'UNIT'].includes(itemDraft.unit)) weight = 50;
        if (['PAKET', 'PACKET', 'PACKAGE'].includes(itemDraft.unit)) weight = 500;
        if (['KG', 'KILOGRAM'].includes(itemDraft.unit)) weight = 1000;
        if (['GRAM', 'G'].includes(itemDraft.unit)) weight = 1;
        if (['ML'].includes(itemDraft.unit)) weight = density;
        if (['LITRE', 'LITER', 'L'].includes(itemDraft.unit)) weight = 1000 * density;
      }

      const payload: InventoryItemRequest = {
        ingredientId: itemDraft.selectedIngredient.id,
        quantity,
        unit: itemDraft.unit,
        grams: weight ? quantity * weight : quantity,
        unitGramWeight: weight
      };

      if (editingItemId) {
        await inventoryService.updateInventoryItem(activeGroup.id, editingItemId, payload);
      } else {
        await inventoryService.createInventoryItem(activeGroup.id, payload);
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

  const openConsumeModal = (item: Inventory) => {
    setConsumingItem(item);
    setConsumeAmount(String(item.quantity));
    setSelectedUserIds(activeGroup?.users.map(u => u.id) || []);
    setConsumeModalOpen(true);
  };

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !consumingItem) return;
    
    const amount = parseFloat(consumeAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Lütfen geçerli bir miktar girin.', 'info');
      return;
    }
    
    if (selectedUserIds.length === 0) {
      showToast('Lütfen en az bir kullanıcı seçin.', 'info');
      return;
    }

    setIsConsuming(true);
    try {
      await inventoryService.consumeInventoryItem(activeGroup.id, consumingItem.id, amount, selectedUserIds);
      await loadGroups({ preferredGroupId: activeGroup.id });
      setConsumeModalOpen(false);
      showToast('Tüketim başarıyla kaydedildi.', 'success');
    } catch (error) {
      showToast('Tüketim kaydedilirken bir hata oluştu.', 'error');
    } finally {
      setIsConsuming(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !newMemberEmail.trim()) return;

    setIsAddingMember(true);
    try {
      await inventoryService.inviteUser(activeGroup.id, newMemberEmail.trim());
      setNewMemberEmail('');
      showToast('Davet başarıyla gönderildi.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Kullanıcı eklenirken bir hata oluştu.', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeGroup) return;
    if (!window.confirm('Bu kullanıcıyı lokasyondan çıkarmak istediğine emin misin?')) return;

    try {
      await inventoryService.removeUserFromGroup(activeGroup.id, userId);
      await loadGroups({ preferredGroupId: activeGroup.id });
      showToast('Kullanıcı lokasyondan çıkarıldı.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Kullanıcı çıkarılırken bir hata oluştu.', 'error');
    }
  };

  const handleAcceptInvitation = async (id: number) => {
    try {
      await inventoryService.acceptInvitation(id);
      showToast('Davet kabul edildi.', 'success');
      await loadGroups();
      await loadInvitations();
    } catch (error) {
      showToast('Davet kabul edilemedi.', 'error');
    }
  };

  const handleRejectInvitation = async (id: number) => {
    try {
      await inventoryService.rejectInvitation(id);
      showToast('Davet reddedildi.', 'success');
      await loadInvitations();
    } catch (error) {
      showToast('Davet reddedilemedi.', 'error');
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
          <header className="relative overflow-hidden rounded-[2.75rem] bg-card px-8 py-10 text-foreground shadow-brand-hero meal-highlight-frame dark:bg-espresso-midnight dark:text-white">
            <div className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-100">
              <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-terracotta/20 blur-[100px] dark:bg-terracotta/25" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-moss-sage/15 blur-[100px] dark:bg-moss-sage/10" />
            </div>
            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="meal-badge-neon px-4 text-[11px] font-bold tracking-[0.22em]">
                  <Boxes size={14} />
                  Multi-Inventory
                </div>
                <div>
                  <h1 className="font-serif text-4xl font-bold leading-tight text-foreground dark:text-white sm:text-5xl">Stoklarını lokasyon bazlı yönet.</h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-muted dark:text-alabaster/60 sm:text-lg">
                    Ev, ofis veya yazlık için ayrı envanterler oluştur; elindeki malzemeleri MealAI ile takip et.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="rounded-[1.8rem] border border-card-border bg-white/70 px-6 py-4 text-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground-muted dark:text-alabaster/40">Lokasyonlar</p>
                  <p className="mt-1 text-3xl font-serif font-bold text-foreground dark:text-white">{groups.length}</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setEditingGroupId(null); setGroupDraft(createGroupDraft()); setLocationModalOpen(true); }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-6 py-4 font-bold text-white shadow-xl shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus size={18} />
                  Yeni Lokasyon
                </button>
                {invitations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInvitationsModalOpen(true)}
                    className="relative inline-flex items-center justify-center gap-2 rounded-2xl bg-moss-sage px-6 py-4 font-bold text-white shadow-xl shadow-moss-sage/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Users size={18} />
                    Davetler
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold ring-4 ring-background">
                      {invitations.length}
                    </span>
                  </button>
                )}
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

          <div className="grid grid-cols-1 gap-6">
            <section className="meal-card meal-highlight-frame shadow-brand-card">
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

              <form onSubmit={handleItemSubmit} className="mt-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  {/* Kısım 1: Malzeme Arama */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-terracotta/10 text-[10px] font-bold text-terracotta">1</div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Malzeme Ara</span>
                    </div>
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
                    {itemDraft.selectedIngredient && (
                      <div className="rounded-2xl bg-moss-sage/5 border border-moss-sage/10 p-4 animate-in fade-in zoom-in-95">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-moss-sage">Seçili Malzeme</p>
                        <p className="mt-1 font-serif text-lg font-bold text-espresso-midnight dark:text-alabaster">{itemDraft.selectedIngredient.name}</p>
                        <p className="text-[10px] text-foreground/40">{formatCategory(itemDraft.selectedIngredient.category)}</p>
                      </div>
                    )}
                  </div>

                  {/* Kısım 2: Hızlı Birimler */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-terracotta/10 text-[10px] font-bold text-terracotta">2</div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Hızlı Seçim (Dilim/Paket/Adet...)</span>
                    </div>
                    {quickUnits.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {quickUnits.map((unit: string) => {
                          const selectedIngId = itemDraft.selectedIngredient?.id;
                          const weights = (selectedIngId && ingredientSpecificWeights[selectedIngId]) || unitWeights;
                          let weight = weights[unit.toLowerCase()];
                          const currentQty = parseFloat(itemDraft.quantity) || 0;
                          const isSelected = itemDraft.unit.toLowerCase() === unit.toLowerCase() && currentQty > 0;

                          return (
                            <div
                                key={unit}
                                className={`flex items-center overflow-hidden rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-espresso-midnight text-white border-transparent shadow-md'
                                        : 'bg-background border-card-border text-foreground/60 hover:border-terracotta/40 hover:bg-terracotta/5'
                                }`}
                            >
                              {/* Decrease Button */}
                              <button
                                type="button"
                                onClick={() => handleQuickUnitAdjust(unit, -1)}
                                className={`flex h-full items-center justify-center border-r px-2 py-4 transition-colors ${
                                  isSelected ? 'border-white/10 hover:bg-white/10' : 'border-card-border hover:bg-terracotta/10 hover:text-terracotta'
                                }`}
                              >
                                <Minus size={14} />
                              </button>

                              {/* Unit Display / Increment */}
                              <button
                                type="button"
                                onClick={() => handleQuickUnitAdjust(unit, 1)}
                                className="flex flex-1 flex-col items-center justify-center py-3 px-1 text-center"
                              >
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  {isSelected ? `${currentQty} ` : ''}{unit}
                                </span>
                                {weight && (
                                  <span className={`text-[10px] mt-1 ${isSelected ? 'text-white/60' : 'text-foreground/30 font-medium'}`}>
                                    ~{(weight * (isSelected ? currentQty : 1)).toFixed(0)}g
                                  </span>
                                )}
                              </button>

                              {/* Increase Button */}
                              <button
                                type="button"
                                onClick={() => handleQuickUnitAdjust(unit, 1)}
                                className={`flex h-full items-center justify-center border-l px-2 py-4 transition-colors ${
                                  isSelected ? 'border-white/10 hover:bg-white/10' : 'border-card-border hover:bg-emerald-500/10 hover:text-emerald-500'
                                }`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-card-border bg-background/50 text-center px-6">
                        <p className="text-[10px] font-medium text-foreground/40 italic">Bu malzeme için özel birim bulunamadı.</p>
                      </div>
                    )}
                  </div>

                  {/* Kısım 3: Miktar ve Standart Birim */}
                  <div className="space-y-4">
                    <button
                        type="button"
                        onClick={() => setExpandedManualInput(!expandedManualInput)}
                        className="flex w-full items-center justify-between rounded-xl bg-espresso-midnight/[0.03] px-3 py-2 text-left transition-all hover:bg-espresso-midnight/[0.06] dark:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-terracotta/10 text-[10px] font-bold text-terracotta">3</div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Spesifik Miktar / Birim</span>
                      </div>
                      {expandedManualInput ? <ChevronUp size={16} className="text-foreground/30" /> : <ChevronDown size={16} className="text-foreground/30" />}
                    </button>

                    {expandedManualInput && (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex-1">
                          <input
                              type="number"
                              step="0.01"
                              value={itemDraft.quantity}
                              onChange={(e) => setItemDraft(prev => ({ ...prev, quantity: e.target.value }))}
                              placeholder="0.00"
                              className="base-input py-4 bg-background dark:bg-white/5 text-center font-serif text-xl"
                          />
                        </div>
                        <div className="flex-1">
                          <select
                              value={itemDraft.unit}
                              onChange={(e) => setItemDraft(prev => ({ ...prev, unit: e.target.value }))}
                              className="base-input py-4 bg-background dark:bg-white/5 text-center font-bold text-xs appearance-none cursor-pointer"
                          >
                            {standardUnits.map((unit: string) => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                            {quickUnits.map((unit: string) => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={savingItem || !activeGroup || !itemDraft.selectedIngredient}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-terracotta text-white font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
                    >
                      {savingItem ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                      {editingItemId ? 'GÜNCELLE' : 'EKLE'}
                    </button>

                    <div className="flex items-center gap-1.5 text-[10px] text-terracotta/70 italic justify-center">
                      <AlertCircle size={10} />
                      Yüksek hassasiyet için GRAM/ML kullanın.
                    </div>
                  </div>
                </div>
              </form>
            </section>

            <section className="space-y-6">
              <div className="meal-card meal-highlight-frame shadow-brand-card">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="meal-overline">Current Inventory</p>
                    <h3 className="meal-section-title mt-1 text-3xl">{activeGroup?.name || 'Seçili Alan'}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMemberModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-moss-sage/30 bg-moss-sage/5 text-moss-sage text-xs font-bold hover:bg-moss-sage/10 transition-colors">
                      <Users size={14} /> Üyeleri Yönet
                    </button>
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
                              <button 
                                onClick={() => openConsumeModal(item)}
                                className="p-2 rounded-lg hover:bg-emerald-50 text-foreground/30 hover:text-emerald-600 transition-colors"
                                title="Tüket"
                              >
                                <Utensils size={14} />
                              </button>
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
                            {item.grams && Math.abs((item.grams || 0) - (item.quantity || 0)) > 0.01 && (
                                <p className="mt-1 text-[9px] font-medium text-foreground/40 italic">
                                  ≈ {formatQuantity(item.grams)}g
                                </p>
                            )}
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

        {consumeModalOpen && consumingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-midnight/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-background rounded-[2.5rem] shadow-brand-hero border border-card-border overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
              <div className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
                      <Utensils size={24} />
                    </div>
                    <div>
                      <p className="meal-overline">Ortak Tüketim</p>
                      <h3 className="meal-section-title mt-1 text-2xl">{consumingItem.ingredient?.name} Tüket</h3>
                    </div>
                  </div>
                  <button onClick={() => setConsumeModalOpen(false)} className="p-2 rounded-full hover:bg-black/5 text-foreground/30"><X size={20} /></button>
                </div>

                <form onSubmit={handleConsumeSubmit} className="mt-8 space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Tüketilecek Miktar</span>
                      <span className="text-[10px] font-bold text-terracotta italic">Max: {consumingItem.quantity} {consumingItem.unit}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        max={consumingItem.quantity}
                        value={consumeAmount}
                        onChange={(e) => setConsumeAmount(e.target.value)}
                        className="base-input py-4 bg-background dark:bg-white/5 font-serif text-2xl text-center"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground/30">
                        {consumingItem.unit}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Kimler Tüketti?</span>
                      <span className="text-[10px] font-bold text-moss-sage">{selectedUserIds.length} Kişi Seçildi</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeGroup?.users.map((user) => {
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUserIds(prev => 
                                isSelected ? prev.filter(id => id !== user.id) : [...prev, user.id]
                              );
                            }}
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                              isSelected 
                                ? 'bg-moss-sage/10 border-moss-sage text-moss-sage shadow-sm' 
                                : 'bg-background border-card-border text-foreground-muted hover:border-moss-sage/40'
                            }`}
                          >
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-moss-sage text-white' : 'bg-black/5'}`}>
                              <Users size={14} />
                            </div>
                            <span className="text-xs font-bold truncate">{user.name || user.email || 'İsimsiz Kullanıcı'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-espresso-midnight/[0.03] dark:bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-foreground/40 leading-relaxed">
                      * Besin değerleri seçilen kişilere eşit olarak paylaştırılacaktır. 
                      Kişi başı: <span className="text-terracotta">{(parseFloat(consumeAmount) / Math.max(1, selectedUserIds.length)).toFixed(2)} {consumingItem.unit}</span>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setConsumeModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-card-border font-bold text-xs hover:bg-black/5 transition-all">İPTAL</button>
                    <button 
                      type="submit" 
                      disabled={isConsuming || selectedUserIds.length === 0} 
                      className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                      {isConsuming ? 'İŞLENİYOR...' : 'TÜKETİMİ KAYDET'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {memberModalOpen && activeGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-midnight/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-background rounded-[2.5rem] shadow-brand-hero border border-card-border overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
              <div className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-moss-sage/10 text-moss-sage">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="meal-overline">Member Management</p>
                      <h3 className="meal-section-title mt-1 text-2xl">{activeGroup.name} Üyeleri</h3>
                    </div>
                  </div>
                  <button onClick={() => setMemberModalOpen(false)} className="p-2 rounded-full hover:bg-black/5 text-foreground/30"><X size={20} /></button>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Mevcut Üyeler</span>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeGroup.users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-background border border-card-border group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-moss-sage/10 text-moss-sage">
                              <Users size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{user.name || 'İsimsiz'}</p>
                              <p className="text-[10px] text-foreground-muted">{user.email}</p>
                            </div>
                          </div>
                          {activeGroup.users.length > 1 && (
                            <button 
                              onClick={() => handleRemoveMember(user.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-foreground/20 hover:text-red-500 transition-colors"
                              title="Çıkar"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAddMember} className="space-y-4 border-t border-card-border pt-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Yeni Üye Davet Et</span>
                    <div className="flex gap-2 relative">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={newMemberEmail}
                          onChange={(e) => handleUserSearch(e.target.value)}
                          placeholder="E-posta veya isim ile ara..."
                          className="base-input w-full py-3 bg-background dark:bg-white/5 text-sm"
                          required
                        />
                          {isSearchingUsers ? (
                            <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-espresso-midnight rounded-xl shadow-2xl border border-black/5 dark:border-white/10 z-[100] flex items-center justify-center p-4">
                              <Loader2 size={20} className="animate-spin text-terracotta" />
                            </div>
                          ) : userSearchResults.length > 0 && (
                            <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-espresso-midnight rounded-xl shadow-2xl border border-black/5 dark:border-white/10 z-[100] overflow-hidden max-h-48 overflow-y-auto">
                              {userSearchResults.map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => {
                                    setNewMemberEmail(user.email || '');
                                    setUserSearchResults([]);
                                  }}
                                  className="p-3 border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between"
                                >
                                  <div>
                                    <p className="text-xs font-bold">{user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName)}</p>
                                    <p className="text-[10px] text-black/40 dark:text-alabaster/40">{user.email}</p>
                                  </div>
                                  <Plus size={14} className="text-terracotta" />
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                      <button 
                        type="submit" 
                        disabled={isAddingMember || !newMemberEmail.trim()}
                        className="px-6 rounded-xl bg-espresso-midnight text-white font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        {isAddingMember ? <Loader2 size={16} className="animate-spin" /> : 'DAVET ET'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
        {invitationsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-midnight/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-background rounded-[2.5rem] shadow-brand-hero border border-card-border overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
              <div className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-terracotta/10 text-terracotta">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="meal-overline">Invitations</p>
                      <h3 className="meal-section-title mt-1 text-2xl">Envanter Davetleri</h3>
                    </div>
                  </div>
                  <button onClick={() => setInvitationsModalOpen(false)} className="p-2 rounded-full hover:bg-black/5 text-foreground/30"><X size={20} /></button>
                </div>

                <div className="mt-8 space-y-4">
                  {loadingInvitations ? (
                    <div className="py-12 text-center">
                      <Loader2 size={32} className="mx-auto animate-spin text-terracotta mb-4" />
                      <p className="text-sm text-foreground-muted">Davetler yükleniyor...</p>
                    </div>
                  ) : invitations.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-foreground-muted italic">Bekleyen davetiniz bulunmuyor.</p>
                    </div>
                  ) : (
                    invitations.map((inv) => (
                      <div key={inv.id} className="p-5 rounded-[2rem] bg-background border border-card-border shadow-brand-card">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Home size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{inv.inventoryGroup?.name}</p>
                            <p className="text-[10px] text-foreground-muted">Davet eden: <span className="text-terracotta font-medium">{inv.inviter?.name || inv.inviter?.email}</span></p>
                          </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                          <button 
                            onClick={() => handleAcceptInvitation(inv.id)}
                            className="flex-1 py-3 rounded-xl bg-moss-sage text-white text-[10px] font-bold tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            KABUL ET
                          </button>
                          <button 
                            onClick={() => handleRejectInvitation(inv.id)}
                            className="flex-1 py-3 rounded-xl border border-card-border text-foreground-muted text-[10px] font-bold tracking-widest hover:bg-black/5 transition-all"
                          >
                            REDDET
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
  );
};

export default InventoryPage;
