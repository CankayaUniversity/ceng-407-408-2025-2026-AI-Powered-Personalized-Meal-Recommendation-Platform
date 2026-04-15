import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../../infrastructure/auth/AuthContext';
import { useInventoryService } from '../../../services/inventoryService';
import { useConsumptionService } from '../../../services/consumptionService';
import { useUserService } from '../../../services/userService';
import { useToast } from '../../../shared/hooks/useToast';
import { 
  InventoryGroup, 
  Inventory, 
  Ingredient, 
  User, 
  UnitConversion 
} from '../../../types';
import { 
  GroupDraft, 
  ItemDraft, 
} from '../types/inventory.types';
import { createGroupDraft, createItemDraft } from '../utils/inventoryUtils';

export const useInventory = () => {
  const { authenticated } = useAuth();
  const { showToast } = useToast();
  const inventoryService = useInventoryService();
  const consumptionService = useConsumptionService();
  const userService = useUserService();

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [searchingIngredients, setSearchingIngredients] = useState(false);
  const [expandedManualInput, setExpandedManualInput] = useState(false);

  // Tüketim Modalı State'leri
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [consumingItem, setConsumingItem] = useState<Inventory | null>(null);
  const [memberAmounts, setMemberAmounts] = useState<Record<string, string>>({});
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isConsuming, setIsConsuming] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsModalOpen, setInvitationsModalOpen] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  // Conversion Preview State
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [loadingConversions, setLoadingConversions] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [shoppingListItems, setShoppingListItems] = useState<any[]>([]);
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);

  const fetchShoppingList = useCallback(async (groupIds?: number[]) => {
    setLoadingShoppingList(true);
    try {
      const data = await inventoryService.getShoppingList(groupIds);
      setShoppingListItems(data.items || []);
      return data.items || [];
    } catch (error) {
      showToast('Alışveriş listesi yüklenemedi.', 'error');
      return [];
    } finally {
      setLoadingShoppingList(false);
    }
  }, [inventoryService, showToast]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId]
  );

  const activeItems = useMemo(() => activeGroup?.items ?? [], [activeGroup]);

  const filteredItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return activeItems;
    const query = itemSearchQuery.toLowerCase();
    return activeItems.filter(item => 
      item.ingredient?.name.toLowerCase().includes(query) ||
      item.ingredient?.category.toLowerCase().includes(query)
    );
  }, [activeItems, itemSearchQuery]);

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

      // Fetch shopping list for all groups to identify low stock items globally
      if (nextGroups.length > 0) {
        await fetchShoppingList(nextGroups.map(g => g.id));
      }
    } catch (error) {
      showToast('Envanter bilgileri alınamadı.', 'error');
    } finally {
      if (options?.showLoader) setLoading(false);
    }
  }, [inventoryService, showToast, fetchShoppingList]);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const data = await inventoryService.getPendingInvitations();
      setInvitations(data);
    } catch (error) {
      showToast('Bekleyen davetler yüklenemedi.', 'error');
    } finally {
      setLoadingInvitations(false);
    }
  }, [inventoryService]);

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
        await loadInvitations();
      } catch (error) {
        console.error('Birimler yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    };
    
    void initData();
  }, [authenticated, loadGroups, loadInvitations, consumptionService]);

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
      showToast('Kullanıcı araması başarısız oldu.', 'error');
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleIngredientSelect = async (ing: Ingredient) => {
    const existingItem = activeItems.find(item => item.ingredient?.id === ing.id);
    
    setItemDraft(prev => ({
      ...prev,
      ingredientQuery: ing.name,
      selectedIngredient: ing,
      updateMode: existingItem ? 'ADD' : 'SET'
    }));
    
    if (existingItem) {
      setExpandedManualInput(true);
      showToast(`${ing.name} zaten envanterinizde var. Eklemek istediğiniz miktarı girin.`, 'info');
    }

    setIngredientResults([]);

    if (!ingredientSpecificWeights[ing.id]) {
      try {
        const weights = await consumptionService.getUnitWeights(ing.id);
        setIngredientSpecificWeights(prev => ({ ...prev, [ing.id]: weights }));
      } catch (error) {
        showToast('Birim bilgileri alınamadı.', 'error');
      }
    }
  };

  const resetItemForm = () => {
    setEditingItemId(null);
    setEditModalOpen(false);
    setItemDraft(createItemDraft());
    setIngredientResults([]);
    setExpandedManualInput(false);
    setConversions([]);
  };

  return {
    authenticated,
    loading,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    activeGroup,
    activeItems,
    locationModalOpen,
    setLocationModalOpen,
    groupDraft,
    setGroupDraft,
    editingGroupId,
    setEditingGroupId,
    savingGroup,
    setSavingGroup,
    itemDraft,
    setItemDraft,
    editingItemId,
    setEditingItemId,
    editModalOpen,
    setEditModalOpen,
    savingItem,
    setSavingItem,
    ingredientResults,
    setIngredientResults,
    searchingIngredients,
    setSearchingIngredients,
    expandedManualInput,
    setExpandedManualInput,
    consumeModalOpen,
    setConsumeModalOpen,
    consumingItem,
    setConsumingItem,
    memberAmounts,
    setMemberAmounts,
    selectedUserIds,
    setSelectedUserIds,
    isConsuming,
    setIsConsuming,
    newMemberEmail,
    setNewMemberEmail,
    userSearchResults,
    setUserSearchResults,
    isSearchingUsers,
    setIsSearchingUsers,
    isAddingMember,
    setIsAddingMember,
    invitations,
    setInvitations,
    invitationsModalOpen,
    setInvitationsModalOpen,
    loadingInvitations,
    conversions,
    setConversions,
    loadingConversions,
    setLoadingConversions,
    unitWeights,
    ingredientSpecificWeights,
    loadGroups,
    loadInvitations,
    handleUserSearch,
    handleIngredientSelect,
    resetItemForm,
    itemSearchQuery,
    setItemSearchQuery,
    filteredItems,
    shoppingListItems,
    loadingShoppingList,
    fetchShoppingList
  };
};
