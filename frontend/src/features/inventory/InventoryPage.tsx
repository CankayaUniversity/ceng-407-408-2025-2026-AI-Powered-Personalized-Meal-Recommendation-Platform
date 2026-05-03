import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useInventoryService } from '../../services/inventoryService';
import { useToast } from '../../shared/hooks/useToast';
import { useIngredientService } from '../../services/ingredientService';
import { matchesIngredientQuery, useIngredientLookup } from '../../shared/hooks/useIngredientLookup';
import { User } from '../../types';

// New Components & Hooks
import { useInventory } from './hooks/useInventory';
import { InventoryHeader } from './components/InventoryHeader';
import { InventoryGroupList } from './components/InventoryGroupList';
import { InventoryItemList } from './components/InventoryItemList';
import { InventoryGroupModal } from './components/InventoryGroupModal';
import { InventoryItemModal } from './components/InventoryItemModal';
import { ConsumptionModal } from './components/ConsumptionModal';
import { InvitationsModal } from './components/InvitationsModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { MemberManagement } from './components/MemberManagement';
import { createGroupDraft } from './utils/inventoryUtils';

const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  const { showToast } = useToast();
  const inventoryService = useInventoryService();
  const ingredientService = useIngredientService();

  const {
    loading,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    activeGroup,
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
    isAddingMember,
    setIsAddingMember,
    invitations,
    invitationsModalOpen,
    setInvitationsModalOpen,
    loadingInvitations,
    conversions,
    setConversions,
    loadingConversions,
    setLoadingConversions,
    loadGroups,
    loadInvitations,
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
  } = useInventory();

  // Shopping List Modal state
  const [shoppingListModalOpen, setShoppingListModalOpen] = React.useState(false);
  const [selectedShoppingGroupIds, setSelectedShoppingGroupIds] = React.useState<number[]>([]);
  const [hasInitializedGroups, setHasInitializedGroups] = React.useState(false);
  const {
    results: ingredientResults,
    searching: searchingIngredients,
    searchError: ingredientSearchError,
    hasCompletedSearch: hasCompletedIngredientSearch,
    canSearch: canSearchIngredients,
    resetSearch: resetIngredientSearch
  } = useIngredientLookup({
    query: itemDraft.ingredientQuery,
    enabled: editModalOpen && !itemDraft.selectedIngredient
  });

  // Initialize selected groups when groups change for the first time
  useEffect(() => {
    if (groups.length > 0 && !hasInitializedGroups) {
      setSelectedShoppingGroupIds(groups.map(g => g.id));
      setHasInitializedGroups(true);
    }
  }, [groups, hasInitializedGroups]);

  const handleOpenShoppingList = () => {
    setShoppingListModalOpen(true);
    const targetGroupIds = selectedShoppingGroupIds.length > 0 
      ? selectedShoppingGroupIds 
      : groups.map(g => g.id);
    
    fetchShoppingList(targetGroupIds);
  };

  const handleShoppingGroupChange = (newGroupIds: number[]) => {
    setSelectedShoppingGroupIds(newGroupIds);
    fetchShoppingList(newGroupIds);
  };

  const handleIngredientQueryChange = (query: string) => {
    const shouldClearSelection = itemDraft.selectedIngredient
      ? !matchesIngredientQuery(query, itemDraft.selectedIngredient.name)
      : false;

    setItemDraft(prev => ({
      ...prev,
      ingredientQuery: query,
      selectedIngredient: shouldClearSelection ? null : prev.selectedIngredient
    }));

    if (shouldClearSelection) {
      setConversions([]);
    }
  };

  const handleQuickUnitAdjust = (unit: string, delta: number) => {
    setItemDraft(prev => {
      const currentQty = parseFloat(prev.quantity) || 0;
      const currentUnit = prev.unit;
      let nextQty = currentUnit.toLowerCase() === unit.toLowerCase() ? Math.max(0, currentQty + delta) : (delta > 0 ? delta : 0);
      return { ...prev, quantity: nextQty > 0 ? nextQty.toString() : "0", unit: unit.toUpperCase() };
    });
  };

  // Logic for Unit Conversions Preview
  useEffect(() => {
    const fetchConversions = async () => {
      if (!itemDraft.selectedIngredient || !itemDraft.quantity || parseFloat(itemDraft.quantity) <= 0) {
        setConversions([]);
        return;
      }
      setLoadingConversions(true);
      try {
        const data = await ingredientService.getUnitConversions(
          itemDraft.selectedIngredient.id,
          parseFloat(itemDraft.quantity),
          itemDraft.unit
        );
        setConversions(data);
      } catch (error) {
        console.error('Conversion error:', error);
      } finally {
        setLoadingConversions(false);
      }
    };

    const timer = setTimeout(fetchConversions, 500);
    return () => clearTimeout(timer);
  }, [itemDraft.selectedIngredient, itemDraft.quantity, itemDraft.unit, inventoryService, setConversions, setLoadingConversions]);

  useEffect(() => {
    if (!editModalOpen) {
      resetIngredientSearch();
    }
  }, [editModalOpen, resetIngredientSearch]);

  // Actions
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGroup(true);
    try {
      if (editingGroupId) {
        await inventoryService.updateInventoryGroup(editingGroupId, groupDraft);
        showToast(t('toasts.inventory.locationUpdated'), 'success');
      } else {
        const newGroup = await inventoryService.createInventoryGroup(groupDraft);
        showToast(t('toasts.inventory.locationCreated'), 'success');
        setSelectedGroupId(newGroup.id);
      }
      await loadGroups({ preferredGroupId: editingGroupId });
      setLocationModalOpen(false);
    } catch (error) {
      showToast(t('toasts.inventory.operationFailed'), 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!window.confirm(t('confirms.inventory.deleteLocation'))) return;
    try {
      await inventoryService.deleteInventoryGroup(id);
      showToast(t('toasts.inventory.locationUpdated'), 'success');
      await loadGroups();
      setLocationModalOpen(false);
    } catch (error) {
      showToast(t('toasts.inventory.deleteError'), 'error');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !itemDraft.selectedIngredient) return;
    setSavingItem(true);
    try {
      const request = {
        ingredientId: itemDraft.selectedIngredient.id,
        quantity: parseFloat(itemDraft.quantity),
        unit: itemDraft.unit,
        updateMode: itemDraft.updateMode as 'ADD' | 'SUBTRACT' | 'SET'
      };
      if (editingItemId) {
        await inventoryService.updateInventoryItem(selectedGroupId, editingItemId, request);
      } else {
        await inventoryService.createInventoryItem(selectedGroupId, request);
      }
      showToast(editingItemId ? t('toasts.inventory.itemUpdated') : t('toasts.inventory.itemAdded'), 'success');
      await loadGroups();
      resetItemForm();
    } catch (error) {
      showToast(t('toasts.inventory.itemSaveError'), 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedGroupId || !window.confirm(t('confirms.inventory.removeItem'))) return;
    try {
      await inventoryService.deleteInventoryItem(selectedGroupId, itemId);
      showToast(t('toasts.inventory.itemRemoved'), 'success');
      await loadGroups();
    } catch (error) {
      showToast(t('toasts.inventory.operationFailed'), 'error');
    }
  };

  const handleConfirmConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !consumingItem) return;

    const userAmounts = selectedUserIds.reduce<Record<string, number>>((acc, userId) => {
      const parsedAmount = parseFloat(memberAmounts[userId]);
      if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
        acc[userId] = parsedAmount;
      }
      return acc;
    }, {});

    if (Object.keys(userAmounts).length !== selectedUserIds.length) {
      showToast('Her seçili kullanıcı için 0\'dan büyük bir miktar girin.', 'error');
      return;
    }

    setIsConsuming(true);
    try {
      await inventoryService.consumeInventoryItem(selectedGroupId, consumingItem.id, userAmounts);

      showToast(t('toasts.inventory.consumptionSaved'), 'success');
      setConsumeModalOpen(false);
      setSelectedUserIds([]);
      setMemberAmounts({});
      setConsumingItem(null);
      await loadGroups();
    } catch (error) {
      showToast(t('toasts.inventory.consumptionError'), 'error');
    } finally {
      setIsConsuming(false);
    }
  };

  const handleAddMember = async (user: User) => {
    if (!selectedGroupId) return;
    setIsAddingMember(true);
    try {
      await inventoryService.inviteUser(selectedGroupId, user.email || '');
      showToast(t('toasts.inventory.inviteSent', { name: user.name }), 'success');
      setNewMemberEmail('');
      setUserSearchResults([]);
    } catch (error) {
      showToast(t('toasts.inventory.inviteError'), 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroupId || !window.confirm(t('confirms.inventory.removeMember'))) return;
    try {
      await inventoryService.removeUserFromGroup(selectedGroupId, userId);
      showToast(t('toasts.inventory.memberRemoved'), 'success');
      await loadGroups();
    } catch (error) {
      showToast(t('toasts.inventory.operationFailed'), 'error');
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await inventoryService.acceptInvitation(invitationId);
      showToast(t('common.accept'), 'success');
      await loadInvitations();
      await loadGroups();
      setInvitationsModalOpen(false);
    } catch (error) {
      showToast(t('toasts.notifications.inviteAcceptError'), 'error');
    }
  };

  if (!authenticated) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="meal-card flex items-center gap-4 px-8 py-7 shadow-brand-hero">
          <Loader2 size={24} className="animate-spin text-terracotta" />
          <div>
            <p className="font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{t('inventory.loading')}</p>
            <p className="text-sm text-foreground-muted">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <InventoryHeader 
        locationsCount={groups.length} 
        invitationsCount={invitations.length}
        onNewLocation={() => { setEditingGroupId(null); setGroupDraft(createGroupDraft()); setLocationModalOpen(true); }}
        onOpenInvitations={() => setInvitationsModalOpen(true)}
        onOpenShoppingList={handleOpenShoppingList}
      />

      <InventoryGroupList 
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
      />

      <MemberManagement 
        activeGroup={activeGroup}
        newMemberEmail={newMemberEmail}
        isSearchingUsers={isSearchingUsers}
        userSearchResults={userSearchResults}
        isAddingMember={isAddingMember}
        onSearchUsers={handleUserSearch}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />

      <InventoryItemList 
        activeGroupName={activeGroup?.name || ''}
        totalItems={activeGroup?.itemCount || 0}
        categoryCount={activeGroup?.categoryCount || 0}
        lowStockCount={activeGroup?.lowStockCount || 0}
        items={filteredItems}
        searchQuery={itemSearchQuery}
        shoppingListItems={shoppingListItems}
        onSearchChange={setItemSearchQuery}
        onEditGroup={() => { setEditingGroupId(activeGroup?.id || null); setGroupDraft({ name: activeGroup?.name || '', icon: activeGroup?.icon || 'home' }); setLocationModalOpen(true); }}
        onAddItem={() => { resetItemForm(); setEditModalOpen(true); }}
        onEditItem={(item) => {
          setEditingItemId(item.id);
          setItemDraft({
            ingredientQuery: item.ingredient?.name || '',
            selectedIngredient: item.ingredient || null,
            quantity: '',
            unit: item.unit,
            updateMode: 'ADD'
          });
          setEditModalOpen(true);
        }}
        onDeleteItem={handleDeleteItem}
        onConsumeItem={(item) => {
          setConsumingItem(item);
          setMemberAmounts({});
          setSelectedUserIds([]);
          setConsumeModalOpen(true);
        }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        loadingItems={loadingItems}
      />

      {/* Modals */}
      <InventoryGroupModal 
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        groupDraft={groupDraft}
        setGroupDraft={setGroupDraft}
        editingGroupId={editingGroupId}
        savingGroup={savingGroup}
        onSave={handleSaveGroup}
        onDelete={handleDeleteGroup}
      />

      <InventoryItemModal 
        isOpen={editModalOpen}
        onClose={resetItemForm}
        itemDraft={itemDraft}
        setItemDraft={setItemDraft}
        editingItemId={editingItemId}
        savingItem={savingItem}
        searchingIngredients={searchingIngredients}
        ingredientResults={ingredientResults}
        ingredientSearchError={ingredientSearchError}
        hasCompletedIngredientSearch={hasCompletedIngredientSearch}
        canSearchIngredients={canSearchIngredients}
        expandedManualInput={expandedManualInput}
        setExpandedManualInput={setExpandedManualInput}
        conversions={conversions}
        loadingConversions={loadingConversions}
        onSearchIngredients={handleIngredientQueryChange}
        onSelectIngredient={handleIngredientSelect}
        onQuickUnitAdjust={handleQuickUnitAdjust}
        onSave={handleSaveItem}
      />

      <ConsumptionModal 
        isOpen={consumeModalOpen}
        onClose={() => setConsumeModalOpen(false)}
        consumingItem={consumingItem}
        activeGroupMembers={activeGroup?.users || []}
        selectedUserIds={selectedUserIds}
        setSelectedUserIds={setSelectedUserIds}
        memberAmounts={memberAmounts}
        setMemberAmounts={setMemberAmounts}
        isConsuming={isConsuming}
        onConfirm={handleConfirmConsumption}
      />

      <InvitationsModal 
        isOpen={invitationsModalOpen}
        onClose={() => setInvitationsModalOpen(false)}
        loading={loadingInvitations}
        invitations={invitations}
        onAccept={handleAcceptInvitation}
      />

      <ShoppingListModal 
        isOpen={shoppingListModalOpen}
        onClose={() => setShoppingListModalOpen(false)}
        items={shoppingListItems}
        isLoading={loadingShoppingList}
        groups={groups}
        selectedGroupIds={selectedShoppingGroupIds}
        onGroupChange={handleShoppingGroupChange}
      />
    </div>
  );
};

export default InventoryPage;
