import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, MapPin, Loader2 } from 'lucide-react';
import { type InventoryGroup, OUTSIDE_LOCATION } from '../types/SmartConsumption.types';
import { MealType } from '../../../types';
import { useDefinitions } from '../../../infrastructure/ui/DefinitionContext';

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
  const { t } = useTranslation();
  const { enums, loading } = useDefinitions();

  const mealOptions = useMemo(() => enums?.mealTypes || [], [enums?.mealTypes]);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="meal-overline tracking-[0.18em] text-foreground/50">{t('consumption.location.overline')}</p>
        <h3 className="text-xl font-bold text-foreground">{t('consumption.location.title')}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {loading && mealOptions.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-foreground/40 animate-pulse">
            <Loader2 size={14} className="animate-spin" />
            {t('consumption.location.definitionsLoading')}
          </div>
        )}
        <div className="flex flex-wrap gap-2 rounded-2xl bg-card p-1.5">
          <button
            type="button"
            onClick={() => onLocationChange(OUTSIDE_LOCATION)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              isOutside ? 'bg-foreground text-background shadow-lg' : 'text-foreground/60 hover:text-terracotta'
            }`}
          >
            <MapPin size={16} />
            {t('consumption.location.outside')}
          </button>
          {inventoryGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onLocationChange(String(group.id))}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                selectedLocationId === String(group.id)
                  ? 'bg-terracotta text-white shadow-lg'
                  : 'text-foreground/60 hover:text-terracotta'
              }`}
            >
              <Home size={16} />
              {group.name}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-card-border/50 hidden md:block" />
        <div className="flex flex-wrap gap-2 rounded-2xl bg-card p-1.5">
          {mealOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onMealTypeChange(option.value as MealType)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                mealType === option.value
                  ? 'bg-moss-sage text-white shadow-lg'
                  : 'text-foreground/60 hover:text-terracotta'
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
