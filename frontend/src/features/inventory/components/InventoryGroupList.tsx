import React from 'react';
import { InventoryGroup } from '../../../types';
import { LOCATION_ICONS } from '../utils/inventoryUtils';

interface InventoryGroupListProps {
  groups: InventoryGroup[];
  selectedGroupId: number | null;
  onSelectGroup: (id: number) => void;
}

export const InventoryGroupList: React.FC<InventoryGroupListProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup
}) => {
  return (
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
          const active = selectedGroupId === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className={`min-w-[240px] rounded-[2.2rem] border p-5 text-left transition-all ${
                active
                  ? 'border-transparent bg-terracotta text-white shadow-lg shadow-terracotta/20'
                  : 'border-card-border bg-card hover:border-sage/50 text-foreground shadow-brand-card dark:bg-foreground/5'
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
  );
};
