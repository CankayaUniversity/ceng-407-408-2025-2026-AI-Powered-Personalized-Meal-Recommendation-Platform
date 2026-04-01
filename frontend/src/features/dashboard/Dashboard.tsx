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
  UtensilsCrossed,
  Info
} from 'lucide-react';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useConsumptionService } from '../../services/consumptionService';
import { ApiError, NotFoundError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { useUserService } from '../../services/userService';
import type { ConsumptionResponse, ConsumptionSummary, Inventory, InventoryGroup, User } from '../../types';
import SmartConsumptionPanel from './SmartConsumptionPanel';
import { useToast } from '../../shared/hooks/useToast';

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

const lowStockThresholdForUnit = (unit?: string | null) => {
  switch (unit?.toUpperCase()) {
    case 'GRAM': return 250;
    case 'ML': return 500;
    case 'LITRE': return 1;
    case 'ADET':
    case 'PAKET': return 2;
    default: return 2;
  }
};

const isRunningLow = (item: Inventory) => item.quantity <= lowStockThresholdForUnit(item.unit);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, authenticated, login } = useAuth();
  const { showToast } = useToast();
  const inventoryService = useInventoryService();
  const consumptionService = useConsumptionService();
  const userService = useUserService();

  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [dailySummary, setDailySummary] = useState<ConsumptionSummary | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (options?: { silent?: boolean }) => {
    if (!authenticated || !authUser) return;

    if (options?.silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [groups, summary] = await Promise.all([
        inventoryService.getInventoryGroups(),
        consumptionService.getDailySummary()
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
      });
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Veriler senkronize edilemedi.';
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
    const itemsWithGroup = inventoryGroups.flatMap((group) =>
        group.items.map((item) => ({ group, item }))
    );
    const lowItems = itemsWithGroup.filter(({ item }) => isRunningLow(item));

    const categories = new Set(
        itemsWithGroup.flatMap(({ item }) => (item.ingredient?.category ? [item.ingredient.category] : []))
    );

    return {
      totalLocations: inventoryGroups.length,
      totalItems: itemsWithGroup.length,
      totalLowItems: lowItems.length,
      totalCategories: categories.size,
      lowItems
    };
  }, [inventoryGroups]);

  const dailyGoal = profile?.dailyCalorieTarget ?? 0;
  const consumedCalories = dailySummary?.totalCalories ?? 0;
  const calorieProgress = dailyGoal > 0 ? Math.min((consumedCalories / dailyGoal) * 100, 100) : 0;
  const calorieDelta = dailyGoal > 0 ? dailyGoal - consumedCalories : null;

  const profileSignals = useMemo(() => {
    const signals: string[] = [];
    if (profile?.dietType && profile.dietType !== 'NONE') signals.push(formatEnumLabel(profile.dietType)!);
    if (profile?.dietaryGoal) signals.push(formatEnumLabel(profile.dietaryGoal)!);
    profile?.allergies?.slice(0, 2).forEach((a) => signals.push(`${a} Hassasiyeti`));
    return signals.slice(0, 4);
  }, [profile]);

  const handleQuickAddMeal = () => {
    const panel = document.getElementById(SMART_CONSUMPTION_PANEL_ID);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleConsumptionLogged = useCallback((_response: ConsumptionResponse) => {
    showToast('Öğün başarıyla kaydedildi.', 'success');
    void loadDashboardData({ silent: true });
  }, [loadDashboardData, showToast]);

  if (!authenticated) {
    return (
        <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-700">
          <header className="relative overflow-hidden rounded-5xl bg-card dark:bg-espresso-midnight p-12 shadow-brand-elevated border border-card-border">
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
          <p className="font-serif text-xl text-foreground-muted italic">Veriler senkronize ediliyor...</p>
        </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 px-4">
        {/* Hero Header */}
        <header className="relative overflow-hidden rounded-5xl bg-card dark:bg-espresso-midnight p-8 md:p-12 shadow-brand-hero border border-card-border">
          <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-40">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-terracotta/40 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sage/20 blur-[100px]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live Dashboard
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground dark:text-white">
                Hoş geldin, {authUser?.firstName || 'Şef'}!
              </h1>
              <p className="text-foreground-muted max-w-2xl text-lg leading-relaxed font-medium">
                Bugün hedefinden <span className="text-foreground dark:text-white font-bold">{calorieDelta ? formatNumber(Math.abs(calorieDelta)) : '---'} kcal</span>
                {calorieDelta && calorieDelta > 0 ? ' uzaktasın.' : ' ileridesin.'} Envanterinde ise kritik seviyede
                <span className="text-terracotta font-bold"> {inventoryMetrics.totalLowItems} malzeme</span> bulunuyor.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={handleQuickAddMeal} className="btn-primary py-3 px-6 flex items-center gap-2">
                <UtensilsCrossed size={18} /> Öğün Ekle
              </button>
              <button onClick={() => navigate('/recommendations')} className="btn-secondary py-3 px-6 flex items-center gap-2">
                <Sparkles size={18} /> Tarif Öner
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Konumlar', val: inventoryMetrics.totalLocations, icon: Boxes },
              { label: 'Eksik Malzeme', val: inventoryMetrics.totalLowItems, icon: AlertCircle, color: 'text-terracotta' },
              { label: 'Toplam Kalori', val: formatNumber(consumedCalories), icon: Flame },
              { label: 'Kategoriler', val: inventoryMetrics.totalCategories, icon: TrendingUp }
            ].map((stat, i) => (
                <div key={i} className="bg-background/50 dark:bg-white/5 border border-card-border backdrop-blur-md rounded-3xl p-5 group hover:bg-primary/5 transition-all">
                  <p className="text-[10px] uppercase tracking-widest text-foreground-muted mb-2 flex items-center gap-2 font-bold">
                    <stat.icon size={12} /> {stat.label}
                  </p>
                  <p className={`text-3xl font-serif font-bold ${stat.color || 'text-foreground dark:text-white'}`}>{stat.val}</p>
                </div>
            ))}
          </div>
        </header>

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Inventory Summary */}
          <section className="lg:col-span-8 meal-card flex flex-col justify-between group">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="space-y-2">
                <span className="meal-overline">Envanter Sağlığı</span>
                <h2 className="meal-section-title">
                  {inventoryMetrics.totalLowItems > 0
                      ? `${inventoryMetrics.totalLowItems} Malzeme Kritik Seviyede`
                      : 'Mutfak Stokları Güvende'}
                </h2>
                <p className="text-foreground-muted text-sm max-w-lg font-medium italic">
                  Kritik seviyedeki malzemeler kırmızı ile işaretlenmiştir.
                </p>
              </div>
              <button onClick={() => navigate('/inventory')} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
                Envanteri Aç <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="meal-metric-card border-terracotta/20 bg-terracotta/[0.03] dark:bg-terracotta/5">
                <span className="text-[10px] font-bold uppercase text-terracotta/70">Azalan</span>
                <p className="text-4xl font-serif font-bold text-terracotta">{inventoryMetrics.totalLowItems}</p>
              </div>
              <div className="meal-metric-card">
                <span className="text-[10px] font-bold uppercase text-foreground-muted">Toplam Kalem</span>
                <p className="text-4xl font-serif font-bold text-foreground">{inventoryMetrics.totalItems}</p>
              </div>
              <div className="meal-metric-card border-sage/20 bg-sage/[0.03] dark:bg-sage/5">
                <span className="text-[10px] font-bold uppercase text-sage">Kategori</span>
                <p className="text-4xl font-serif font-bold text-moss-forest dark:text-sage">{inventoryMetrics.totalCategories}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {inventoryMetrics.lowItems.slice(0, 5).map(({ item }, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-terracotta/10 text-terracotta border border-terracotta/20">
                {item.ingredient?.name} ({item.quantity} {item.unit?.toLowerCase()})
              </span>
              ))}
              {inventoryMetrics.totalLowItems > 5 && (
                  <span className="text-xs text-foreground-muted font-bold px-2 flex items-center">+{inventoryMetrics.totalLowItems - 5} daha</span>
              )}
            </div>
          </section>

          {/* Daily Nutrition */}
          <section className="lg:col-span-4 meal-card space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="meal-overline">Beslenme Takibi</span>
                <h3 className="meal-section-title">Günlük Özet</h3>
              </div>
              <div className="p-3 bg-terracotta/10 text-terracotta rounded-2xl">
                <Flame size={20} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-3xl font-serif font-bold text-foreground">
                  {formatNumber(consumedCalories)}
                  <span className="text-sm font-sans text-foreground-muted ml-1">/ {formatNumber(dailyGoal)} kcal</span>
                </p>
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
                { label: 'Protein', val: dailySummary?.totalProtein || 0, color: 'text-terracotta' },
                { label: 'Karb.', val: dailySummary?.totalCarbs || 0, color: 'text-foreground' },
                { label: 'Yağ', val: dailySummary?.totalFat || 0, color: 'text-sage' }
              ].map((macro, i) => (
                  <div key={i} className="meal-metric-card p-3 text-center border-card-border">
                    <p className="text-[9px] uppercase font-bold text-foreground-muted mb-1">{macro.label}</p>
                    <p className={`text-sm font-bold ${macro.color}`}>{formatMacro(macro.val)}</p>
                  </div>
              ))}
            </div>

            <button onClick={() => navigate('/profile')} className="btn-secondary w-full p-4 text-xs flex items-center justify-between group">
              Hedefleri Güncelle <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </section>

          {/* User DNA */}
          <section className="lg:col-span-4 meal-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-sage/10 text-sage rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <h3 className="meal-section-title text-xl">User DNA</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileSignals.length > 0 ? profileSignals.map((s, i) => (
                  <span key={i} className="medical-badge">{s}</span>
              )) : (
                  <p className="text-sm italic text-foreground-muted">Profil tercihleri ayarlanmamış.</p>
              )}
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-sage/5 border border-sage/10">
              <div className="flex items-center gap-2 text-sage mb-2">
                <Info size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Algoritma Notu</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                Önerileriniz {profile?.dietaryGoal ? formatEnumLabel(profile.dietaryGoal)?.toLowerCase() : 'genel'} hedeflerinize göre filtreleniyor.
              </p>
            </div>
          </section>

          {/* Quick Actions / Recommendations Teaser */}
          <section className="lg:col-span-8 rounded-5xl bg-sage p-8 md:p-10 text-white shadow-brand-elevated flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
              <ChefHat size={200} />
            </div>
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Yapay Zeka Hazır</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight max-w-md">
                Mevcut malzemelerinle ne pişirebilirsin?
              </h2>
              <p className="text-white/70 text-sm max-w-sm font-medium">
                Envanterindeki {inventoryMetrics.totalItems} malzemeyi analiz edip sana en uygun 3 tarifi saniyeler içinde getirebiliriz.
              </p>
            </div>
            <button
                onClick={() => navigate('/recommendations')}
                className="relative z-10 bg-white text-sage px-8 py-5 rounded-3xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              Önerileri Gör <Sparkles size={20} />
            </button>
          </section>
        </div>

        {/* Smart Consumption Section */}
        <section id={SMART_CONSUMPTION_PANEL_ID} className="scroll-mt-10 pt-4 pb-12">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="meal-section-title flex items-center gap-3">
              Hızlı Öğün Kaydı
              {refreshing && <Loader2 size={18} className="animate-spin text-terracotta/50" />}
            </h3>
            <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
            {refreshing ? 'Eşitleniyor...' : 'Canlı Bağlantı Aktif'}
          </span>
          </div>
          <SmartConsumptionPanel onConsumptionLogged={handleConsumptionLogged} />
        </section>
      </div>
  );
};

export default Dashboard;
