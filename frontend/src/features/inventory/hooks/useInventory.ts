import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useIngredientService } from '../../../services/ingredientService';
import { 
  GroupDraft, 
  ItemDraft, 
} from '../types/inventory.types';
import { createGroupDraft, createItemDraft } from '../utils/inventoryUtils';

export const useInventory = () => {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  const { showToast } = useToast();
  const inventoryService = useInventoryService();
  const consumptionService = useConsumptionService();
  const ingredientService = useIngredientService();
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

  // Pagination state for items
  const [items, setItems] = useState<Inventory[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [loadingItems, setLoadingItems] = useState(false);

  const loadItems = useCallback(async (groupId: number, page: number) => {
    setLoadingItems(true);
    try {
      const data = await inventoryService.getInventoryItems(groupId, page, pageSize);
      // Backend should return a Page object ideally, but currently getInventoryItems returns Inventory[]
      // based on previous_issue_solution. Let me check the service again.
      setItems(data);
      // Since backend is returning List currently (from my previous analysis of InventoryController.java)
      // and not the whole Page object, I might need to adjust this if I want total pages.
      // Actually, my previous change in InventoryController.java was:
      // return inventoryMapper.toItemResponses(inventoryService.getInventoryItemsByGroup(userId, groupId, pageRequest).getContent());
      // So it returns List<InventoryItemResponse>.
    } catch (error) {
      showToast(t('toasts.inventory.loadError'), 'error');
    } finally {
      setLoadingItems(false);
    }
  }, [inventoryService, pageSize, showToast]);

  const fetchShoppingList = useCallback(async (groupIds?: number[]) => {
    setLoadingShoppingList(true);
    try {
      const data = await inventoryService.getShoppingList(groupIds);
      setShoppingListItems(data.items || []);
      return data.items || [];
    } catch (error) {
      showToast(t('toasts.inventory.shoppingListError'), 'error');
      return [];
    } finally {
      setLoadingShoppingList(false);
    }
  }, [inventoryService, showToast]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId]
  );

  const activeItems = useMemo(() => items, [items]);

  const filteredItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return activeItems;
    const query = itemSearchQuery.toLowerCase();
    return activeItems.filter(item => 
      item.ingredient?.name.toLowerCase().includes(query) ||
      item.ingredient?.category.toLowerCase().includes(query)
    );
  }, [activeItems, itemSearchQuery]);

  useEffect(() => {
    if (selectedGroupId) {
      loadItems(selectedGroupId, currentPage);
    }
  }, [selectedGroupId, currentPage, loadItems]);

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

      // Reset page when group changes or reloads
      setCurrentPage(0);

      // Fetch shopping list for all groups to identify low stock items globally
      if (nextGroups.length > 0) {
        await fetchShoppingList(nextGroups.map(g => g.id));
      }
    } catch (error) {
      showToast(t('toasts.inventory.loadError'), 'error');
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
      showToast(t('toasts.inventory.invitationsLoadError'), 'error');
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
        console.error('Units load error:', error);
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
      showToast(t('toasts.inventory.userSearchError'), 'error');
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
      showToast(t('toasts.inventory.alreadyExists', { name: ing.name }), 'info');
    }

    // Backend'den zeka verilerini çek
    try {
      setLoadingConversions(true);
      const [weights, convs] = await Promise.all([
        ingredientService.getAllUnitWeights(ing.id),
        ingredientService.getUnitConversions(ing.id, 1, 'GRAM')
      ]);
      
      setIngredientSpecificWeights(prev => ({ ...prev, [ing.id]: weights }));
      setConversions(convs);
      
      // Akıllı varsayılan birim seçimi - Backend'den gelen veriye güven
      const quickUnit = convs.find((c: any) => c.highPriority)?.unit || ing.preferredUnit || (ing.physicalState === 'LIQUID' ? 'ML' : 'GRAM');
      
      setItemDraft(prev => ({
        ...prev,
        unit: quickUnit.toUpperCase()
      }));

    } catch (error) {
      showToast(t('toasts.inventory.unitsLoadError'), 'error');
    } finally {
      setLoadingConversions(false);
    }
  };

  const resetItemForm = () => {
    setEditingItemId(null);
    setEditModalOpen(false);
    setItemDraft(createItemDraft());
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
    loadItems,
    currentPage,
    setCurrentPage,
    loadingItems,
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
