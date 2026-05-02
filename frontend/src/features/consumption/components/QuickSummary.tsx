import React from 'react';
import { useTranslation } from 'react-i18next';
import { Soup, UtensilsCrossed, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { 
  type EntryMode, 
  type NutritionPreview, 
  type InventoryGroup 
} from '../types/SmartConsumption.types';
import { 
  formatCalories, 
  formatMacro, 
  locationLabel 
} from '../utils/SmartConsumption.utils';

interface QuickSummaryProps {
  summaryTitle: string;
  summarySubtitle: string | null;
  entryMode: EntryMode;
  nutritionPreview: NutritionPreview;
  memberSummaryRows: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>;
  inventoryDeductions: Array<{ name: string; grams: number }>;
  isOutside: boolean;
  selectedGroup: InventoryGroup | null;
  submitting: boolean;
  selectedItemsCount: number;
  memberSelectionsCount: number;
}

export const QuickSummary: React.FC<QuickSummaryProps> = ({
  summaryTitle,
  summarySubtitle,
  entryMode,
  nutritionPreview,
  memberSummaryRows,
  inventoryDeductions,
  isOutside,
  selectedGroup,
  submitting,
  selectedItemsCount,
  memberSelectionsCount
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4 rounded-[2rem] meal-highlight-frame bg-card p-6 text-foreground shadow-brand-hero">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="meal-overline tracking-[0.18em] text-foreground/45">Quick Summary</p>
          <h3 className="meal-section-title mt-2 text-2xl text-foreground">
            {summaryTitle}
          </h3>
          {summarySubtitle ? (
              <p className="mt-2 text-sm text-foreground/60">{summarySubtitle}</p>
          ) : null}
        </div>
        <div className="rounded-full bg-terracotta/10 p-3 text-terracotta">
          {entryMode === 'RECIPE' ? <Soup size={18} /> : <UtensilsCrossed size={18} />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-[1.5rem] bg-foreground/[0.03] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/40">Calories</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatCalories(nutritionPreview.calories)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-foreground/[0.03] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/40">Protein</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.protein)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-foreground/[0.03] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/40">Carbs</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.carbs)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-foreground/[0.03] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/40">Fat</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.fat)}</p>
        </div>
      </div>

      {memberSummaryRows.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-[1.8rem] border border-card-border bg-foreground/[0.02]">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/[0.03]">
              <tr>
                <th className="px-6 py-3 font-semibold text-foreground/50">{t('consumption.summary.colUser')}</th>
                <th className="px-6 py-3 font-semibold text-foreground/50">Calories</th>
                <th className="px-6 py-3 font-semibold text-foreground/50 text-right">Protein</th>
                <th className="px-6 py-3 font-semibold text-foreground/50 text-right">Carbs</th>
                <th className="px-6 py-3 font-semibold text-foreground/50 text-right">{t('consumption.summary.colFat')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50">
              {memberSummaryRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-foreground/[0.01]">
                  <td className="px-6 py-4 font-bold text-foreground">{row.name}</td>
                  <td className="px-6 py-4 text-foreground/70">{formatCalories(row.calories)}</td>
                  <td className="px-6 py-4 text-foreground/70 text-right font-mono">{formatMacro(row.protein)}</td>
                  <td className="px-6 py-4 text-foreground/70 text-right font-mono">{formatMacro(row.carbs)}</td>
                  <td className="px-6 py-4 text-foreground/70 text-right font-mono">{formatMacro(row.fat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inventoryDeductions.length > 0 && (
        <div className="mt-6 rounded-[1.8rem] bg-moss-sage/5 border border-moss-sage/20 p-5 dark:bg-moss-sage/10">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-moss-sage" />
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-moss-forest/70 dark:text-moss-sage/80">{t('consumption.summary.deductionTitle')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {inventoryDeductions.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm border border-moss-sage/10">
                <span className="font-semibold text-foreground/80">{d.name}</span>
                <span className="text-moss-forest dark:text-moss-sage font-mono">{d.grams >= 1000 ? `${(d.grams/1000).toFixed(1)}kg` : `${Math.round(d.grams)}g`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex-1 rounded-[1.5rem] border border-card-border bg-foreground/[0.02] px-5 py-4 text-sm text-foreground/70">
          {isOutside
              ? t('consumption.summary.outsideNote')
              : t('consumption.summary.locationNote', { location: locationLabel(selectedGroup) })}
        </div>

            <button
                type="submit"
                disabled={submitting || (selectedItemsCount === 0 && memberSelectionsCount === 0)}
                className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-[1.6rem] bg-terracotta px-8 py-5 font-bold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.01] hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {submitting ? t('consumption.summary.saving') : (selectedItemsCount + memberSelectionsCount) > 1 ? t('consumption.summary.saveMultiple') : t('consumption.summary.saveSingle')}
            </button>
      </div>
    </div>
  );
};
