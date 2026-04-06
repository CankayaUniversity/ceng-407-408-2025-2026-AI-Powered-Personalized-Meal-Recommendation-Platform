import React from 'react';
import { Home, MapPin } from 'lucide-react';
import { type InventoryGroup, OUTSIDE_LOCATION, MEAL_OPTIONS } from '../types/SmartConsumption.types';
import { MealType } from '../../../types';

interface LocationAndMealSelectorProps {
  inventoryGroups: InventoryGroup[];
  selectedLocationId: string;
  onLocationChange: (id: string) => void;
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  isOutside: boolean;
}

export const LocationAndMealSelector: React.FC<LocationAndMealSelectorProps> = ({
  inventoryGroups,
  selectedLocationId,
  onLocationChange,
  mealType,
  onMealTypeChange,
  isOutside
}) => {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="meal-overline tracking-[0.18em] text-espresso-midnight/50 dark:text-alabaster/50">Meal Context</p>
        <h3 className="text-xl font-bold text-espresso-midnight dark:text-alabaster">Nerede ve hangi öğünde yedin?</h3>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white/50 p-1.5 dark:bg-white/5">
          <button
            type="button"
            onClick={() => onLocationChange(OUTSIDE_LOCATION)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              isOutside ? 'bg-espresso-midnight text-white shadow-lg' : 'text-espresso-midnight/60 hover:text-terracotta dark:text-alabaster/60'
            }`}
          >
            <MapPin size={16} />
            Dışarı
          </button>
          {inventoryGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onLocationChange(String(group.id))}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                selectedLocationId === String(group.id)
                  ? 'bg-terracotta text-white shadow-lg'
                  : 'text-espresso-midnight/60 hover:text-terracotta dark:text-alabaster/60'
              }`}
            >
              <Home size={16} />
              {group.name}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-card-border/50 hidden md:block" />
        <div className="flex flex-wrap gap-2 rounded-2xl bg-white/50 p-1.5 dark:bg-white/5">
          {MEAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onMealTypeChange(option.value)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                mealType === option.value
                  ? 'bg-moss-sage text-espresso-midnight shadow-lg'
                  : 'text-espresso-midnight/60 hover:text-terracotta dark:text-alabaster/60'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
