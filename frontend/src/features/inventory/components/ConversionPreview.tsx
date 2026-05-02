import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Repeat } from 'lucide-react';
import { ItemDraft } from '../types/inventory.types';
import { UnitConversion } from '../../../types';

interface ConversionPreviewProps {
  loadingConversions: boolean;
  conversions: UnitConversion[];
  itemDraft: ItemDraft;
}

export const ConversionPreview: React.FC<ConversionPreviewProps> = ({ 
  loadingConversions, 
  conversions, 
  itemDraft 
}) => {
  const { t } = useTranslation();
  if (loadingConversions) {
    return (
      <div className="mt-2 flex items-center justify-center gap-2 p-3 rounded-xl bg-foreground/[0.02] border border-dashed border-card-border animate-pulse">
        <Loader2 size={12} className="animate-spin text-terracotta/40" />
        <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{t('common.calculating')}</span>
      </div>
    );
  }

  if (conversions.length === 0 || !itemDraft.selectedIngredient) return null;

  const physicalState = itemDraft.selectedIngredient.physicalState;
  
  const forbiddenUnits = physicalState === 'LIQUID' 
    ? ['GRAM', 'KG', 'ADET', 'PAKET', 'DILIM'] 
    : ['ML', 'LITRE', 'L'];

  const filteredConversions = conversions.filter(conv => !forbiddenUnits.includes(conv.unit.toUpperCase()));

  if (filteredConversions.length === 0) return null;

  return (
    <div className="mt-3 p-3 rounded-2xl bg-terracotta/5 border border-terracotta/10 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
      <p className="text-[10px] font-black uppercase tracking-widest text-terracotta/40 flex items-center gap-1.5">
        <Repeat size={10} />
        {t('inventory.conversionPreview.title')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {filteredConversions.slice(0, 5).map((conv) => (
          <div
            key={conv.unit}
            className="px-2.5 py-1 bg-card dark:bg-foreground/5 border border-terracotta/15 rounded-lg text-[10px] font-medium text-terracotta/90 flex items-center gap-1.5 shadow-sm"
          >
            <span className="font-bold opacity-70">{conv.displayName}:</span>
            <span className="font-black">{conv.amount}</span>
          </div>
        ))}
        {filteredConversions.length > 5 && (
          <div className="px-2 py-1 text-[9px] text-foreground/30 flex items-center">
            +{filteredConversions.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};
