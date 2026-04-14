import React from 'react';
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
  return (
    <div className="mt-4 rounded-[2rem] meal-highlight-frame bg-white p-6 text-espresso-midnight shadow-brand-hero dark:bg-espresso-midnight dark:text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="meal-overline tracking-[0.18em] text-espresso-midnight/45 dark:text-white/45">Quick Summary</p>
          <h3 className="meal-section-title mt-2 text-2xl text-espresso-midnight dark:text-white">
            {summaryTitle}
          </h3>
          {summarySubtitle ? (
              <p className="mt-2 text-sm text-espresso-midnight/60 dark:text-white/60">{summarySubtitle}</p>
          ) : null}
        </div>
        <div className="rounded-full bg-terracotta/10 p-3 text-terracotta">
          {entryMode === 'RECIPE' ? <Soup size={18} /> : <UtensilsCrossed size={18} />}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Calories</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatCalories(nutritionPreview.calories)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Protein</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.protein)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Carbs</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.carbs)}</p>
        </div>
        <div className="rounded-[1.5rem] bg-espresso-midnight/[0.03] px-5 py-5 dark:bg-white/5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-white/40">Fat</p>
          <p className="mt-2 font-serif text-3xl font-bold">{formatMacro(nutritionPreview.fat)}</p>
        </div>
      </div>

      {memberSummaryRows.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-[1.8rem] border border-card-border bg-white/40 dark:bg-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-espresso-midnight/[0.03] dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 font-semibold text-espresso-midnight/50 dark:text-white/50">Kullanıcı</th>
                <th className="px-6 py-3 font-semibold text-espresso-midnight/50 dark:text-white/50">Kalori</th>
                <th className="px-6 py-3 font-semibold text-espresso-midnight/50 dark:text-white/50 text-right">Protein</th>
                <th className="px-6 py-3 font-semibold text-espresso-midnight/50 dark:text-white/50 text-right">Karbonhidrat</th>
                <th className="px-6 py-3 font-semibold text-espresso-midnight/50 dark:text-white/50 text-right">Yağ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/50 dark:divide-white/10">
              {memberSummaryRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-espresso-midnight/[0.01] dark:hover:bg-white/[0.01]">
                  <td className="px-6 py-4 font-bold text-espresso-midnight dark:text-white">{row.name}</td>
                  <td className="px-6 py-4 text-espresso-midnight/70 dark:text-white/70">{formatCalories(row.calories)}</td>
                  <td className="px-6 py-4 text-espresso-midnight/70 dark:text-white/70 text-right font-mono">{formatMacro(row.protein)}</td>
                  <td className="px-6 py-4 text-espresso-midnight/70 dark:text-white/70 text-right font-mono">{formatMacro(row.carbs)}</td>
                  <td className="px-6 py-4 text-espresso-midnight/70 dark:text-white/70 text-right font-mono">{formatMacro(row.fat)}</td>
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
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-moss-forest/70 dark:text-moss-sage/80">Envanterden Düşecek Malzemeler</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {inventoryDeductions.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs shadow-sm dark:bg-white/5 border border-moss-sage/10">
                <span className="font-semibold text-espresso-midnight/80 dark:text-white/80">{d.name}</span>
                <span className="text-moss-forest dark:text-moss-sage font-mono">{d.grams >= 1000 ? `${(d.grams/1000).toFixed(1)}kg` : `${Math.round(d.grams)}g`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex-1 rounded-[1.5rem] border border-card-border bg-espresso-midnight/[0.02] px-5 py-4 text-sm text-espresso-midnight/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          {isOutside
              ? 'Outside / Other seçildi. Yalnızca günlük tüketim özeti güncellenecek.'
              : `${locationLabel(selectedGroup)} stokundan otomatik düşüm yapılacak.`}
        </div>

            <button
                type="submit"
                disabled={submitting || (selectedItemsCount === 0 && memberSelectionsCount === 0)}
                className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-[1.6rem] bg-terracotta px-8 py-5 font-bold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.01] hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {submitting ? 'Kaydediliyor...' : (selectedItemsCount + memberSelectionsCount) > 1 ? 'Tüketimleri Kaydet' : 'Tüketimi Kaydet'}
            </button>
      </div>
    </div>
  );
};
