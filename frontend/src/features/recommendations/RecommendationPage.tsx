import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Star
} from 'lucide-react';
import { useAuth, type AuthUser } from '../../infrastructure/auth/AuthContext';
import { ApiError, NotFoundError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { useRecipeService } from '../../services/recipeService';
import { useUserService } from '../../services/userService';
import type { InventoryGroup, RecommendedRecipe, RecipeRatingResponse, User } from '../../types';

type RatingDraft = {
  rating: number;
  comment: string;
  saving: boolean;
  success: string | null;
  error: string | null;
};

const createRatingDraft = (existing?: RecipeRatingResponse): RatingDraft => ({
  rating: existing?.rating ?? 8,
  comment: existing?.comment ?? '',
  saving: false,
  success: null,
  error: null
});

const buildDisplayName = (authUser: AuthUser | undefined): string => {
  if (!authUser) return '';

  const fullName = [authUser.firstName, authUser.lastName].filter(Boolean).join(' ').trim();
  return fullName || authUser.username;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

const normalizeIngredients = (group: InventoryGroup | null): string[] => {
  if (!group) return [];

  const seen = new Set<string>();

  return group.items.reduce<string[]>((acc, item) => {
    const name = item.ingredient?.name?.trim();
    if (!name) return acc;

    const key = name.toLocaleLowerCase('tr-TR');
    if (seen.has(key)) return acc;

    seen.add(key);
    acc.push(name);
    return acc;
  }, []);
};

const formatMetric = (value?: number | null, unit?: string): string => {
  if (value == null || Number.isNaN(value)) return '-';

  const formatted = new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: unit ? 1 : 0
  }).format(value);

  return unit ? `${formatted}${unit}` : formatted;
};

const formatEnumLabel = (value?: string | null): string =>
  value ? value.replace(/_/g, ' ') : 'Not set';

const loadProfile = async (authUser: AuthUser, userService: ReturnType<typeof useUserService>): Promise<User> => {
  try {
    return await userService.getUserById(authUser.id);
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }

    return userService.upsertUser({
      id: authUser.id,
      name: buildDisplayName(authUser),
      email: authUser.email
    });
  }
};

const RecommendationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, authenticated } = useAuth();
  const userService = useUserService();
  const inventoryService = useInventoryService();
  const recipeService = useRecipeService();

  const [profile, setProfile] = useState<User | null>(null);
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>([]);
  const [cravings, setCravings] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ratingsByRecipe, setRatingsByRecipe] = useState<Record<number, RecipeRatingResponse>>({});
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, RatingDraft>>({});

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId]
  );

  const availableIngredients = useMemo(
    () => normalizeIngredients(activeGroup),
    [activeGroup]
  );

  const loadPageData = async (options?: { silent?: boolean }) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError(null);

    try {
      const nextProfile = await loadProfile(user, userService);
      const [inventoryGroups, userRatings] = await Promise.all([
        inventoryService.getInventoryGroups(),
        recipeService.getRatingsByUser(user.id).catch((error) => {
          if (error instanceof NotFoundError) {
            return [];
          }

          throw error;
        })
      ]);

      const nextRatings = userRatings.reduce<Record<number, RecipeRatingResponse>>((acc, rating) => {
        acc[rating.recipeId] = rating;
        return acc;
      }, {});

      setProfile(nextProfile);
      setGroups(inventoryGroups);
      setRatingsByRecipe(nextRatings);
      setSelectedGroupId((current) => {
        if (current && inventoryGroups.some((group) => group.id === current)) {
          return current;
        }

        return inventoryGroups[0]?.id ?? null;
      });
      setRatingDrafts((current) => {
        const nextDrafts = { ...current };

        Object.entries(nextRatings).forEach(([recipeId, rating]) => {
          const numericRecipeId = Number(recipeId);
          const existingDraft = nextDrafts[numericRecipeId];

          nextDrafts[numericRecipeId] = {
            rating: rating.rating,
            comment: rating.comment ?? '',
            saving: existingDraft?.saving ?? false,
            success: existingDraft?.success ?? null,
            error: existingDraft?.error ?? null
          };
        });

        return nextDrafts;
      });
    } catch (error) {
      setPageError(getErrorMessage(error, 'Recommendation verileri yuklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    void loadPageData();
  }, [authenticated, inventoryService, recipeService, user?.id, userService]);

  useEffect(() => {
    setSuccessMessage(null);
  }, [selectedGroupId, cravings]);

  const handleGetRecommendations = async () => {
    if (!user?.id || !activeGroup || availableIngredients.length === 0) {
      setPageError('Oneri olusturmak icin once dolu bir inventory lokasyonu secmelisin.');
      return;
    }

    setRecommending(true);
    setPageError(null);
    setSuccessMessage(null);

    try {
      const response = await recipeService.getRecommendations({
        userId: user.id,
        availableIngredients,
        cravings: cravings.trim() || undefined
      });

      setRecommendations(response.recommendedRecipes);
      setRatingDrafts((current) => {
        const nextDrafts = { ...current };

        response.recommendedRecipes.forEach((recipe) => {
          nextDrafts[recipe.recipeId] = current[recipe.recipeId] ?? createRatingDraft(ratingsByRecipe[recipe.recipeId]);
        });

        return nextDrafts;
      });
      setSuccessMessage(`${response.recommendedRecipes.length} AI onerisi hazir.`);
    } catch (error) {
      setPageError(getErrorMessage(error, 'Oneriler olusturulamadi.'));
      setRecommendations([]);
    } finally {
      setRecommending(false);
    }
  };

  const updateRatingDraft = (recipeId: number, patch: Partial<RatingDraft>) => {
    setRatingDrafts((current) => ({
      ...current,
      [recipeId]: {
        ...(current[recipeId] ?? createRatingDraft(ratingsByRecipe[recipeId])),
        ...patch
      }
    }));
  };

  const handleSaveRating = async (recipe: RecommendedRecipe) => {
    if (!user?.id) return;

    const draft = ratingDrafts[recipe.recipeId] ?? createRatingDraft(ratingsByRecipe[recipe.recipeId]);
    updateRatingDraft(recipe.recipeId, { saving: true, success: null, error: null });

    try {
      const saved = await recipeService.rateRecipe({
        userId: user.id,
        recipeId: recipe.recipeId,
        rating: draft.rating,
        comment: draft.comment.trim() || undefined
      });

      setRatingsByRecipe((current) => ({
        ...current,
        [recipe.recipeId]: saved
      }));
      updateRatingDraft(recipe.recipeId, {
        rating: saved.rating,
        comment: saved.comment ?? '',
        saving: false,
        success: 'Yorum ve puanin kaydedildi.',
        error: null
      });
    } catch (error) {
      updateRatingDraft(recipe.recipeId, {
        saving: false,
        success: null,
        error: getErrorMessage(error, 'Puan kaydedilemedi.')
      });
    }
  };

  if (!authenticated) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="meal-card flex items-center gap-4 px-8 py-7 shadow-[0_24px_60px_-30px_rgba(40,36,33,0.45)]">
          <Loader2 size={24} className="animate-spin text-terracotta" />
          <div>
            <p className="font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Recommendation engine loading</p>
            <p className="text-sm text-espresso-midnight/60 dark:text-alabaster/60">Profil, inventory ve gecmis rating bilgileri esleniyor.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasInventory = groups.length > 0 && availableIngredients.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="relative overflow-hidden rounded-[2.9rem] bg-espresso-midnight px-8 py-8 text-white shadow-[0_30px_90px_-36px_rgba(40,36,33,0.78)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 right-0 h-56 w-56 rounded-full bg-terracotta/35 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-moss-sage/20 blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-alabaster/80">
              <Sparkles size={14} className="text-terracotta" />
              AI Recommendation Engine
            </div>
            <div>
              <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">Canin ne cekiyorsa onu veriye bagla.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-alabaster/70 sm:text-lg">
                Profilindeki sert kisitlar, sevmediklerin, sectigin inventory lokasyonu ve bugunku craving sinyalin tek prompt icinde Gemini&apos;ye tasinir.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-alabaster/40">Active Pantry</p>
              <p className="mt-2 font-serif text-3xl font-bold">{activeGroup?.name || 'None'}</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-alabaster/40">Ingredients</p>
              <p className="mt-2 font-serif text-3xl font-bold">{availableIngredients.length}</p>
            </div>
          </div>
        </div>
      </header>

      {pageError && (
        <div className="rounded-[2rem] border border-red-200/70 bg-red-50/90 px-5 py-4 text-red-700 shadow-[0_18px_48px_-28px_rgba(185,28,28,0.35)]">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Islem tamamlanamadi</p>
              <p className="mt-1 text-sm text-red-600">{pageError}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-[2rem] border border-moss-sage/30 bg-moss-sage/10 px-5 py-4 text-moss-forest shadow-[0_18px_48px_-28px_rgba(74,93,78,0.35)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-moss-sage" />
            <div>
              <p className="font-semibold">AI akisi guncellendi</p>
              <p className="mt-1 text-sm text-moss-forest/80 dark:text-moss-sage">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="meal-card shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-terracotta/10 p-3 text-terracotta">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="meal-overline">Signal Stack</p>
                <h2 className="meal-section-title mt-1 text-2xl">{buildDisplayName(user) || 'Chef AI'}</h2>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Avoid</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile?.allergies ?? []).length > 0 ? (
                    (profile?.allergies ?? []).map((item) => (
                      <span key={item} className="medical-badge bg-red-50 dark:bg-orange-900/20 border-red-200/70 dark:border-orange-800/40 text-red-600 dark:text-orange-400">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">Kayitli alerjen yok.</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35">Minimize</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile?.dislikedIngredients ?? []).length > 0 ? (
                    (profile?.dislikedIngredients ?? []).map((item) => (
                      <span key={item} className="medical-badge dark:bg-moss-sage/20 dark:border-moss-sage/30 dark:text-moss-sage">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">Sevmedigin icerik tanimlanmadi.</span>
                  )}
                </div>
              </div>

              <div className="meal-metric-card border-white/60 bg-white/60">
                <p className="meal-overline tracking-[0.18em]">Goal Sync</p>
                <p className="mt-3 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{formatEnumLabel(profile?.dietaryGoal)}</p>
                <p className="mt-2 text-sm text-espresso-midnight/55 dark:text-alabaster/55">
                  {profile?.dietType ? `Diet: ${formatEnumLabel(profile.dietType)}` : 'Diyet tercihi kaydedilmemis.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void loadPageData({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-espresso-midnight/10 bg-white/70 px-4 py-3 text-sm font-semibold text-espresso-midnight/70 transition-all hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-alabaster/70"
                >
                  {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                  Yenile
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-espresso-midnight px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-espresso-midnight/90 dark:bg-terracotta dark:shadow-terracotta/20"
                >
                  Profili Duzenle
                </button>
              </div>
            </div>
          </section>

          <section className="meal-card shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-moss-sage/10 p-3 text-moss-forest dark:text-moss-sage">
                <Boxes size={20} />
              </div>
              <div>
                <p className="meal-overline">Inventory Focus</p>
                <h2 className="meal-section-title mt-1 text-2xl">Current Inventory</h2>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="mt-6 rounded-[1.9rem] border border-dashed border-moss-sage/25 px-5 py-6 text-sm text-espresso-midnight/60 dark:text-alabaster/60">
                Inventory lokasyonu bulunamadi. Recommendation engine&apos;i beslemek icin once stock ekleyelim.
                <Link to="/inventory" className="mt-4 inline-flex items-center gap-2 font-semibold text-terracotta">
                  Inventory sayfasina git
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                  {groups.map((group) => {
                    const isActive = activeGroup?.id === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`min-w-[180px] rounded-[1.8rem] border px-4 py-4 text-left transition-all ${
                          isActive
                            ? 'border-transparent bg-terracotta text-white shadow-xl shadow-terracotta/20'
                            : 'border-white/60 bg-white/60 text-espresso-midnight hover:border-moss-sage/30 dark:border-white/10 dark:bg-white/5 dark:text-alabaster'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
                            <MapPin size={13} />
                            {group.itemCount} items
                          </span>
                        </div>
                        <p className="mt-4 font-serif text-2xl font-bold">{group.name}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {availableIngredients.length > 0 ? (
                    availableIngredients.map((item) => (
                      <span key={item} className="medical-badge bg-moss-sage/8 dark:bg-moss-sage/20 border-moss-sage/20 dark:border-moss-sage/30 text-moss-forest dark:text-moss-sage">
                        {item}
                      </span>
                    ))
                  ) : (
                    <div className="meal-metric-card border-dashed border-moss-sage/25 px-4 py-5 text-sm text-espresso-midnight/60 dark:text-alabaster/60">
                      Secili lokasyonda malzeme yok. AI&apos;nin oncelik verecegi icerikleri eklemek icin inventory&apos;yi doldur.
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </aside>

        <section className="space-y-6">
          <div className="meal-card shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="meal-overline">Get Recommendation</p>
                <h2 className="meal-section-title mt-2 text-4xl">Final craving sinyalini ekle.</h2>
                <p className="mt-3 text-sm leading-6 text-espresso-midnight/60 dark:text-alabaster/60">
                  Opsiyonel son soru: bugun ozellikle caninin cektigi bir sey var mi? Gemini bu sinyali, inventory ve kullanici profilinle birlikte on plana cikaracak.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGetRecommendations}
                disabled={recommending || !hasInventory}
                className="inline-flex items-center justify-center gap-2 rounded-[1.8rem] bg-terracotta px-5 py-4 font-bold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.02] hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none"
              >
                {recommending ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {recommending ? 'AI dusunuyor' : 'Get Recommendation'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <label className="block space-y-3">
                <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Anything specific you&apos;re craving today?</span>
                <textarea
                  rows={5}
                  value={cravings}
                  onChange={(event) => setCravings(event.target.value)}
                  placeholder='Examples: "Something spicy", "Pasta", "Light but high protein"'
                  className="base-input px-5 py-4 dark:border-gray-700 dark:bg-gray-800/50"
                />
              </label>

              <div className="rounded-[2rem] bg-espresso-midnight px-5 py-5 text-white shadow-[0_24px_60px_-36px_rgba(40,36,33,0.7)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 text-terracotta">
                    <ChefHat size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Prompt Payload</p>
                    <p className="mt-1 font-serif text-2xl font-bold">Gemini Context</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-white/75">
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0 text-red-300" />
                    <span>Allergies are treated as hard constraints.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-moss-sage" />
                    <span>Dislikes are minimized instead of blocked.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Boxes size={15} className="mt-0.5 shrink-0 text-ochre-soft" />
                    <span>{availableIngredients.length} pantry ingredient{availableIngredients.length === 1 ? '' : 's'} are prioritized.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Flame size={15} className="mt-0.5 shrink-0 text-terracotta" />
                    <span>{cravings.trim() ? `"${cravings.trim()}" craving'i especially highlighted.` : 'No extra craving signal added today.'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="meal-card border-dashed border-moss-sage/25 px-8 py-10 text-center shadow-[0_24px_60px_-30px_rgba(40,36,33,0.28)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <Sparkles size={28} />
              </div>
              <h3 className="meal-section-title mt-5">Recommendation sonuclari burada belirecek.</h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-espresso-midnight/60 dark:text-alabaster/60">
                Sectigin inventory lokasyonu ve kullanici profilinle birlikte son craving sinyalini gonderdiginde, her tarif icin neden secildigini anlatan AI insight kartlari olusturacagiz.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="meal-overline">Results</p>
                  <h2 className="meal-section-title mt-1">AI tarafindan secilen tarifler</h2>
                </div>
                <p className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">
                  {activeGroup?.name || 'Inventory'} lokasyonu baz alindi{cravings.trim() ? ` ve "${cravings.trim()}" craving'i vurgulandi.` : '.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {recommendations.map((recipe) => {
                  const draft = ratingDrafts[recipe.recipeId] ?? createRatingDraft(ratingsByRecipe[recipe.recipeId]);
                  const totalIngredientSignals = recipe.matchedIngredients.length + recipe.missingIngredients.length;
                  const matchPercentage = totalIngredientSignals > 0
                    ? Math.round((recipe.matchedIngredients.length / totalIngredientSignals) * 100)
                    : 100;

                  return (
                    <article key={recipe.recipeId} className="meal-card overflow-hidden rounded-[2.8rem] p-0 shadow-[0_24px_70px_-32px_rgba(40,36,33,0.38)]">
                      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
                        <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-terracotta via-terracotta/90 to-espresso-midnight">
                          {recipe.imageUrl ? (
                            <img src={recipe.imageUrl} alt={recipe.recipeTitle} className="absolute inset-0 h-full w-full object-cover" />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-espresso-midnight/90 via-espresso-midnight/25 to-transparent" />

                          <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                            <span className="match-score-badge text-xs">{matchPercentage}% pantry fit</span>
                            {cravings.trim() && (
                              <span className="meal-badge-neon border-white/20 bg-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                                Craving active
                              </span>
                            )}
                          </div>

                          <div className="absolute bottom-5 left-5 right-5">
                            <div className="meal-card rounded-[2rem] border-white/20 bg-white/10 p-5 shadow-none dark:border-white/20 dark:bg-white/10">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">AI Pick</p>
                              <h3 className="mt-2 font-serif text-3xl font-bold text-white">{recipe.recipeTitle}</h3>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {recipe.matchedIngredients.slice(0, 3).map((item) => (
                                  <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 p-6">
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="meal-overline">Recommendation Detail</p>
                              <h3 className="meal-section-title mt-2">{recipe.recipeTitle}</h3>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="meal-badge-neon">AI Insight Ready</span>
                                <span className="meal-badge-neon border-ochre-soft/20 bg-ochre-soft/10 text-ochre-soft">
                                  {recipe.servings ? `${recipe.servings} servings` : 'Flexible portions'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Calories</p>
                                <p className="mt-2 font-semibold text-terracotta">{formatMetric(recipe.calories)}</p>
                              </div>
                              <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Protein</p>
                                <p className="mt-2 font-semibold text-moss-forest dark:text-moss-sage">{formatMetric(recipe.protein, 'g')}</p>
                              </div>
                              <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Prep</p>
                                <p className="mt-2 font-semibold text-ochre-soft">{formatMetric(recipe.preparationTimeMinutes, 'm')}</p>
                              </div>
                              <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Rating</p>
                                <p className="mt-2 inline-flex items-center gap-1 font-semibold text-espresso-midnight dark:text-alabaster">
                                  <Star size={14} className="fill-ochre-soft text-ochre-soft" />
                                  {recipe.averageRating != null ? recipe.averageRating.toFixed(1) : '-'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                            <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-none dark:bg-white/5">
                              <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-terracotta/10 p-3 text-terracotta">
                                  <MessageSquareText size={18} />
                                </div>
                                <div>
                                  <p className="meal-overline tracking-[0.18em]">AI Insight</p>
                                  <h4 className="mt-1 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Why we recommended this?</h4>
                                </div>
                              </div>
                              <p className="mt-4 text-sm leading-7 text-espresso-midnight/70 dark:text-alabaster/70">{recipe.insight}</p>

                              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="meal-metric-card border-moss-sage/20 bg-moss-sage/10 px-4">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-moss-forest/55 dark:text-moss-sage">Prioritized from inventory</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {recipe.matchedIngredients.length > 0 ? (
                                      recipe.matchedIngredients.map((item) => (
                                        <span key={item} className="medical-badge bg-white/60 border-moss-sage/20 text-moss-forest dark:text-moss-sage">
                                          {item}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">Bu tarif daha cok hedef ve craving uyumundan secildi.</span>
                                    )}
                                  </div>
                                </div>

                                <div className="meal-metric-card border-ochre-soft/20 bg-ochre-soft/10 px-4">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-soft">Might still need</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {recipe.missingIngredients.length > 0 ? (
                                      recipe.missingIngredients.map((item) => (
                                        <span key={item} className="meal-badge-neon border-ochre-soft/20 bg-white/70 py-1.5 text-[11px] text-espresso-midnight dark:border-ochre-soft/30 dark:bg-white/5 dark:text-alabaster">
                                          {item}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">Bu tarifi neredeyse tamamen mevcut stock ile kurabiliyorsun.</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-none dark:bg-white/5">
                              <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-espresso-midnight/10 p-3 text-espresso-midnight dark:bg-white/10 dark:text-alabaster">
                                  <Star size={18} />
                                </div>
                                <div>
                                  <p className="meal-overline tracking-[0.18em]">Feedback Loop</p>
                                  <h4 className="mt-1 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">Rate and Comment</h4>
                                </div>
                              </div>

                              <div className="mt-5 space-y-5">
                                <div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Rating</span>
                                    <span className="meal-badge-neon border-transparent bg-terracotta px-3 py-1 text-white">{draft.rating}/10</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={draft.rating}
                                    onChange={(event) => updateRatingDraft(recipe.recipeId, {
                                      rating: Number(event.target.value),
                                      success: null,
                                      error: null
                                    })}
                                    className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-terracotta/20 accent-terracotta"
                                  />
                                  <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">
                                    <span>Needs work</span>
                                    <span>Love it</span>
                                  </div>
                                </div>

                                <label className="block space-y-2">
                                  <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">Comment</span>
                                  <textarea
                                    rows={4}
                                    value={draft.comment}
                                    onChange={(event) => updateRatingDraft(recipe.recipeId, {
                                      comment: event.target.value,
                                      success: null,
                                      error: null
                                    })}
                                    placeholder="Bu oneri craving'ine uydu mu, inventory acisindan pratik miydi?"
                                    className="base-input px-4 py-3 dark:border-white/10 dark:bg-white/5"
                                  />
                                </label>

                                {draft.error && (
                                  <div className="rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {draft.error}
                                  </div>
                                )}

                                {draft.success && (
                                  <div className="rounded-[1.4rem] border border-moss-sage/20 bg-moss-sage/10 px-4 py-3 text-sm text-moss-forest dark:text-moss-sage">
                                    {draft.success}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => void handleSaveRating(recipe)}
                                  disabled={draft.saving}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.6rem] bg-espresso-midnight px-4 py-3 font-semibold text-white transition-all hover:bg-espresso-midnight/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-terracotta"
                                >
                                  {draft.saving ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                                  {draft.saving ? 'Kaydediliyor' : 'Save Feedback'}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Carbs</p>
                              <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatMetric(recipe.carbs, 'g')}</p>
                            </div>
                            <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Fat</p>
                              <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatMetric(recipe.fat, 'g')}</p>
                            </div>
                            <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Matched</p>
                              <p className="mt-2 font-semibold text-moss-forest dark:text-moss-sage">{recipe.matchedIngredients.length}</p>
                            </div>
                            <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">Missing</p>
                              <p className="mt-2 inline-flex items-center gap-2 font-semibold text-espresso-midnight dark:text-alabaster">
                                <Clock3 size={14} className="text-ochre-soft" />
                                {recipe.missingIngredients.length}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default RecommendationPage;
