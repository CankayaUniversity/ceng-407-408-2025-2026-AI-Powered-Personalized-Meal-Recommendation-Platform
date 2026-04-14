import React from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { type InventoryGroup } from '../types/SmartConsumption.types';

interface MemberSelectionProps {
  selectedGroup: InventoryGroup | null;
  selectedLocationId: string;
  selectedMembers: Record<string, { [userId: string]: boolean }>;
  onToggleMember: (userId: string) => void;
  loggedInUserId: string;
}

export const MemberSelection: React.FC<MemberSelectionProps> = ({
  selectedGroup,
  selectedLocationId,
  selectedMembers,
  onToggleMember,
  loggedInUserId
}) => {
  if (!selectedGroup || selectedGroup.users.length === 0) return null;

  return (
    <div className="mt-8 border-t border-card-border/40 pt-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="meal-overline tracking-[0.18em] text-terracotta">Group Members</p>
          <h3 className="text-xl font-bold text-foreground">Kimin için kayıt yapıyorsun?</h3>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selectedGroup.users
          .filter((u: any) => String(u.id) !== loggedInUserId)
          .map((groupUser: any) => {
          const isSelected = selectedMembers[selectedLocationId]?.[groupUser.id] ?? false;
          return (
            <div
              key={groupUser.id}
              className={`group flex items-center justify-between rounded-3xl border transition-all duration-300 p-4 ${
                isSelected
                  ? 'border-terracotta bg-terracotta/5 shadow-lg shadow-terracotta/5'
                  : 'border-card-border bg-card hover:border-terracotta/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`relative h-12 w-12 overflow-hidden rounded-2xl transition-transform group-hover:scale-105 ${
                  isSelected ? 'ring-2 ring-terracotta ring-offset-2 dark:ring-offset-background' : ''
                }`}>
                  <div className={`flex h-full w-full items-center justify-center font-serif text-lg font-bold ${
                    isSelected ? 'bg-terracotta text-white' : 'bg-foreground/5 text-foreground/40'
                  }`}>
                    {groupUser.firstName?.charAt(0) || groupUser.name?.charAt(0) || '?'}
                  </div>
                </div>
                <div>
                  <p className={`font-serif text-base font-bold transition-colors ${
                    isSelected ? 'text-terracotta' : 'text-foreground'
                  }`}>
                    {groupUser.firstName || groupUser.name}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                    Member
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleMember(String(groupUser.id))}
                className={`p-1.5 rounded-full transition-colors ${
                  isSelected ? 'bg-terracotta text-white' : 'bg-foreground/5 text-foreground/40'
                }`}
              >
                {isSelected ? <CheckCircle2 size={16} /> : <Plus size={16} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
