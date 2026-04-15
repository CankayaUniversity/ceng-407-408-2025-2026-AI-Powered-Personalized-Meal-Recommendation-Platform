import { Ingredient, Inventory, InventoryGroup, User } from '../../../types';

export type GroupDraft = { 
  name: string; 
  icon: string 
};

export type ItemDraft = { 
  ingredientQuery: string; 
  selectedIngredient: Ingredient | null; 
  quantity: string; 
  unit: string; 
  updateMode: 'ADD' | 'SUBTRACT' | 'SET' 
};

export interface InventoryState {
  unitWeights: Record<string, number>;
  ingredientSpecificWeights: Record<number, Record<string, number>>;
  groups: InventoryGroup[];
  selectedGroupId: number | null;
  loading: boolean;
  locationModalOpen: boolean;
  groupDraft: GroupDraft;
  editingGroupId: number | null;
  savingGroup: boolean;
  itemDraft: ItemDraft;
  editingItemId: number | null;
  editModalOpen: boolean;
  savingItem: boolean;
  consumeModalOpen: boolean;
  consumingItem: Inventory | null;
  memberAmounts: Record<string, string>;
  selectedUserIds: string[];
  isConsuming: boolean;
  newMemberEmail: string;
  userSearchResults: User[];
  isSearchingUsers: boolean;
  isAddingMember: boolean;
  invitations: any[];
  invitationsModalOpen: boolean;
  loadingInvitations: boolean;
  conversions: any[];
  loadingConversions: boolean;
}
