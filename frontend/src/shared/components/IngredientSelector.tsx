import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Plus, Utensils, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Ingredient } from '../../types';

interface IngredientSelectorProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (ingredient: Ingredient) => void;
  selectedIngredient: Ingredient | null;
  onClearSelection?: () => void;
  searching: boolean;
  results: Ingredient[];
  error?: string | null;
  hasCompletedSearch: boolean;
  placeholder?: string;
  label?: string;
  showSelectedDetails?: boolean;
  renderExtraDetails?: (ingredient: Ingredient) => React.ReactNode;
}

export const IngredientSelector: React.FC<IngredientSelectorProps> = ({
  query,
  onQueryChange,
  onSelect,
  selectedIngredient,
  onClearSelection,
  searching,
  results,
  error,
  hasCompletedSearch,
  placeholder,
  label,
  showSelectedDetails = true,
  renderExtraDetails
}) => {
  const { t } = useTranslation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !searchContainerRef.current?.contains(target) &&
        !searchDropdownRef.current?.contains(target)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const shouldShowSearchDropdown =
    isSearchFocused &&
    !selectedIngredient &&
    (searching || results.length > 0 || !!error || hasCompletedSearch);

  const updateDropdownPosition = useCallback(() => {
    const anchor = searchContainerRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 16;
    const gap = 12;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const shouldOpenAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = shouldOpenAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(160, Math.min(320, availableSpace - gap));

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      top: shouldOpenAbove
        ? Math.max(viewportPadding, rect.top - gap - maxHeight)
        : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + gap),
      width: rect.width,
      maxHeight,
      zIndex: 99999
    });
  }, []);

  useLayoutEffect(() => {
    if (!shouldShowSearchDropdown) {
      setDropdownStyle(null);
      return;
    }

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [
    shouldShowSearchDropdown,
    updateDropdownPosition,
    searching,
    results.length,
    error,
    hasCompletedSearch
  ]);

  const searchDropdown = shouldShowSearchDropdown && dropdownStyle
    ? createPortal(
        <div
          ref={searchDropdownRef}
          style={dropdownStyle}
          className="overflow-y-auto rounded-[2rem] border border-card-border bg-card p-3 shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar"
        >
          {searching ? (
            <div className="flex items-center justify-center gap-3 px-4 py-6 text-sm font-medium text-foreground/50">
              <Loader2 size={18} className="animate-spin text-terracotta" />
              {t('common.loading')}
            </div>
          ) : error ? (
            <div className="px-4 py-5 text-sm font-semibold text-red-500 bg-red-500/5 rounded-[1.5rem]">
              {error}
            </div>
          ) : results.length > 0 ? (
            results.map((ing) => (
              <button
                key={ing.id}
                type="button"
                onClick={() => {
                  onSelect(ing);
                  setIsSearchFocused(false);
                }}
                className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all hover:bg-terracotta/5 group"
              >
                <div className="h-12 w-12 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/20 group-hover:bg-terracotta group-hover:text-white transition-colors font-black">
                  {ing.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{ing.name}</p>
                  <p className="truncate text-[10px] font-medium text-foreground-muted uppercase tracking-widest mt-0.5">{ing.category?.replace('_', ' ') || t('common.general')}</p>
                </div>
                <Plus size={16} className="shrink-0 text-foreground/10 group-hover:text-terracotta" />
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-sm font-medium text-foreground/45">
              {t('inventory.noIngredientsFound')}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="space-y-4">
      {label && <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 px-2">{label}</label>}
      <div ref={searchContainerRef} className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-terracotta transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder={placeholder || t('inventory.searchPlaceholder')}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsSearchFocused(false);
            }
          }}
          className="w-full rounded-[2rem] border border-card-border bg-card dark:bg-white/5 pl-16 pr-6 py-5 font-bold text-foreground focus:border-terracotta focus:ring-8 focus:ring-terracotta/5 transition-all outline-none"
        />
        {searching && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <Loader2 size={20} className="animate-spin text-terracotta" />
          </div>
        )}
      </div>

      {showSelectedDetails && selectedIngredient && (
        <div className="space-y-6 p-8 rounded-[2.5rem] bg-terracotta/[0.03] border border-terracotta/10 animate-in fade-in zoom-in-95 duration-500 relative">
          {onClearSelection && (
             <button 
                type="button"
                onClick={onClearSelection}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-terracotta/10 text-terracotta/40 hover:text-terracotta transition-all"
             >
                <X size={16} />
             </button>
          )}
          <div className="flex items-center justify-between border-b border-terracotta/10 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-terracotta text-white flex items-center justify-center shadow-lg shadow-terracotta/20">
                <Utensils size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-terracotta/40">{t('inventory.selectedIngredient')}</p>
                <p className="text-xl font-serif font-bold text-foreground">{selectedIngredient.name}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/20">{t('common.category')}</p>
              <span className="px-3 py-1 bg-card dark:bg-white/5 border border-card-border rounded-full text-[10px] font-bold text-foreground/50 shadow-sm">
                {selectedIngredient.category?.replace('_', ' ') || t('common.general')}
              </span>
            </div>
          </div>
          {renderExtraDetails && renderExtraDetails(selectedIngredient)}
        </div>
      )}

      {searchDropdown}
    </div>
  );
};
