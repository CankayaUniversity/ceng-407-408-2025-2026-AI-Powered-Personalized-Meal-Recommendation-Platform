import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  ChefHat,
  Flame,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed
} from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useConsumptionService } from '../../services/consumptionService';
import { ApiError, NotFoundError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { useUserService } from '../../services/userService';
import type { ConsumptionResponse, ConsumptionSummary, Inventory, InventoryGroup, User } from '../../types';
import SmartConsumptionPanel from './SmartConsumptionPanel';

const SMART_CONSUMPTION_PANEL_ID = 'smart-consumption-panel';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);

const formatMacro = (value: number) =>
  `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value)}g`;

const formatEnumLabel = (value?: string | null) =>
  value
    ? value
        .split('_')
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ')
    : null;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

const lowStockThresholdForUnit = (unit?: string | null) => {
  switch (unit?.toUpperCase()) {
    case 'GRAM':
      return 250;
    case 'ML':
      return 500;
    case 'LITRE':
      return 1;
    case 'ADET':
    case 'PAKET':
      return 2;
    default:
      return 2;
  }
};

const isRunningLow = (item: Inventory) => item.quantity <= lowStockThresholdForUnit(item.unit);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, authenticated, login } = useAuth();
  const inventoryService = useInventoryService();
  const consumptionService = useConsumptionService();
  const userService = useUserService();

  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [dailySummary, setDailySummary] = useState<ConsumptionSummary | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (options?: { silent?: boolean }) => {
    if (!authenticated || !authUser) return;

    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [groups, summary] = await Promise.all([
        inventoryService.getInventoryGroups(),
        consumptionService.getDailySummary()
      ]);

      let nextProfile: User | null = null;
      try {
        nextProfile = await userService.getUserById(authUser.id);
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }
      }

      startTransition(() => {
        setInventoryGroups(groups);
        setDailySummary(summary);
        setProfile(nextProfile);
        setErrorMessage(null);
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Dashboard data could not be loaded.'));
    } finally {
      if (options?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [authUser, authenticated, consumptionService, inventoryService, userService]);

  useEffect(() => {
    if (!authenticated || !authUser) return;

    let ignore = false;

    const load = async () => {
      setLoading(true);
      try {
        const [groups, summary] = await Promise.all([
          inventoryService.getInventoryGroups(),
          consumptionService.getDailySummary()
        ]);

        let nextProfile: User | null = null;
        try {
          nextProfile = await userService.getUserById(authUser.id);
        } catch (error) {
          if (!(error instanceof NotFoundError)) {
            throw error;
          }
        }

        if (ignore) return;

        startTransition(() => {
          setInventoryGroups(groups);
          setDailySummary(summary);
          setProfile(nextProfile);
          setErrorMessage(null);
        });
      } catch (error) {
        if (ignore) return;
        setErrorMessage(getErrorMessage(error, 'Dashboard data could not be loaded.'));
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [authUser, authenticated, consumptionService, inventoryService, userService]);

  const inventoryMetrics = useMemo(() => {
    const itemsWithGroup = inventoryGroups.flatMap((group) =>
      group.items.map((item) => ({ group, item }))
    );
    const lowItems = itemsWithGroup.filter(({ item }) => isRunningLow(item));
    const lowCountsByGroup = lowItems.reduce<Record<string, number>>((acc, entry) => {
      const key = String(entry.group.id);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const spotlightGroup = inventoryGroups.reduce<InventoryGroup | null>((current, group) => {
      if (!current) return group;
      return (lowCountsByGroup[String(group.id)] ?? 0) > (lowCountsByGroup[String(current.id)] ?? 0) ? group : current;
    }, null);

    const categories = new Set(
      itemsWithGroup.flatMap(({ item }) => (item.ingredient?.category ? [item.ingredient.category] : []))
    );

    return {
      totalLocations: inventoryGroups.length,
      totalItems: itemsWithGroup.length,
      totalLowItems: lowItems.length,
      totalCategories: categories.size,
      lowItems,
      spotlightGroup
    };
  }, [inventoryGroups]);

  const dailyGoal = profile?.dailyCalorieTarget ?? null;
  const consumedCalories = dailySummary?.totalCalories ?? 0;
  const calorieProgress = dailyGoal && dailyGoal > 0 ? Math.min((consumedCalories / dailyGoal) * 100, 100) : 0;
  const calorieDelta = dailyGoal && dailyGoal > 0 ? dailyGoal - consumedCalories : null;

  const profileSignals = useMemo(() => {
    const signals: string[] = [];

    const dietType = formatEnumLabel(profile?.dietType);
    const dietaryGoal = formatEnumLabel(profile?.dietaryGoal);

    if (dietType) signals.push(dietType);
    if (dietaryGoal) signals.push(dietaryGoal);

    profile?.allergies?.slice(0, 2).forEach((allergy) => signals.push(`${allergy} free`));
    profile?.dislikedIngredients?.slice(0, 2).forEach((ingredient) => signals.push(`No ${ingredient}`));

    if (signals.length === 0 && authUser?.roles?.length) {
      authUser.roles.slice(0, 2).forEach((role) => signals.push(role.replace(/^ROLE_/, '').toLowerCase()));
    }

    return signals.slice(0, 5);
  }, [authUser?.roles, profile?.allergies, profile?.dietType, profile?.dietaryGoal, profile?.dislikedIngredients]);

  const lowStockHeadline = inventoryMetrics.totalLowItems > 0
    ? `${inventoryMetrics.totalLowItems} items running low in ${inventoryMetrics.spotlightGroup?.name ?? 'your inventory'}`
    : inventoryMetrics.totalItems > 0
      ? `${inventoryMetrics.totalItems} items stocked across ${inventoryMetrics.totalLocations} locations`
      : 'Start by adding a few ingredients to your inventory';

  const dailyHeadline = dailyGoal && dailyGoal > 0
    ? `${formatNumber(consumedCalories)} / ${formatNumber(dailyGoal)} kcal`
    : `${formatNumber(consumedCalories)} kcal logged today`;

  const heroMessage = dailyGoal && calorieDelta != null
    ? calorieDelta >= 0
      ? `${formatNumber(calorieDelta)} kcal remain in today's target while ${inventoryMetrics.totalLowItems} ingredients need a refill check.`
      : `${formatNumber(Math.abs(calorieDelta))} kcal above target and ${inventoryMetrics.totalLowItems} ingredients are running low.`
    : 'Live inventory signals and meal logging now feed the dashboard in real time.';

  const topLowItems = inventoryMetrics.lowItems.slice(0, 3);

  const handleQuickAddMeal = () => {
    const panel = document.getElementById(SMART_CONSUMPTION_PANEL_ID);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleConsumptionLogged = useCallback((_response: ConsumptionResponse) => {
    void loadDashboardData({ silent: true });
  }, [loadDashboardData]);

  if (!authenticated) {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="relative overflow-hidden rounded-[2.9rem] bg-espresso-midnight px-8 py-8 text-white shadow-[var(--brand-shadow-hero)]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-terracotta/30 blur-[90px]" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-moss-sage/20 blur-[100px]" />
          </div>
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-alabaster/80">
              <Sparkles size={14} className="text-terracotta" />
              Private Chef Dashboard
            </div>
            <div>
              <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">Turn nutrition data into a calmer daily routine.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-alabaster/70 sm:text-lg">
                Track meals, watch inventory health, and launch personalized recommendations from one polished workspace.
              </p>
            </div>
            <button
              onClick={() => void login()}
              className="inline-flex items-center gap-3 rounded-2xl bg-terracotta px-6 py-4 font-semibold text-white shadow-xl shadow-terracotta/25 hover:scale-[1.02] hover:bg-terracotta/90"
            >
              <Target size={18} />
              Begin Your Experience
            </button>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="relative overflow-hidden rounded-[2.9rem] bg-espresso-midnight px-8 py-8 text-white shadow-[var(--brand-shadow-hero)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-terracotta/30 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-moss-sage/20 blur-[110px]" />
        </div>
        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-alabaster/80">
              <Sparkles size={14} className="text-terracotta" />
              Live Dashboard
            </div>
            <div>
              <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">
                {`Welcome back, ${authUser?.firstName || authUser?.username || 'Chef'}!`}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-alabaster/70 sm:text-lg">
                {heroMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:max-w-md xl:justify-end">
            <button
              type="button"
              onClick={handleQuickAddMeal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-5 py-3 font-semibold text-white shadow-xl shadow-terracotta/25 hover:scale-[1.02] hover:bg-terracotta/90"
            >
              <UtensilsCrossed size={18} />
              Add Meal
            </button>
            <button
              type="button"
              onClick={() => navigate('/recommendations')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white shadow-lg shadow-black/10 hover:bg-white/10"
            >
              <Sparkles size={18} />
              Quick Recommend
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-alabaster/40">Locations</p>
            <p className="mt-2 text-3xl font-serif font-bold">{inventoryMetrics.totalLocations}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-alabaster/40">Low Stock</p>
            <p className="mt-2 text-3xl font-serif font-bold">{inventoryMetrics.totalLowItems}</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-alabaster/40">Today</p>
            <p className="mt-2 text-3xl font-serif font-bold">{formatNumber(consumedCalories)} kcal</p>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="rounded-[2rem] border border-red-200/70 dark:border-red-900/30 bg-red-50/90 dark:bg-red-900/10 px-5 py-4 text-red-700 dark:text-red-400 shadow-[0_18px_48px_-28px_rgba(185,28,28,0.35)] dark:shadow-none">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Dashboard data could not be refreshed</p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="meal-card flex min-h-[260px] items-center justify-center px-8 py-7 shadow-[var(--brand-shadow-elevated)]">
          <div className="flex items-center gap-4">
            <Loader2 size={24} className="animate-spin text-terracotta" />
            <div>
              <p className="font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Dashboard is syncing live data</p>
              <p className="text-sm text-espresso-midnight/60 dark:text-alabaster/60">Inventory, profile, and daily nutrition summary are loading.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="meal-card shadow-[var(--brand-shadow-elevated)] xl:col-span-2">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="meal-overline">Inventory Summary</p>
                  <h2 className="meal-section-title mt-2">{lowStockHeadline}</h2>
                  <p className="mt-3 text-sm leading-7 text-espresso-midnight/60 dark:text-alabaster/60">
                    Terracotta flags the ingredients that need attention first, while sage keeps healthy coverage visible across the rest of your kitchens.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-espresso-midnight/10 bg-white/70 px-4 py-3 text-sm font-semibold text-espresso-midnight/70 shadow-sm hover:text-terracotta dark:border-white/10 dark:bg-white/5 dark:text-alabaster/70 transition-colors"
                >
                  <Boxes size={16} />
                  Open Inventory
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="meal-metric-card">
                  <p className="meal-overline tracking-[0.18em]">Running Low</p>
                  <p className="mt-3 font-serif text-3xl font-bold text-terracotta">{inventoryMetrics.totalLowItems}</p>
                </div>
                <div className="meal-metric-card">
                  <p className="meal-overline tracking-[0.18em]">Stocked Items</p>
                  <p className="mt-3 font-serif text-3xl font-bold text-espresso-midnight dark:text-alabaster">{inventoryMetrics.totalItems}</p>
                </div>
                <div className="meal-metric-card">
                  <p className="meal-overline tracking-[0.18em]">Categories</p>
                  <p className="mt-3 font-serif text-3xl font-bold text-moss-forest dark:text-moss-sage">{inventoryMetrics.totalCategories}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {topLowItems.length > 0 ? topLowItems.map(({ group, item }) => (
                  <span key={`${group.id}-${item.id}`} className="meal-badge-neon dark:border-terracotta/40">
                    <span>{item.ingredient?.name || 'Ingredient'}</span>
                    <span className="text-terracotta/60 dark:text-terracotta/40">{group.name}</span>
                  </span>
                )) : (
                  <span className="meal-badge-neon border-moss-sage/20 bg-moss-sage/10 text-moss-forest dark:border-moss-sage/40 dark:text-moss-sage">
                    Inventory looks healthy across all locations.
                  </span>
                )}
              </div>
            </section>

            <section className="meal-card shadow-[var(--brand-shadow-elevated)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="meal-overline">Daily Summary</p>
                  <h2 className="meal-section-title mt-2">{dailyHeadline}</h2>
                </div>
                <div className="rounded-full bg-terracotta/10 dark:bg-terracotta/20 p-3 text-terracotta">
                  <Flame size={18} />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-espresso-midnight/40 dark:text-alabaster/40">
                  <span>Daily Goal Progress</span>
                  <span>{dailyGoal ? `${Math.round(calorieProgress)}%` : 'Set Profile'}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-espresso-midnight/5 dark:bg-white/5">
                  <div className="h-full rounded-full bg-terracotta transition-all duration-700" style={{ width: `${calorieProgress}%` }} />
                </div>
                <p className="mt-3 text-sm text-espresso-midnight/60 dark:text-alabaster/60">
                  {dailyGoal && calorieDelta != null
                    ? calorieDelta >= 0
                      ? `${formatNumber(calorieDelta)} kcal left to hit your target.`
                      : `${formatNumber(Math.abs(calorieDelta))} kcal above your target today.`
                    : 'Complete your profile to unlock personalized calorie targeting.'}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="meal-metric-card px-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Protein</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-terracotta">{formatMacro(dailySummary?.totalProtein ?? 0)}</p>
                </div>
                <div className="meal-metric-card px-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Carbs</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{formatMacro(dailySummary?.totalCarbs ?? 0)}</p>
                </div>
                <div className="meal-metric-card px-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Fat</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-moss-forest dark:text-moss-sage">{formatMacro(dailySummary?.totalFat ?? 0)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="meal-metric-card px-4 text-left transition-colors hover:border-terracotta/25"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Goal Source</p>
                  <p className="mt-2 text-sm font-semibold text-terracotta">{dailyGoal ? `${formatNumber(dailyGoal)} kcal target` : 'Set up profile data'}</p>
                </button>
              </div>
            </section>

            <section className="meal-card shadow-[var(--brand-shadow-elevated)]">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-moss-sage/12 dark:bg-moss-sage/20 p-3 text-moss-forest dark:text-moss-sage">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="meal-overline">User DNA</p>
                  <h2 className="meal-section-title mt-1 text-2xl">Profile signals</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {profileSignals.length > 0 ? profileSignals.map((signal) => (
                  <span key={signal} className="medical-badge dark:bg-moss-sage/20 dark:border-moss-sage/30 dark:text-moss-sage">{signal}</span>
                )) : (
                  <span className="meal-metric-card px-3 py-2 text-xs font-semibold text-espresso-midnight/60 dark:text-alabaster/60">
                    Add diet, goal, or allergy details from your profile.
                  </span>
                )}
              </div>

              <div className="meal-metric-card mt-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Goal Alignment</p>
                <p className="mt-3 text-sm leading-7 text-espresso-midnight/65 dark:text-alabaster/65">
                  {formatEnumLabel(profile?.dietaryGoal)
                    ? `Recommendations will stay tuned for ${formatEnumLabel(profile?.dietaryGoal)?.toLowerCase()}.`
                    : 'Profile goal is not set yet, so recommendation intent stays more general.'}
                </p>
              </div>
            </section>

            <section className="meal-card shadow-[var(--brand-shadow-elevated)]">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-terracotta/10 dark:bg-terracotta/20 p-3 text-terracotta">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="meal-overline">Kitchen Footprint</p>
                  <h2 className="meal-section-title mt-1 text-2xl">Coverage at a glance</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="meal-metric-card flex items-center justify-between px-4">
                  <span className="text-sm font-semibold text-espresso-midnight/70 dark:text-alabaster/70">Locations connected</span>
                  <span className="font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{inventoryMetrics.totalLocations}</span>
                </div>
                <div className="meal-metric-card flex items-center justify-between px-4">
                  <span className="text-sm font-semibold text-espresso-midnight/70 dark:text-alabaster/70">Live ingredients</span>
                  <span className="font-serif text-2xl font-bold text-terracotta">{inventoryMetrics.totalItems}</span>
                </div>
                <div className="meal-metric-card flex items-center justify-between px-4">
                  <span className="text-sm font-semibold text-espresso-midnight/70 dark:text-alabaster/70">Tracked categories</span>
                  <span className="font-serif text-2xl font-bold text-moss-forest dark:text-moss-sage">{inventoryMetrics.totalCategories}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[2.6rem] border border-white/60 bg-espresso-midnight p-6 text-white shadow-[0_28px_80px_-40px_rgba(40,36,33,0.7)] xl:col-span-2">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="meal-overline text-white/45 dark:text-white/45">Quick Actions</p>
                  <h2 className="meal-section-title mt-2 text-white dark:text-white">Jump from insight to action without leaving the dashboard.</h2>
                  <p className="mt-3 text-sm leading-7 text-white/70">
                    Use the spiced terracotta action buttons to log a meal instantly or open the recommendation engine with your latest inventory context.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleQuickAddMeal}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-5 py-4 font-semibold text-white shadow-xl shadow-terracotta/25 hover:scale-[1.02] hover:bg-terracotta/90"
                  >
                    <ChefHat size={18} />
                    Add Meal
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/recommendations')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 font-semibold text-white shadow-lg shadow-black/10 hover:bg-white/10"
                  >
                    <ArrowRight size={18} />
                    Quick Recommend
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section id={SMART_CONSUMPTION_PANEL_ID} className="scroll-mt-6">
            <div className="mb-3 flex items-center justify-end">
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${refreshing ? 'bg-moss-sage/15 text-moss-forest dark:text-moss-sage' : 'bg-transparent text-espresso-midnight/35 dark:text-alabaster/35'}`}>
                {refreshing ? 'Dashboard syncing...' : 'Live bound to meal logging'}
              </span>
            </div>
            <SmartConsumptionPanel onConsumptionLogged={handleConsumptionLogged} />
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
