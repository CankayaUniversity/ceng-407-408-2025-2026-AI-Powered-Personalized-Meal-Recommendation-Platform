import React, { useMemo, useState } from 'react';
import { Clock3, Flame, MessageSquareText, Sparkles, Star, UtensilsCrossed } from 'lucide-react';
import { MenuRecommendation, RecipeCategory } from '../../../types';

type MenuRecommendationTabsProps = {
  menus: MenuRecommendation[];
  isAiGenerated: boolean;
};

const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  [RecipeCategory.ANA_YEMEKLER]: 'Ana Yemek',
  [RecipeCategory.CORBALAR]: 'Çorba',
  [RecipeCategory.KAHVALTILIK_VE_BRANCH]: 'Kahvaltı & Branç',
  [RecipeCategory.HAMUR_ISLERI_VE_BOREKLER]: 'Hamur İşi',
  [RecipeCategory.TATLILAR_VE_PASTALAR]: 'Tatlı',
  [RecipeCategory.SALATALAR_VE_MEZELER]: 'Salata & Meze',
  [RecipeCategory.ATISTIRMALIKLAR_VE_APARATIFLER]: 'Atıştırmalık',
  [RecipeCategory.ICECEKLER]: 'İçecek'
};

const formatMetric = (value?: number | null, unit?: string): string => {
  if (value == null || Number.isNaN(value)) return '-';

  const formatted = new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: unit ? 1 : 0
  }).format(value);

  return unit ? `${formatted}${unit}` : formatted;
};

const MenuRecommendationTabs: React.FC<MenuRecommendationTabsProps> = ({ menus, isAiGenerated }) => {
  const [activeRank, setActiveRank] = useState<number>(menus[0]?.rank ?? 1);
  const activeMenu = useMemo(
    () => menus.find((menu) => menu.rank === activeRank) ?? menus[0],
    [activeRank, menus]
  );

  if (!activeMenu) return null;

  const courses = Object.entries(activeMenu.courses).filter(([, recipe]) => recipe != null);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="meal-overline">Smart Menu</p>
          <h2 className="meal-section-title mt-1">3 Alternatif Menü</h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {isAiGenerated ? <Sparkles size={14} /> : <UtensilsCrossed size={14} />}
          {isAiGenerated ? 'AI Personalization' : 'Algorithmic Fallback'}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {menus.map((menu) => (
          <button
            key={menu.rank}
            type="button"
            onClick={() => setActiveRank(menu.rank)}
            className={`shrink-0 rounded-2xl border px-5 py-3 text-sm font-bold transition-all ${
              activeMenu.rank === menu.rank
                ? 'border-terracotta bg-terracotta text-white shadow-lg shadow-terracotta/20'
                : 'border-card-border bg-white/70 text-espresso-midnight hover:border-terracotta/30 dark:border-white/10 dark:bg-white/5 dark:text-alabaster'
            }`}
          >
            {menu.rank === 1 ? 'Recommended Menu 1 (Favorite)' : `Menu ${menu.rank}`}
          </button>
        ))}
      </div>

      <article className="meal-card meal-highlight-frame overflow-hidden rounded-[2rem] p-0 shadow-[0_24px_70px_-36px_rgba(40,36,33,0.38)]">
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="bg-espresso-midnight p-6 text-white dark:bg-black/30">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">{activeMenu.title}</p>
            <h3 className="mt-3 font-serif text-3xl font-bold leading-tight">Menu {activeMenu.rank}</h3>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Total kcal</p>
                <p className="mt-1 text-2xl font-bold text-terracotta">{formatMetric(activeMenu.totalKcal)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Prep</p>
                <p className="mt-1 flex items-center gap-1 text-2xl font-bold">
                  <Clock3 size={18} className="text-ochre-soft" />
                  {formatMetric(activeMenu.totalPreparationTime, 'm')}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Protein</p>
                <p className="mt-1 text-xl font-bold text-moss-sage">{formatMetric(activeMenu.totalProtein, 'g')}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Carbs / Fat</p>
                <p className="mt-1 text-xl font-bold">{formatMetric(activeMenu.totalCarbs, 'g')} / {formatMetric(activeMenu.totalFat, 'g')}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-terracotta">
                <MessageSquareText size={17} />
                <span className="text-xs font-black uppercase tracking-[0.16em]">Insight</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/76">{activeMenu.insight}</p>
            </div>
          </aside>

          <div className="space-y-4 p-5 sm:p-6">
            {courses.map(([category, recipe]) => (
              <div
                key={`${activeMenu.rank}-${category}`}
                className="grid grid-cols-1 gap-4 rounded-2xl border border-card-border bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04] md:grid-cols-[112px_minmax(0,1fr)]"
              >
                <div className="aspect-square overflow-hidden rounded-2xl bg-terracotta/10">
                  {recipe?.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.recipeTitle} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-terracotta">
                      <UtensilsCrossed size={28} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-terracotta">
                        {CATEGORY_LABELS[category as RecipeCategory] ?? category}
                      </p>
                      <h4 className="mt-1 font-serif text-2xl font-bold text-foreground">{recipe?.recipeTitle}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="meal-badge-neon !px-3 !py-1.5 text-[10px] text-terracotta">
                        <Flame size={12} /> {formatMetric(recipe?.kcalPerServing)} kcal
                      </span>
                      <span className="meal-badge-neon !px-3 !py-1.5 text-[10px]">
                        <Clock3 size={12} /> {formatMetric(recipe?.preparationTimeMinutes, 'm')}
                      </span>
                      {recipe?.averageRating != null ? (
                        <span className="meal-badge-neon !px-3 !py-1.5 text-[10px]">
                          <Star size={12} className="fill-ochre-soft text-ochre-soft" /> {recipe.averageRating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="Protein" value={formatMetric(recipe?.proteinPerServing, 'g')} />
                    <Metric label="Carbs" value={formatMetric(recipe?.carbsPerServing, 'g')} />
                    <Metric label="Fat" value={formatMetric(recipe?.fatPerServing, 'g')} />
                    <Metric label="Servings" value={recipe?.servings ? String(recipe.servings) : '-'} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <IngredientPills title="Pantry match" items={recipe?.matchedIngredients ?? []} tone="moss" />
                    <IngredientPills title="Missing" items={recipe?.missingIngredients ?? []} tone="ochre" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
};

type MetricProps = {
  label: string;
  value: string;
};

const Metric: React.FC<MetricProps> = ({ label, value }) => (
  <div className="rounded-2xl border border-card-border bg-white/55 px-3 py-3 dark:border-white/10 dark:bg-white/5">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-espresso-midnight/35 dark:text-alabaster/35">{label}</p>
    <p className="mt-1 font-bold text-espresso-midnight dark:text-alabaster">{value}</p>
  </div>
);

type IngredientPillsProps = {
  title: string;
  items: string[];
  tone: 'moss' | 'ochre';
};

const IngredientPills: React.FC<IngredientPillsProps> = ({ title, items, tone }) => (
  <div className={`rounded-2xl border p-4 ${
    tone === 'moss'
      ? 'border-moss-sage/20 bg-moss-sage/10'
      : 'border-ochre-soft/20 bg-ochre-soft/10'
  }`}>
    <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${
      tone === 'moss' ? 'text-moss-forest/70 dark:text-moss-sage' : 'text-ochre-soft'
    }`}>
      {title}
    </p>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.length > 0 ? (
        items.map((item) => (
          <span key={item} className="rounded-full border border-card-border bg-white/70 px-2.5 py-1 text-[10px] font-bold text-espresso-midnight dark:border-white/10 dark:bg-white/5 dark:text-alabaster">
            {item}
          </span>
        ))
      ) : (
        <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">-</span>
      )}
    </div>
  </div>
);

export default MenuRecommendationTabs;
