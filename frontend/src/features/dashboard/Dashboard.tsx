import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowRight,
  ChefHat,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
  Info,
  ShoppingCart,
  Activity
} from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useConsumptionService } from '../../services/consumptionService';
import { ApiError, NotFoundError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { useUserService } from '../../services/userService';
import type { ConsumptionSummary, InventoryGroup, User } from '../../types';
import { useToast } from '../../shared/hooks/useToast';
import { useUI } from '../../infrastructure/ui/UIContext';
import { ShoppingListModal } from '../inventory/components/ShoppingListModal';

const formatNumber = (value: number) =>
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);

const formatMacro = (value: number) =>
    `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value)}g`;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: authUser, authenticated, login } = useAuth();
  const { showToast } = useToast();
  const { openConsumption } = useUI();
  const inventoryService = useInventoryService();
  const consumptionService = useConsumptionService();
  const userService = useUserService();

  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [dailySummary, setDailySummary] = useState<ConsumptionSummary | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [shoppingListModalOpen, setShoppingListModalOpen] = useState(false);
  const [shoppingListItems, setShoppingListItems] = useState<any[]>([]);
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);
  const [selectedShoppingGroupIds, setSelectedShoppingGroupIds] = useState<number[]>([]);
  const [hasInitializedGroups, setHasInitializedGroups] = useState(false);

  // Initialize selected groups when groups change for the first time
  useEffect(() => {
    if (inventoryGroups.length > 0 && !hasInitializedGroups) {
      setSelectedShoppingGroupIds(inventoryGroups.map(g => g.id));
      setHasInitializedGroups(true);
    }
  }, [inventoryGroups, hasInitializedGroups]);

  const fetchShoppingList = async (groupIds: number[]) => {
    setLoadingShoppingList(true);
    try {
      const data = await inventoryService.getShoppingList(groupIds);
      setShoppingListItems(data.items || []);
      return data.items || [];
    } catch (error) {
      showToast(t('toasts.inventory.shoppingListError'), 'error');
      return [];
    } finally {
      setLoadingShoppingList(false);
    }
  };

  const handleOpenShoppingList = () => {
    setShoppingListModalOpen(true);
    const targetGroupIds = selectedShoppingGroupIds.length > 0 
      ? selectedShoppingGroupIds 
      : inventoryGroups.map(g => g.id);
    
    fetchShoppingList(targetGroupIds);
  };

  const handleShoppingGroupChange = (newGroupIds: number[]) => {
    setSelectedShoppingGroupIds(newGroupIds);
    fetchShoppingList(newGroupIds);
  };

  const loadDashboardData = useCallback(async (options?: { silent?: boolean }) => {
    if (!authenticated || !authUser) return;

    if (options?.silent) setRefreshing(true);
    else setLoading(true);

    try {
      const groups = await inventoryService.getInventoryGroups();
      const groupIds = groups.map(g => g.id);
      
      const [summary, shoppingList] = await Promise.all([
        consumptionService.getDailySummary(),
        inventoryService.getShoppingList(groupIds)
      ]);

      let nextProfile: User | null = null;
      try {
        nextProfile = await userService.getUserById(authUser.id);
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error;
      }

      startTransition(() => {
        setInventoryGroups(groups);
        setDailySummary(summary);
        setProfile(nextProfile);
        setShoppingListItems(shoppingList.items || []);
      });
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : t('toasts.dashboard.syncError');
      showToast(msg, 'error');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [authUser, authenticated, consumptionService, inventoryService, userService, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const inventoryMetrics = useMemo(() => {
    const totalLocations = inventoryGroups.length;
    const totalItems = inventoryGroups.reduce((acc, g) => acc + (g.items?.length || 0), 0);
    const totalCategories = new Set(
      inventoryGroups.flatMap(g => g.items?.map(i => i.ingredient?.category).filter(Boolean) || [])
    ).size;

    return {
      totalLocations,
      totalItems,
      totalLowItems: shoppingListItems.length,
      totalCategories,
      lowItems: shoppingListItems
    };
  }, [inventoryGroups, shoppingListItems]);

  const dailyGoal = profile?.dailyCalorieTarget ?? 0;
  const consumedCalories = dailySummary?.totalCalories ?? 0;
  const calorieProgress = dailyGoal > 0 ? Math.min((consumedCalories / dailyGoal) * 100, 100) : 0;
  const calorieDelta = dailyGoal > 0 ? dailyGoal - consumedCalories : null;

  const bmiStatus = useMemo(() => {
    if (!profile?.bmi) return null;
    if (profile.bmi < 18.5) return { color: 'text-blue-500' };
    if (profile.bmi < 25) return { color: 'text-sage' };
    if (profile.bmi < 30) return { color: 'text-terracotta' };
    return { color: 'text-red-500' };
  }, [profile]);

  const profileSignals = useMemo(() => {
    const signals: string[] = [];
    if (profile?.dietType && profile.dietType !== 'NONE') {
      const label = t(`dashboard.dietType.${profile.dietType}`, 
        profile.dietType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()));
      signals.push(label);
    }
    if (profile?.dietaryGoal) {
      const label = t(`dashboard.dietaryGoal.${profile.dietaryGoal}`, 
        profile.dietaryGoal.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()));
      signals.push(label);
    }
    profile?.allergies?.slice(0, 2).forEach((a) => signals.push(`${a}`));
    return signals.slice(0, 4);
  }, [profile, t]);

  if (!authenticated) {
    return (
        <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-700">
          <header className="relative overflow-hidden rounded-5xl bg-card p-12 shadow-brand-elevated meal-highlight-frame dark:bg-espresso-midnight border border-card-border">
            <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-terracotta blur-[100px]" />
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-sage blur-[100px]" />
            </div>
            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
                <Sparkles size={14} /> MealAI Personal Chef
              </div>
              <h1 className="text-5xl md:text-6xl font-serif font-bold leading-tight text-foreground dark:text-white">
                Mutfağını Veriyle <br /> Yönetmeye Başla.
              </h1>
              <p className="text-lg text-foreground-muted max-w-xl">
                Envanterini takip et, günlük kalorini yönet ve sana özel üretilen yapay zeka tarifleriyle tanış.
              </p>
              <button onClick={() => login()} className="btn-primary py-4 px-8 text-lg flex items-center gap-3">
                <Target size={20} /> Deneyimi Başlat
              </button>
            </div>
          </header>
        </div>
    );
  }

  if (loading && !refreshing) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 size={40} className="animate-spin text-terracotta" />
          <p className="font-serif text-xl text-foreground-muted italic">{t('toasts.profile.refreshing')}</p>
        </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 px-4 pb-20">
        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-5xl bg-card p-8 md:p-12 shadow-brand-hero meal-highlight-frame dark:bg-espresso-midnight border border-card-border">
          <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-40">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-terracotta/40 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sage/20 blur-[100px]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live Dashboard
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground dark:text-white">
                  {t('dashboard.welcome')}, {authUser?.firstName || 'Şef'}!
                </h1>
                {profile?.bmi && (
                  <div className="flex items-center gap-3 px-4 py-2 rounded-3xl bg-terracotta text-white shadow-brand-soft border border-terracotta/20 animate-in zoom-in duration-500">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-80 leading-none mb-0.5">{t('dashboard.stats.bmiLabel')}</span>
                      <span className="text-xl font-serif font-bold leading-none">{profile.bmi}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-foreground-muted max-w-2xl text-lg leading-relaxed font-medium">
                {t('dashboard.hero.subtitle')} <span className="text-foreground dark:text-white font-bold">{calorieDelta ? formatNumber(Math.abs(calorieDelta)) : '---'} kcal</span>
                {calorieDelta && calorieDelta > 0 ? ` ${t('dashboard.hero.away')}` : ` ${t('dashboard.hero.ahead')}`} Envanterinde ise kritik seviyede
                <span className="text-terracotta font-bold"> {inventoryMetrics.totalLowItems} {t('dashboard.hero.lowItems')}</span> bulunuyor.
              </p>
            </div>

            <div className="meal-hero-actions">
              <button onClick={() => navigate('/history')} className="btn-responsive btn-secondary py-2.5 sm:py-3 px-4 sm:px-6 text-sm sm:text-base bg-primary/10 text-primary border-primary/20">
                <TrendingUp size={18} /> <span className="meal-no-wrap">{t('dashboard.hero.analyze')}</span>
              </button>
              <button onClick={() => openConsumption()} className="btn-responsive btn-primary py-2.5 sm:py-3 px-4 sm:px-6 text-sm sm:text-base">
                <UtensilsCrossed size={18} /> <span className="meal-no-wrap">{t('dashboard.hero.addMeal')}</span>
              </button>
              <button onClick={() => navigate('/recommendations')} className="btn-responsive btn-secondary py-2.5 sm:py-3 px-4 sm:px-6 text-sm sm:text-base">
                <Sparkles size={18} /> <span className="meal-no-wrap">{t('dashboard.hero.recommend')}</span>
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('dashboard.stats.meals'), val: dailySummary?.totalMeals || 0, icon: UtensilsCrossed },
              { label: t('dashboard.stats.criticalStock'), val: inventoryMetrics.totalLowItems, icon: AlertCircle, color: 'text-terracotta' },
              { label: t('dashboard.stats.bmiValue'), val: profile?.bmi || '---', icon: Activity, color: bmiStatus?.color },
              { label: t('dashboard.stats.activeGoal'), val: profile?.dietaryGoal ? t(`dashboard.dietaryGoal.${profile.dietaryGoal}`, profile.dietaryGoal.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())) : '---', icon: Target }
            ].map((stat, i) => (
                <div key={i} className="bg-background/50 dark:bg-white/5 border border-card-border backdrop-blur-md rounded-3xl p-5 group hover:bg-primary/5 transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-foreground-muted mb-2 flex items-center gap-2 font-bold">
                    <stat.icon size={12} /> {stat.label}
                  </p>
                  <p className={`text-xl md:text-2xl font-serif font-bold ${stat.color || 'text-foreground dark:text-white'}`}>{stat.val}</p>
                </div>
            ))}
          </div>
        </header>

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Inventory Summary */}
          <section className="lg:col-span-8 meal-card meal-highlight-frame flex flex-col justify-between group">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2">
                <span className="meal-overline">{t('dashboard.inventory.title')}</span>
                <h2 className="meal-section-title">
                  {inventoryMetrics.totalLowItems > 0
                      ? `${inventoryMetrics.totalLowItems} ${t('dashboard.stats.criticalStock')}`
                      : t('dashboard.inventory.safe')}
                </h2>
                <p className="text-foreground-muted text-sm max-w-lg font-medium italic">
                  {t('dashboard.inventory.warning')}
                </p>
              </div>
              <div className="meal-action-group">
                <button onClick={() => navigate('/inventory')} className="btn-responsive btn-secondary py-3 px-6">
                  {t('dashboard.inventory.open')} <ArrowRight size={16} />
                </button>
                <button 
                  onClick={handleOpenShoppingList} 
                  className="btn-responsive btn-primary py-3 px-6 bg-terracotta text-white shadow-lg shadow-terracotta/20 hover:scale-[1.02]"
                >
                  <ShoppingCart size={18} /> {t('dashboard.inventory.shoppingList')}
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="meal-metric-card border-terracotta/20 bg-terracotta/[0.03] dark:bg-terracotta/5">
                <span className="text-[10px] font-bold uppercase text-terracotta/70">{t('dashboard.inventory.low')}</span>
                <p className="text-4xl font-serif font-bold text-terracotta">{inventoryMetrics.totalLowItems}</p>
              </div>
              <div className="meal-metric-card">
                <span className="text-[10px] font-bold uppercase text-foreground-muted">{t('dashboard.inventory.total')}</span>
                <p className="text-4xl font-serif font-bold text-foreground">{inventoryMetrics.totalItems}</p>
              </div>
              <div className="meal-metric-card border-sage/20 bg-sage/[0.03] dark:bg-sage/5">
                <span className="text-[10px] font-bold uppercase text-sage">{t('dashboard.inventory.categories')}</span>
                <p className="text-4xl font-serif font-bold text-moss-forest dark:text-sage">{inventoryMetrics.totalCategories}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {inventoryMetrics.lowItems.slice(0, 5).map((item, i) => (
                  <span key={i} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    item.status === 'MISSING' 
                      ? 'bg-terracotta text-white border-terracotta shadow-sm' 
                      : 'bg-terracotta/10 text-terracotta border-terracotta/20'
                  }`}>
                {item.ingredientName} ({item.currentQuantity} {item.unit?.toLowerCase()})
              </span>
              ))}
            </div>
          </section>

          {/* Daily Nutrition */}
          <section className="lg:col-span-4 meal-card space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="meal-overline">{t('dashboard.daily.tracking')}</span>
                <h3 className="meal-section-title">{t('dashboard.daily.title')}</h3>
              </div>
              <button 
                onClick={() => navigate('/history')}
                className="p-3 bg-terracotta/10 text-terracotta rounded-2xl hover:bg-terracotta/20 transition-all"
              >
                <TrendingUp size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <p className="text-3xl font-serif font-bold text-foreground dark:text-white">
                    {formatNumber(consumedCalories)}
                    <span className="text-sm font-sans text-foreground-muted ml-1">/ {formatNumber(dailyGoal)} kcal</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-terracotta">%{Math.round(calorieProgress)}</span>
              </div>
              <div className="h-3 bg-background dark:bg-white/5 rounded-full overflow-hidden border border-card-border">
                <div
                    className="h-full bg-terracotta transition-all duration-1000 ease-out"
                    style={{ width: `${calorieProgress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t('dashboard.daily.protein'), val: dailySummary?.totalProtein || 0, color: 'text-terracotta' },
                { label: t('dashboard.daily.carbs'), val: dailySummary?.totalCarbs || 0, color: 'text-foreground dark:text-white' },
                { label: t('dashboard.daily.fat'), val: dailySummary?.totalFat || 0, color: 'text-sage' }
              ].map((macro, i) => (
                  <div key={i} className="meal-metric-card p-3 text-center border-card-border">
                    <p className="text-[9px] uppercase font-bold text-foreground-muted mb-1">{macro.label}</p>
                    <p className={`text-sm font-bold ${macro.color}`}>{formatMacro(macro.val)}</p>
                  </div>
              ))}
            </div>
          </section>

          {/* User DNA */}
          <section className="lg:col-span-4 meal-card space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sage/10 text-sage rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <h3 className="meal-section-title text-xl">{t('dashboard.stats.userDna')}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileSignals.length > 0 ? profileSignals.map((s, i) => (
                  <span key={i} className="medical-badge">{s}</span>
              )) : (
                  <p className="text-sm italic text-foreground-muted">{t('dashboard.daily.noProfile')}</p>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-sage/5 border border-sage/10">
              <div className="flex items-center gap-2 text-sage mb-2">
                <Info size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('dashboard.recommendations.algorithm')}</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                {t('dashboard.recommendations.subtitle', { goal: profile?.dietaryGoal ? t(`dashboard.dietaryGoal.${profile.dietaryGoal}`).toLowerCase() : t('common.general') })}
              </p>
            </div>
          </section>

          {/* AI Teaser / Recommendations */}
          <section className="lg:col-span-8 rounded-5xl bg-sage p-8 md:p-10 text-white shadow-brand-elevated meal-highlight-frame flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
              <ChefHat size={200} />
            </div>
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{t('dashboard.ai.badge')}</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight max-w-md">
                {t('dashboard.ai.title')}
              </h2>
              <p className="text-white/70 text-sm max-w-sm font-medium">
                {t('dashboard.ai.subtitle', { count: inventoryMetrics.totalItems })}
              </p>
            </div>
            <button
                onClick={() => navigate('/recommendations')}
                className="relative z-10 bg-white text-sage px-8 py-5 rounded-3xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              {t('dashboard.ai.cta')} <Sparkles size={20} />
            </button>
          </section>

        </div>

        <ShoppingListModal 
          isOpen={shoppingListModalOpen}
          onClose={() => setShoppingListModalOpen(false)}
          items={shoppingListItems}
          isLoading={loadingShoppingList}
          groups={inventoryGroups}
          selectedGroupIds={selectedShoppingGroupIds}
          onGroupChange={handleShoppingGroupChange}
        />
      </div>
  );
};

export default Dashboard;
