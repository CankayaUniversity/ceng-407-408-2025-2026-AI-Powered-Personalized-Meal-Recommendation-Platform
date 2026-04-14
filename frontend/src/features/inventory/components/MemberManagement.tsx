import React from 'react';
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
  if (!activeGroup) return null;

  return (
    <section className="meal-card shadow-brand-card p-10">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-8">
          <div>
            <p className="meal-overline">Group Members</p>
            <h3 className="meal-section-title mt-1 text-3xl">Lokasyon Üyeleri</h3>
            <p className="mt-2 text-sm text-foreground-muted">Bu envanteri kimlerle paylaşıyorsun?</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {activeGroup.users?.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-3xl bg-foreground/[0.02] border border-card-border/50 group hover:border-terracotta/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-xs font-bold text-foreground/40 uppercase">
                    {member.name?.charAt(0) || member.email.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{member.name || 'İsimsiz'}</span>
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
            <h4 className="font-serif font-bold">Yeni Üye Davet Et</h4>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="E-posta veya isim..."
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
            
            {userSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-48 overflow-y-auto rounded-2xl border border-card-border bg-card p-2 shadow-xl animate-in fade-in zoom-in-95 duration-200">
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
              </div>
            )}
          </div>
          <p className="text-[10px] text-foreground-muted leading-relaxed">
            Üye ekleyerek envanterinizi ortak yönetebilir ve tüketimleri birlikte takip edebilirsiniz.
          </p>
        </div>
      </div>
    </section>
  );
};
