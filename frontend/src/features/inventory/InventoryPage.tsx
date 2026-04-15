import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useInventoryService } from '../../services/inventoryService';
import { useConsumptionService } from '../../services/consumptionService';
import { useToast } from '../../shared/hooks/useToast';
import { useIngredientService } from '../../services/ingredientService';
import { User, MealType } from '../../types';

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
  const { authenticated } = useAuth();
  const { showToast } = useToast();
  const inventoryService = useInventoryService();
  const consumptionService = useConsumptionService();
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

  // Ingredient Search logic (kept here or can be moved to hook)
  const handleSearchIngredients = async (query: string) => {
    setItemDraft(prev => ({ ...prev, ingredientQuery: query }));
    if (query.length < 2) {
      setIngredientResults([]);
      return;
    }
    setSearchingIngredients(true);
    try {
      const results = await ingredientService.searchIngredients(query);
      setIngredientResults(results);
    } catch (error) {
      showToast('Malzeme araması başarısız oldu.', 'error');
    } finally {
      setSearchingIngredients(false);
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

  // Actions
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGroup(true);
    try {
      if (editingGroupId) {
        await inventoryService.updateInventoryGroup(editingGroupId, groupDraft);
        showToast('Lokasyon güncellendi.', 'success');
      } else {
        const newGroup = await inventoryService.createInventoryGroup(groupDraft);
        showToast('Yeni lokasyon oluşturuldu.', 'success');
        setSelectedGroupId(newGroup.id);
      }
      await loadGroups({ preferredGroupId: editingGroupId });
      setLocationModalOpen(false);
    } catch (error) {
      showToast('İşlem başarısız oldu.', 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!window.confirm('Bu lokasyonu ve içindeki tüm ürünleri silmek istediğinize emin misiniz?')) return;
    try {
      await inventoryService.deleteInventoryGroup(id);
      showToast('Lokasyon silindi.', 'success');
      await loadGroups();
      setLocationModalOpen(false);
    } catch (error) {
      showToast('Silme işlemi başarısız.', 'error');
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
      showToast(editingItemId ? 'Ürün güncellendi.' : 'Ürün eklendi.', 'success');
      await loadGroups();
      resetItemForm();
    } catch (error) {
      showToast('Ürün kaydedilemedi.', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedGroupId || !window.confirm('Bu ürünü envanterden çıkarmak istediğinize emin misiniz?')) return;
    try {
      await inventoryService.deleteInventoryItem(selectedGroupId, itemId);
      showToast('Ürün çıkarıldı.', 'success');
      await loadGroups();
    } catch (error) {
      showToast('İşlem başarısız.', 'error');
    }
  };

  const handleConfirmConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !consumingItem) return;
    setIsConsuming(true);
    try {
      // Record consumption for each member
      for (const userId of selectedUserIds) {
        await consumptionService.logConsumption({
          userId,
          ingredientId: consumingItem.ingredient?.id,
          inventoryGroupId: selectedGroupId,
          portionMultiplier: parseFloat(memberAmounts[userId]),
          mealType: MealType.SNACK, // Default to SNACK if OTHER is not available
          isFromInventory: true
        });
      }
      
      // Also consume from inventory
      const userAmounts: Record<string, number> = {};
      selectedUserIds.forEach(id => {
        userAmounts[id] = parseFloat(memberAmounts[id]);
      });
      await inventoryService.consumeInventoryItem(selectedGroupId, consumingItem.id, userAmounts);

      showToast('Tüketim başarıyla kaydedildi.', 'success');
      setConsumeModalOpen(false);
      await loadGroups();
    } catch (error) {
      showToast('Tüketim kaydedilemedi.', 'error');
    } finally {
      setIsConsuming(false);
    }
  };

  const handleAddMember = async (user: User) => {
    if (!selectedGroupId) return;
    setIsAddingMember(true);
    try {
      await inventoryService.inviteUser(selectedGroupId, user.email || '');
      showToast(`${user.name} kullanıcısına davet gönderildi.`, 'success');
      setNewMemberEmail('');
      setUserSearchResults([]);
    } catch (error) {
      showToast('Davet gönderilemedi.', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroupId || !window.confirm('Bu üyeyi gruptan çıkarmak istediğinize emin misiniz?')) return;
    try {
      await inventoryService.removeUserFromGroup(selectedGroupId, userId);
      showToast('Üye çıkarıldı.', 'success');
      await loadGroups();
    } catch (error) {
      showToast('İşlem başarısız.', 'error');
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await inventoryService.acceptInvitation(invitationId);
      showToast('Davet kabul edildi.', 'success');
      await loadInvitations();
      await loadGroups();
      setInvitationsModalOpen(false);
    } catch (error) {
      showToast('Davet kabul edilemedi.', 'error');
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
        expandedManualInput={expandedManualInput}
        setExpandedManualInput={setExpandedManualInput}
        conversions={conversions}
        loadingConversions={loadingConversions}
        onSearchIngredients={handleSearchIngredients}
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
