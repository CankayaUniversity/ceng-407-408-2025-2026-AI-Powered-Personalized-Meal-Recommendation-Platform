import React from 'react';
import { CheckCircle2, Soup, UtensilsCrossed, CakeSlice, Salad, Coffee, Croissant, Cookie, GlassWater, type LucideIcon } from 'lucide-react';
import { RecipeCategory } from '../../../types';

type MenuSelectionToggleProps = {
  selectedCategories: RecipeCategory[];
  onChange: (categories: RecipeCategory[]) => void;
};

const CATEGORY_OPTIONS: Array<{ value: RecipeCategory; label: string; Icon: LucideIcon }> = [
  { value: RecipeCategory.CORBALAR, label: 'Çorbalar', Icon: Soup },
  { value: RecipeCategory.ANA_YEMEKLER, label: 'Ana Yemekler', Icon: UtensilsCrossed },
  { value: RecipeCategory.SALATALAR_VE_MEZELER, label: 'Salatalar & Mezeler', Icon: Salad },
  { value: RecipeCategory.TATLILAR_VE_PASTALAR, label: 'Tatlılar', Icon: CakeSlice },
  { value: RecipeCategory.KAHVALTILIK_VE_BRANCH, label: 'Kahvaltı & Branç', Icon: Coffee },
  { value: RecipeCategory.HAMUR_ISLERI_VE_BOREKLER, label: 'Hamur İşleri', Icon: Croissant },
  { value: RecipeCategory.ATISTIRMALIKLAR_VE_APARATIFLER, label: 'Atıştırmalıklar', Icon: Cookie },
  { value: RecipeCategory.ICECEKLER, label: 'İçecekler', Icon: GlassWater }
];

const MenuSelectionToggle: React.FC<MenuSelectionToggleProps> = ({ selectedCategories, onChange }) => {
  const toggleCategory = (category: RecipeCategory): void => {
    const isSelected = selectedCategories.includes(category);
    const nextCategories = isSelected
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];

    onChange(nextCategories);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Menü kategorileri</p>
        <span className="rounded-full border border-card-border bg-white/60 px-3 py-1 text-xs font-bold text-terracotta dark:border-white/10 dark:bg-white/5">
          {selectedCategories.length} seçili
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {CATEGORY_OPTIONS.map(({ value, label, Icon }) => {
          const isSelected = selectedCategories.includes(value);

          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleCategory(value)}
              className={`flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                isSelected
                  ? 'border-terracotta bg-terracotta text-white shadow-lg shadow-terracotta/15'
                  : 'border-card-border bg-white/60 text-espresso-midnight hover:border-terracotta/40 dark:border-white/10 dark:bg-white/5 dark:text-alabaster'
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={`rounded-xl p-2 ${isSelected ? 'bg-white/15' : 'bg-terracotta/10 text-terracotta'}`}>
                  <Icon size={18} />
                </span>
                <span className="text-sm font-bold leading-tight">{label}</span>
              </span>
              {isSelected ? <CheckCircle2 size={18} className="shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MenuSelectionToggle;
