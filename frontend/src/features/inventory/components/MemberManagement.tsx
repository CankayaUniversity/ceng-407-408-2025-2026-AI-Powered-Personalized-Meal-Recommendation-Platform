import React, { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Search, Loader2, Plus, Mail } from 'lucide-react';
import { User } from '../../../types';

interface MemberManagementProps {
  activeGroup: any;
  newMemberEmail: string;
  isSearchingUsers: boolean;
  userSearchResults: User[];
  isAddingMember: boolean;
  onSearchUsers: (query: string) => void;
  onAddMember: (user: User) => void;
  onRemoveMember: (userId: string) => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  activeGroup,
  newMemberEmail,
  isSearchingUsers,
  userSearchResults,
  isAddingMember,
  onSearchUsers,
  onAddMember,
  onRemoveMember
}) => {
  const { t } = useTranslation();
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);

  const shouldShowDropdown = userSearchResults.length > 0;

  const updateDropdownPosition = useCallback(() => {
    const anchor = inputContainerRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 16;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const shouldOpenAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
    const availableSpace = shouldOpenAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(120, Math.min(220, availableSpace - gap));
    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      top: shouldOpenAbove
        ? Math.max(viewportPadding, rect.top - gap - maxHeight)
        : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + gap),
      width: rect.width,
      maxHeight,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (!shouldShowDropdown) {
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
  }, [shouldShowDropdown, updateDropdownPosition]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !inputContainerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        // Dropdown kapanması userSearchResults'ın temizlenmesiyle yönetilir
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  if (!activeGroup) return null;

  return (
    <section className="meal-card shadow-brand-card p-10">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-8">
          <div>
            <p className="meal-overline">{t('inventory.members.overline')}</p>
            <h3 className="meal-section-title mt-1 text-3xl">{t('inventory.members.title')}</h3>
            <p className="mt-2 text-sm text-foreground-muted">{t('inventory.members.subtitle')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {activeGroup.users?.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-3xl bg-foreground/[0.02] border border-card-border/50 group hover:border-terracotta/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-xs font-bold text-foreground/40 uppercase">
                    {member.name?.charAt(0) || member.email.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{member.name || t('common.unnamed')}</span>
                    <span className="text-[10px] text-foreground-muted">{member.email}</span>
                  </div>
                </div>
                {activeGroup.ownerId !== member.id && (
                  <button 
                    onClick={() => onRemoveMember(member.id)}
                    className="p-2 rounded-lg text-foreground/10 hover:text-terracotta hover:bg-terracotta/5 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:w-1/3 p-8 rounded-[2.5rem] bg-foreground/[0.02] border border-card-border/50 space-y-6">
          <div className="flex items-center gap-3 text-terracotta">
            <Mail size={20} />
            <h4 className="font-serif font-bold">{t('inventory.members.inviteTitle')}</h4>
          </div>
          <div ref={inputContainerRef} className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder={t("inventory.members.searchPlaceholder")}
              value={newMemberEmail}
              disabled={isAddingMember}
              onChange={(e) => onSearchUsers(e.target.value)}
              className="w-full rounded-2xl border border-card-border bg-card px-10 py-3.5 text-sm font-bold text-foreground focus:border-terracotta transition-all outline-none disabled:opacity-50"
            />
            {(isSearchingUsers || isAddingMember) && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 size={16} className="animate-spin text-terracotta" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-foreground-muted leading-relaxed">
            {t('inventory.members.hint')}
          </p>
        </div>

        {shouldShowDropdown && dropdownStyle && createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="overflow-y-auto rounded-2xl border border-card-border bg-card p-2 shadow-xl animate-in fade-in zoom-in-95 duration-200 custom-scrollbar"
          >
            {userSearchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => onAddMember(user)}
                className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-foreground/5 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">{user.name}</span>
                  <span className="text-[10px] text-foreground-muted">{user.email}</span>
                </div>
                <Plus size={14} className="text-terracotta" />
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </section>
  );
};
