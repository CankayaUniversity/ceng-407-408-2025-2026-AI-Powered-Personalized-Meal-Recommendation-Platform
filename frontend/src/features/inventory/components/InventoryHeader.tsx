import React from 'react';
import { Boxes, Plus, Users, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InventoryHeaderProps {
  locationsCount: number;
  invitationsCount: number;
  onNewLocation: () => void;
  onOpenInvitations: () => void;
  onOpenShoppingList: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  locationsCount,
  invitationsCount,
  onNewLocation,
  onOpenInvitations,
  onOpenShoppingList
}) => {
  const { t } = useTranslation();
  return (
    <header className="relative overflow-hidden rounded-[2.75rem] bg-card px-8 py-10 text-foreground shadow-brand-hero meal-highlight-frame dark:bg-espresso-midnight dark:text-white">
      <div className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-100">
        <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-terracotta/20 blur-[100px] dark:bg-terracotta/25" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-moss-sage/15 blur-[100px] dark:bg-moss-sage/10" />
      </div>
      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <div className="meal-badge-neon px-4 text-[11px] font-bold tracking-[0.22em]">
            <Boxes size={14} />
            Multi-Inventory
          </div>
          <div>
            <h1 className="font-serif text-4xl font-bold leading-tight text-foreground dark:text-white sm:text-5xl">{t('inventory.header.title')}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-muted dark:text-alabaster/60 sm:text-lg">
              {t('inventory.header.subtitle')}
            </p>
          </div>
        </div>
        <div className="meal-hero-actions">
          <div className="flex-1 min-w-[120px] rounded-[1.8rem] border border-card-border bg-white/70 px-6 py-4 text-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white sm:flex-none">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground-muted dark:text-alabaster/40">{t('inventory.header.locationsLabel')}</p>
            <p className="mt-1 text-3xl font-serif font-bold text-foreground dark:text-white">{locationsCount}</p>
          </div>
          <button
            type="button"
            onClick={onOpenShoppingList}
            className="btn-responsive rounded-2xl border border-terracotta/30 bg-terracotta/5 px-6 py-4 font-bold text-terracotta hover:bg-terracotta/10 transition-all"
          >
            <ShoppingCart size={18} />
            <span className="meal-no-wrap">{t('dashboard.inventory.shoppingList')}</span>
          </button>
          <button
            type="button"
            onClick={onNewLocation}
            className="btn-responsive rounded-2xl bg-terracotta px-6 py-4 font-bold text-white shadow-xl shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            <span className="meal-no-wrap">{t('inventory.header.newLocation')}</span>
          </button>
          {invitationsCount > 0 && (
            <button
              type="button"
              onClick={onOpenInvitations}
              className="relative btn-responsive rounded-2xl bg-moss-sage px-6 py-4 font-bold text-white shadow-xl shadow-moss-sage/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Users size={18} />
              <span className="meal-no-wrap">{t('inventory.header.invitations')}</span>
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold ring-4 ring-background">
                {invitationsCount}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
