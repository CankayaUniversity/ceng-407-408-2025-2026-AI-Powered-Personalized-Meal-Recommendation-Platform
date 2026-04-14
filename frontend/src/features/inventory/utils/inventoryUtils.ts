import { Home, Briefcase, MapPin, Package, Leaf } from 'lucide-react';
import { GroupDraft, ItemDraft } from '../types/inventory.types';

export const LOCATION_ICONS = [
  { value: 'home', label: 'Ev', icon: Home },
  { value: 'briefcase', label: 'Ofis', icon: Briefcase },
  { value: 'map-pin', label: 'Şehir', icon: MapPin },
  { value: 'package', label: 'Kiler', icon: Package },
  { value: 'leaf', label: 'Yazlık', icon: Leaf }
] as const;

export const createGroupDraft = (): GroupDraft => ({ name: '', icon: 'home' });

export const createItemDraft = (): ItemDraft => ({ 
  ingredientQuery: '', 
  selectedIngredient: null, 
  quantity: '', 
  unit: 'GRAM', 
  updateMode: 'ADD' 
});

export const formatCategory = (category?: string | null) =>
    category
        ? category.split('_').map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(' ')
        : 'Kategorisiz';

export const formatQuantity = (value: number) =>
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value);
