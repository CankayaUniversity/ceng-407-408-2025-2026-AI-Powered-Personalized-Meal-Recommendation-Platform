import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Boxes,
  Calendar,
  CheckCircle2,
  ChefHat,
  Clock3,
  Cpu,
  Flame,
  History,
  Loader2,
  MapPin,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Star,
  UtensilsCrossed
} from 'lucide-react';
import { useAuth, type AuthUser } from '../../infrastructure/auth/AuthContext';
import { useUI } from '../../infrastructure/ui/UIContext';
import { useToast } from '../../shared/hooks/useToast';
import { ApiError, NotFoundError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { useRecipeService } from '../../services/recipeService';
import { useUserService } from '../../services/userService';
import { useDefinitions } from '../../infrastructure/ui/DefinitionContext';
import { 
  type User, 
  type InventoryGroup, 
  type RecommendedRecipe, 
  type RecipeRatingResponse,
  type Inventory,
  type RecommendationResponse
} from '../../types';

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

  return group.items.reduce<string[]>((acc: string[], item: Inventory) => {
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

const formatEnumLabel = (value?: string | null, enums?: any, type?: string): string => {
  if (!value) return 'Belirtilmedi';
  if (enums && type) {
    const list = enums[type] as string[];
    if (list && list.includes(value)) {
      // Bu kısım i18n entegrasyonu gerektirir ama şimdilik formatlayalım
      return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    }
  }
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, authenticated } = useAuth();
  const { openConsumption } = useUI();
  const { showToast } = useToast();
  const userService = useUserService();
  const inventoryService = useInventoryService();
  const recipeService = useRecipeService();
  useDefinitions();

  const [profile, setProfile] = useState<User | null>(null);
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedAiModel, setSelectedAiModel] = useState<string>('GEMINI');
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>([]);
  const [history, setHistory] = useState<RecommendationResponse[]>([]);
  const [cravings, setCravings] = useState('');
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [ratingsByRecipe, setRatingsByRecipe] = useState<Record<number, RecipeRatingResponse>>({});
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, RatingDraft>>({});

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const inventorySummary = useMemo(() => {
    if (!activeGroup) return null;
    const totalItems = activeGroup.items?.length || 0;
    const categories = new Set(activeGroup.items?.map((i: Inventory) => i.ingredient?.category).filter(Boolean)).size;
    const lowStock = activeGroup.items?.filter((i: Inventory) => i.quantity != null && i.quantity < 2).length || 0;
    
    return { totalItems, categories, lowStock };
  }, [activeGroup]);

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
      // Refreshing state removed
    } else {
      setLoading(true);
    }

    try {
      // 1. Profil verilerini yukle
      try {
        const nextProfile = await loadProfile(user, userService);
        setProfile(nextProfile);
      } catch (err) {
        console.error('Profile load error:', err);
        // Profil kritik degilse devam edebiliriz ama genelde kritiktir
      }

      // 2. Envanter, Rating ve Geçmiş verilerini paralel yukle
      const [inventoryGroups, userRatings, recommendationHistory] = await Promise.all([
        inventoryService.getInventoryGroups().catch((err) => {
          console.error('Inventory groups load error:', err);
          return [] as InventoryGroup[];
        }),
        recipeService.getRatingsByUser(user.id).catch((error) => {
          console.error('Ratings load error:', error);
          return [] as RecipeRatingResponse[];
        }),
        recipeService.getRecommendationHistory(user.id).catch((error) => {
          console.error('History load error:', error);
          return [] as RecommendationResponse[];
        })
      ]);

      const nextRatings = userRatings.reduce<Record<number, RecipeRatingResponse>>((acc: Record<number, RecipeRatingResponse>, rating: RecipeRatingResponse) => {
        acc[rating.recipeId] = rating;
        return acc;
      }, {});

      setGroups(inventoryGroups);
      setRatingsByRecipe(nextRatings);
      setHistory(recommendationHistory);
      
      // Select the first group if none selected or current not in list
      let nextGroupId = selectedGroupId;
      if (!nextGroupId || !inventoryGroups.some((group) => group.id === nextGroupId)) {
        nextGroupId = inventoryGroups[0]?.id ?? null;
      }
      setSelectedGroupId(nextGroupId);
      
      setRatingDrafts((current: Record<number, RatingDraft>) => {
        const nextDrafts = { ...current };

        Object.entries(nextRatings).forEach(([recipeId, rating]) => {
          const numericRecipeId = Number(recipeId);
          const existingDraft = nextDrafts[numericRecipeId];

          nextDrafts[numericRecipeId] = {
            rating: (rating as RecipeRatingResponse).rating,
            comment: (rating as RecipeRatingResponse).comment ?? '',
            saving: existingDraft?.saving ?? false,
            success: existingDraft?.success ?? null,
            error: existingDraft?.error ?? null
          };
        });

        return nextDrafts;
      });

      if (inventoryGroups.length === 0) {
        console.warn('No inventory groups found for user');
      }
    } catch (error) {
      showToast(getErrorMessage(error, t('toasts.recommendations.loadError')), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    void loadPageData();
  }, [authenticated, inventoryService, recipeService, user?.id, userService]);

  const handleGetRecommendations = async () => {
    if (!user?.id || !activeGroup || availableIngredients.length === 0) {
      showToast(t('toasts.recommendations.inventoryRequired'), 'warning');
      return;
    }

    setRecommending(true);

    try {
      console.log('Fetching recommendations for user:', user.id);
      const response = await recipeService.getRecommendations({
        userId: user.id,
        availableIngredients,
        cravings: cravings.trim() || undefined,
        aiModel: selectedAiModel
      });

      setRecommendations(response.recommendedRecipes);
      setHistory((current) => [response, ...current]);
      setRatingDrafts((current: Record<number, RatingDraft>) => {
        const nextDrafts = { ...current };

        response.recommendedRecipes.forEach((recipe: RecommendedRecipe) => {
          nextDrafts[recipe.recipeId] = current[recipe.recipeId] ?? createRatingDraft(ratingsByRecipe[recipe.recipeId]);
        });

        return nextDrafts;
      });
      showToast(t('toasts.recommendations.generationSuccess', { count: response.recommendedRecipes.length }), 'success');
    } catch (error) {
      showToast(getErrorMessage(error, t('toasts.recommendations.generationError')), 'error');
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
      // 1. Öneri geçmişini puanla (Bu aynı zamanda backend'de tarif puanını da tetikliyor)
      await recipeService.rateRecommendation({
        userId: user.id,
        recommendedRecipeId: recipe.recommendationRecipeId,
        rating: draft.rating,
        comment: draft.comment.trim() || undefined
      });

      // 2. RecipeRating local state'ini de güncellemek için rateRecipe sonucunu simüle et veya fetch et
      // Ancak backend zaten ikisini beraber işlediği için sadece UI state'lerini güncellememiz yeterli.
      const saved = {
        id: Math.random(), // Geçici ID
        userId: user.id,
        recipeId: recipe.recipeId,
        rating: draft.rating * 2, // Backend 2 ile çarpıyor
        comment: draft.comment.trim() || undefined,
        createdAt: new Date().toISOString()
      } as RecipeRatingResponse;

      setRatingsByRecipe((current) => ({
        ...current,
        [recipe.recipeId]: saved
      }));
      updateRatingDraft(recipe.recipeId, {
        rating: saved.rating,
        comment: saved.comment ?? '',
        saving: false,
        success: t('toasts.recommendations.ratingSaved'),
        error: null
      });
      showToast(t('toasts.recommendations.ratingSaved'), 'success');
    } catch (error) {
      const errMsg = getErrorMessage(error, t('toasts.recommendations.ratingError'));
      updateRatingDraft(recipe.recipeId, {
        saving: false,
        success: null,
        error: errMsg
      });
      showToast(errMsg, 'error');
    }
  };

  const handleCookRecipe = async (recipe: RecommendedRecipe) => {
    // 1. Backend'e pişirildi olarak işaretle (eğer henüz işaretlenmemişse)
    if (!recipe.isCooked) {
      try {
        await recipeService.markAsCooked(recipe.recommendationRecipeId);
        
        // Local state'i güncelle (recommendations listesinde)
        setRecommendations(prev => prev.map(r => 
          r.recommendationRecipeId === recipe.recommendationRecipeId 
            ? { ...r, isCooked: true, totalCookCount: (r.totalCookCount || 0) + 1 } 
            : r
        ));

        // History listesini de güncelle (isteğe bağlı ama tutarlılık için iyi olur)
        setHistory(prev => prev.map(h => ({
          ...h,
          recommendedRecipes: h.recommendedRecipes.map(r => 
            r.recommendationRecipeId === recipe.recommendationRecipeId 
              ? { ...r, isCooked: true, totalCookCount: (r.totalCookCount || 0) + 1 } 
              : r
          )
        })));

        showToast(t('toasts.recommendations.cookMarked', { defaultValue: 'Tarif pişirildi olarak işaretlendi ve istatistiklere eklendi!' }), 'success');
      } catch (error) {
        console.error('Cook mark error:', error);
        // Hata olsa bile devam edebiliriz veya kullanıcıya bildirebiliriz
      }
    }

    // 2. Tüketim panelini aç (Mevcut davranış)
    const recipeListItem = {
      id: recipe.recipeId,
      title: recipe.recipeTitle,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      preparationTime: recipe.preparationTimeMinutes,
      servings: recipe.servings,
      imageUrl: recipe.imageUrl,
      rating: recipe.averageRating
    };
    
    openConsumption(recipeListItem);
  };

  if (!authenticated) return null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="meal-card flex items-center gap-4 px-8 py-7 shadow-[0_24px_60px_-30px_rgba(40,36,33,0.45)]">
          <Loader2 size={24} className="animate-spin text-terracotta" />
          <div>
            <p className="font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{t('recommendations.loading.title')}</p>
            <p className="text-sm text-espresso-midnight/60 dark:text-alabaster/60">{t('recommendations.loading.desc')}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasInventory = groups.length > 0 && availableIngredients.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="relative overflow-hidden rounded-[2.9rem] bg-card px-8 py-8 text-foreground shadow-[0_30px_90px_-36px_rgba(40,36,33,0.18)] meal-highlight-frame dark:bg-espresso-midnight dark:text-white dark:shadow-[0_30px_90px_-36px_rgba(40,36,33,0.78)]">
        <div className="absolute inset-0 pointer-events-none opacity-75 dark:opacity-100">
          <div className="absolute -top-16 right-0 h-56 w-56 rounded-full bg-terracotta/25 blur-[100px] dark:bg-terracotta/35" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-moss-sage/15 blur-[100px] dark:bg-moss-sage/20" />
        </div>
        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary dark:border-white/10 dark:bg-white/5 dark:text-alabaster/80">
              <Sparkles size={14} className="text-terracotta" />
              {t('recommendations.engine')}
            </div>
            <div>
              <h1 className="font-serif text-4xl font-bold leading-tight text-foreground dark:text-white sm:text-5xl">{t('recommendations.hero.title')}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-muted dark:text-alabaster/70 sm:text-lg">
                {t('recommendations.hero.subtitle', { model: selectedAiModel.charAt(0) + selectedAiModel.slice(1).toLowerCase() })}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="rounded-[2rem] border border-card-border bg-white/70 px-5 py-4 text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground-muted dark:text-alabaster/40">{t('recommendations.stats.activeLocation')}</p>
              <p className="mt-2 font-serif text-3xl font-bold text-foreground dark:text-white">{activeGroup?.name || t('recommendations.stats.notSelected')}</p>
            </div>
            <div className="rounded-[2rem] border border-card-border bg-white/70 px-5 py-4 text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground-muted dark:text-alabaster/40">{t('recommendations.stats.ingredients')}</p>
              <p className="mt-2 font-serif text-3xl font-bold text-foreground dark:text-white">{availableIngredients.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Orta-Üst: Envanter ve AI Model Seçimi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="meal-card meal-highlight-frame shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-moss-sage/10 p-3 text-moss-forest dark:text-moss-sage">
              <Boxes size={20} />
            </div>
            <div>
              <p className="meal-overline">{t('recommendations.inventory.overline')}</p>
              <h2 className="meal-section-title mt-1 text-2xl">{t('recommendations.inventory.title')}</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35 flex items-center gap-2">
              <MapPin size={12} /> {t('recommendations.inventory.registered')}
            </p>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groups.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-card-border p-4 text-center">
                  <p className="text-sm text-foreground-muted italic">{t('recommendations.inventory.noLocation')}</p>
                </div>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`group relative flex flex-col gap-1 rounded-2xl border p-4 text-left transition-all ${
                      selectedGroupId === group.id
                        ? 'border-terracotta bg-terracotta/5 shadow-md shadow-terracotta/5'
                        : 'border-card-border bg-white hover:border-terracotta/30 dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-serif text-lg font-bold ${selectedGroupId === group.id ? 'text-terracotta' : 'text-foreground'}`}>
                        {group.name}
                      </span>
                      {selectedGroupId === group.id && (
                        <div className="rounded-full bg-terracotta p-1 text-white">
                          <CheckCircle2 size={12} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
                      <span className="flex items-center gap-1">
                        <Boxes size={12} /> {t('recommendations.inventory.itemCount', { count: group.itemCount || 0 })}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {activeGroup && inventorySummary && (
              <div className="mt-4 grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300">
                <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                  <p className="text-[10px] uppercase font-bold text-primary/60">{t('recommendations.inventory.categories')}</p>
                  <p className="text-2xl font-bold text-primary">{inventorySummary.categories}</p>
                </div>
                <div className="rounded-2xl bg-terracotta/5 p-4 border border-terracotta/10">
                  <p className="text-[10px] uppercase font-bold text-terracotta/60">{t('recommendations.inventory.lowStock')}</p>
                  <p className="text-2xl font-bold text-terracotta">{inventorySummary.lowStock}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="meal-card shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Cpu size={20} />
            </div>
            <div>
              <p className="meal-overline">{t('recommendations.algorithm.overline')}</p>
              <h2 className="meal-section-title mt-1 text-2xl">{t('recommendations.algorithm.title')}</h2>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['GEMINI', 'OPENAI', 'CLAUDE'].map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => setSelectedAiModel(model)}
                className={`flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold transition-all sm:flex-col sm:items-start sm:gap-4 ${
                  selectedAiModel === model
                    ? 'border-terracotta bg-terracotta text-white shadow-lg shadow-terracotta/20'
                    : 'border-card-border bg-white text-espresso-midnight hover:border-terracotta/50 dark:border-white/10 dark:bg-white/5 dark:text-alabaster'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Cpu size={16} />
                  {model}
                </div>
                {selectedAiModel === model && (
                  <div className="rounded-full bg-white/20 p-1 sm:self-end">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-primary/5 p-4 border border-primary/10">
            <p className="text-xs leading-relaxed text-primary/80">
              <Sparkles size={14} className="inline mr-2 mb-1" />
              {t('recommendations.algorithm.description')}
            </p>
          </div>
        </section>
      </div>

      {/* 3. Orta-Alt: Profil ve Öneri Al Kartı */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="meal-card shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)] h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-terracotta/10 p-3 text-terracotta">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="meal-overline">{t('recommendations.profile.overline')}</p>
                <h2 className="meal-section-title mt-1 text-2xl">{buildDisplayName(user) || 'Chef AI'}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-xl bg-espresso-midnight p-2 text-white hover:bg-espresso-midnight/90 dark:bg-terracotta"
              title={t('recommendations.profile.editTitle')}
            >
              <ChefHat size={18} />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/50 p-3 border border-card-border dark:bg-white/5">
                <p className="text-[10px] uppercase font-bold opacity-50">{t('recommendations.profile.dietType')}</p>
                <p className="font-semibold text-sm truncate">{profile?.dietType ? formatEnumLabel(profile.dietType) : t('recommendations.profile.normal')}</p>
              </div>
              <div className="rounded-2xl bg-white/50 p-3 border border-card-border dark:bg-white/5">
                <p className="text-[10px] uppercase font-bold opacity-50">{t('recommendations.profile.goal')}</p>
                <p className="font-semibold text-sm truncate">{formatEnumLabel(profile?.dietaryGoal)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(profile?.allergies?.filter(Boolean) ?? []).map((item: string) => (
                <span key={item} className="medical-badge bg-red-50 text-[10px] text-red-600 border-red-100">
                  {item}
                </span>
              ))}
              {(profile?.dislikedIngredients?.filter(Boolean) ?? []).map((item: string) => (
                <span key={item} className="medical-badge bg-moss-sage/10 text-[10px] text-moss-forest border-moss-sage/20">
                  {item}
                </span>
              ))}
            </div>

            <div className="rounded-2xl bg-terracotta/5 p-4 border border-terracotta/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-terracotta/70 uppercase">{t('recommendations.profile.calorieTarget')}</span>
                <span className="text-xl font-bold text-terracotta">{profile?.dailyCalorieTarget ?? '-'} kcal</span>
              </div>
            </div>
          </div>
        </section>

        <section className="meal-card meal-highlight-frame shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="meal-overline">{t('recommendations.cravings.overline')}</p>
              <h2 className="meal-section-title mt-2 text-3xl">{t('recommendations.cravings.title')}</h2>
            </div>

            <button
              type="button"
              onClick={handleGetRecommendations}
              disabled={recommending || !hasInventory}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-8 py-4 font-bold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.02] hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {recommending ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {recommending ? t('recommendations.cravings.loading') : t('recommendations.cravings.button')}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">
                {t('recommendations.cravings.label')}
              </label>
              <textarea
                rows={4}
                value={cravings}
                onChange={(event) => setCravings(event.target.value)}
                placeholder={t('recommendations.cravings.placeholder')}
                className="base-input px-5 py-4 dark:border-gray-700 dark:bg-gray-800/50"
              />
            </div>

            <div className="rounded-2xl border border-card-border bg-card/50 p-5 dark:border-white/10 dark:bg-espresso-midnight/30">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-terracotta">
                  <ChefHat size={18} />
                </div>
                <p className="font-serif text-lg font-bold">{t('recommendations.cravings.context.title')}</p>
              </div>

              <div className="mt-4 space-y-3 text-sm text-foreground/75 dark:text-white/75">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={14} className="text-red-400" />
                  <span>{t('recommendations.cravings.context.allergens')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Boxes size={14} className="text-ochre-soft" />
                  <span>{t('recommendations.cravings.context.pantry', { count: availableIngredients.length })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Flame size={14} className="text-terracotta" />
                  <span>{cravings.trim() ? t('recommendations.cravings.context.signalActive') : t('recommendations.cravings.context.signalNone')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 4. Alt: Sonuçlar */}
      <section className="mt-8 space-y-6">
        {recommendations.length === 0 ? (
          <div className="meal-card border-dashed border-moss-sage/25 px-8 py-10 text-center shadow-[0_24px_60px_-30px_rgba(40,36,33,0.28)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
              <Sparkles size={28} />
            </div>
            <h3 className="meal-section-title mt-5">{t('recommendations.results.empty.title')}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-espresso-midnight/60 dark:text-alabaster/60">
              {t('recommendations.results.empty.desc')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="meal-overline">{t('recommendations.common.page', { defaultValue: 'Results' })}</p>
                <h2 className="meal-section-title mt-1">{t('recommendations.results.title')}</h2>
              </div>
              <p className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">
                {t('recommendations.results.context', { location: activeGroup?.name || 'Inventory' })}{cravings.trim() ? t('recommendations.results.cravingHighlight', { craving: cravings.trim() }) : '.'}
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
                  <article key={recipe.recipeId} className="meal-card meal-highlight-frame overflow-hidden rounded-[2.8rem] p-0 shadow-[0_24px_70px_-32px_rgba(40,36,33,0.38)]">
                    <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
                      <div className="relative min-h-[300px] overflow-hidden bg-gradient-to-br from-terracotta/90 via-ochre-soft/55 to-alabaster dark:from-terracotta dark:via-terracotta/90 dark:to-espresso-midnight lg:h-full">
                        {recipe.imageUrl ? (
                          <img src={recipe.imageUrl} alt={recipe.recipeTitle} className="absolute inset-0 h-full w-full object-cover" />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-alabaster/95 via-alabaster/35 to-transparent dark:from-espresso-midnight/90 dark:via-espresso-midnight/25 dark:to-transparent" />

                        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                          <span className="match-score-badge text-xs">{t('recommendations.results.pantryFit', { percent: matchPercentage })}</span>
                          {cravings.trim() && (
                            <span className="meal-badge-neon border-card-border bg-white/80 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white">
                              {t('recommendations.results.cravingActive')}
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-5 left-5 right-5">
                          <div className="meal-card rounded-[2rem] border-card-border bg-white/85 p-5 shadow-none dark:border-white/20 dark:bg-white/10">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-foreground-muted dark:text-white/65">{t('recommendations.results.aiPick')}</p>
                            <h3 className="mt-2 font-serif text-3xl font-bold text-foreground dark:text-white">{recipe.recipeTitle}</h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {recipe.matchedIngredients.length > 0 ? (
                                recipe.matchedIngredients.slice(0, 3).map((item: string) => (
                                  <span key={item} className="rounded-full border border-card-border bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-foreground/50 dark:text-white/50 italic">{t('recommendations.results.noMatches')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="meal-overline">{t('recommendations.results.detail')}</p>
                            <h3 className="meal-section-title mt-2">{recipe.recipeTitle}</h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="meal-badge-neon">{t('recommendations.results.insightReady')}</span>
                              <span className="meal-badge-neon border-ochre-soft/20 bg-ochre-soft/10 text-ochre-soft">
                                {recipe.servings ? t('recommendations.results.servings', { count: recipe.servings }) : t('recommendations.results.flexiblePortions')}
                              </span>
                              {recipe.ratingCount ? (
                                <span className="meal-badge-neon border-primary/20 bg-primary/5 text-primary">
                                  {t('recommendations.results.reviews', { count: recipe.ratingCount })}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.calories')}</p>
                              <p className="mt-2 font-semibold text-terracotta">{formatMetric(recipe.calories)}</p>
                            </div>
                            <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.protein')}</p>
                              <p className="mt-2 font-semibold text-moss-forest dark:text-moss-sage">{formatMetric(recipe.protein, 'g')}</p>
                            </div>
                            <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.prep')}</p>
                              <p className="mt-2 font-semibold text-ochre-soft">{formatMetric(recipe.preparationTimeMinutes, 'm')}</p>
                            </div>
                            <div className="meal-metric-card rounded-[1.4rem] px-4 py-3 text-center dark:bg-white/5">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.rating')}</p>
                              <p className="mt-2 inline-flex items-center gap-1 font-semibold text-espresso-midnight dark:text-alabaster">
                                <Star size={14} className="fill-ochre-soft text-ochre-soft" />
                                {recipe.averageRating != null ? recipe.averageRating.toFixed(1) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 items-stretch">
                          <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-none dark:bg-white/5 h-full">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-terracotta/10 p-3 text-terracotta">
                                <MessageSquareText size={18} />
                              </div>
                              <div>
                                <p className="meal-overline tracking-[0.18em]">{t('recommendations.results.insightReady')}</p>
                                <h4 className="mt-1 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{t('recommendations.results.insight.title')}</h4>
                              </div>
                            </div>
                            <p className="mt-4 text-sm leading-7 text-espresso-midnight/70 dark:text-alabaster/70">{recipe.insight}</p>

                            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                              <div className="meal-metric-card border-moss-sage/20 bg-moss-sage/10 px-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-moss-forest/55 dark:text-moss-sage">{t('recommendations.results.insight.pantry')}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {recipe.matchedIngredients.length > 0 ? (
                                    recipe.matchedIngredients.map((item: string) => (
                                      <span key={item} className="medical-badge bg-white/60 border-moss-sage/20 text-moss-forest dark:text-moss-sage">
                                        {item}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">{t('recommendations.results.insight.noPantryMatch')}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-4">
                                <div className="meal-metric-card border-ochre-soft/20 bg-ochre-soft/10 px-4 flex-1">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-soft">{t('recommendations.results.insight.missing')}</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {recipe.missingIngredients.length > 0 ? (
                                      recipe.missingIngredients.map((item: string) => (
                                        <span key={item} className="meal-badge-neon border-ochre-soft/20 bg-white/70 py-1.5 text-[11px] text-espresso-midnight dark:border-ochre-soft/30 dark:bg-white/5 dark:text-alabaster">
                                          {item}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">{t('recommendations.results.insight.missingNone')}</span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCookRecipe(recipe)}
                                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-bold shadow-lg transition-all hover:scale-[1.02] ${
                                    recipe.isCooked 
                                      ? 'bg-moss-sage/20 text-moss-forest border border-moss-sage/30 cursor-default' 
                                      : 'bg-moss-forest text-white hover:bg-moss-forest/90 dark:bg-moss-sage dark:text-espresso-midnight shadow-moss-forest/20'
                                  }`}
                                >
                                  {recipe.isCooked ? <CheckCircle2 size={18} /> : <UtensilsCrossed size={18} />}
                                  {recipe.isCooked 
                                    ? t('recommendations.results.insight.cooked', { defaultValue: 'Bu Tarifi Yaptınız!' }) 
                                    : t('recommendations.results.insight.cook')}
                                </button>
                                {recipe.totalCookCount !== undefined && recipe.totalCookCount > 0 && (
                                  <div className="mt-2 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-espresso-midnight/40 dark:text-alabaster/40">
                                      {t('recommendations.results.insight.usageCount', { count: recipe.totalCookCount, defaultValue: `Bu tarif toplam ${recipe.totalCookCount} kez yapıldı` })}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-none dark:bg-white/5 h-full relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-espresso-midnight/10 p-3 text-espresso-midnight dark:bg-white/10 dark:text-alabaster">
                                <Star size={18} />
                              </div>
                              <div>
                                <p className="meal-overline tracking-[0.18em]">{t('recommendations.results.feedback.overline')}</p>
                                <h4 className="mt-1 font-serif text-2xl font-bold text-espresso-midnight dark:text-alabaster">{t('recommendations.results.feedback.title')}</h4>
                              </div>
                            </div>

                            <div className="mt-5 space-y-5">
                              <div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">{t('recommendations.results.feedback.rating')}</span>
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
                                  <span>{t('recommendations.results.feedback.needsWork')}</span>
                                  <span>{t('recommendations.results.feedback.loveIt')}</span>
                                </div>
                              </div>

                              <label className="block space-y-2">
                                <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">{t('recommendations.results.feedback.comment')}</span>
                                <textarea
                                  rows={4}
                                  value={draft.comment}
                                  onChange={(event) => updateRatingDraft(recipe.recipeId, {
                                    comment: event.target.value,
                                    success: null,
                                    error: null
                                  })}
                                  placeholder={t('recommendations.results.feedback.commentPlaceholder')}
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
                                {draft.saving ? t('recommendations.results.feedback.saving') : t('recommendations.results.feedback.saveButton')}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.carbs')}</p>
                            <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatMetric(recipe.carbs, 'g')}</p>
                          </div>
                          <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.fat')}</p>
                            <p className="mt-2 font-semibold text-espresso-midnight dark:text-alabaster">{formatMetric(recipe.fat, 'g')}</p>
                          </div>
                          <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.matched')}</p>
                            <p className="mt-2 font-semibold text-moss-forest dark:text-moss-sage">{recipe.matchedIngredients.length}</p>
                          </div>
                          <div className="meal-metric-card rounded-[1.5rem] px-4 py-4 dark:bg-white/5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.missing')}</p>
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

      {/* 5. En Alt: Geçmiş Öneriler */}
      <section className="mt-12 space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-espresso-midnight/10 p-3 text-espresso-midnight dark:bg-white/10 dark:text-alabaster">
            <History size={20} />
          </div>
          <div>
            <p className="meal-overline">{t('recommendations.history.overline', { defaultValue: 'Önceki Seçimler' })}</p>
            <h2 className="meal-section-title mt-1 text-2xl">{t('recommendations.history.title', { defaultValue: 'Öneri Geçmişi' })}</h2>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="meal-card border-dashed border-card-border p-8 text-center bg-card/30">
            <p className="text-sm text-foreground-muted italic">{t('recommendations.history.empty', { defaultValue: 'Henüz bir öneri geçmişiniz bulunmuyor.' })}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="meal-card group cursor-pointer border-card-border bg-white/50 p-5 transition-all hover:border-terracotta/30 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                onClick={() => {
                  setRecommendations(item.recommendedRecipes);
                  setCravings(item.cravings || '');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-terracotta uppercase">
                    <Calendar size={12} />
                    {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {item.isAiGenerated && (
                    <div className="rounded-full bg-primary/10 p-1 text-primary" title="AI Tarafından Oluşturuldu">
                      <Cpu size={12} />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-serif text-lg font-bold text-foreground line-clamp-1">
                    {item.recommendedRecipes.map(r => r.recipeTitle).join(', ')}
                  </h4>
                  {item.cravings && (
                    <p className="text-xs text-foreground-muted line-clamp-2 italic">
                      "{item.cravings}"
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-card-border/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                      {t('recommendations.history.recipeCount', { count: item.recommendedRecipes.length, defaultValue: `${item.recommendedRecipes.length} Tarif` })}
                    </span>
                    <span className="text-[10px] font-bold text-terracotta group-hover:underline">
                      {t('recommendations.history.viewDetail', { defaultValue: 'Detayları Gör' })} →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default RecommendationPage;
