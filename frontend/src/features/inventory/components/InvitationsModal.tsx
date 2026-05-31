import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Loader2, Check } from 'lucide-react';
import ModalPortal from '../../../shared/components/ModalPortal';

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  invitations: any[];
  onAccept: (id: number) => void;
}

export const InvitationsModal: React.FC<InvitationsModalProps> = ({
  isOpen,
  onClose,
  loading,
  invitations,
  onAccept
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-espresso-midnight/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-xl bg-card rounded-[2.5rem] shadow-brand-hero border border-card-border overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-terracotta/10 text-terracotta">
                <Users size={24} />
              </div>
              <div>
                <p className="meal-overline text-foreground/40">{t('inventory.invitations.overline')}</p>
                <h3 className="meal-section-title mt-1 text-2xl text-foreground">{t('inventory.invitations.modalTitle')}</h3>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5 text-foreground/30">
              <X size={20} />
            </button>
          </div>

          <div className="mt-8 space-y-4">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 size={32} className="mx-auto animate-spin text-terracotta mb-4" />
                <p className="text-sm text-foreground-muted">{t('inventory.invitations.loading')}</p>
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center text-foreground/20 mb-4">
                  <Users size={32} />
                </div>
                <p className="text-sm text-foreground-muted font-medium">{t('inventory.invitations.empty')}</p>
              </div>
            ) : (
              invitations.map((inv) => (
                <div key={inv.id} className="p-5 rounded-3xl border border-card-border bg-card dark:bg-foreground/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-terracotta/5 border border-terracotta/10 flex items-center justify-center text-terracotta font-bold">
                      {inv.groupName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{inv.groupName}</p>
                      <p className="text-[10px] text-foreground-muted">{t('inventory.invitations.from', { email: inv.inviterEmail })}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAccept(inv.id)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-terracotta text-white rounded-xl text-xs font-bold hover:scale-105 transition-all shadow-lg shadow-terracotta/20"
                  >
                    <Check size={14} /> {t('common.accept')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};
