import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChefHat,
  Clock3,
  Cpu,
  Flame,
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
  type Inventory
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
  const navigate = useNavigate();
  const { user, authenticated } = useAuth();
  const { openConsumption } = useUI();
  const userService = useUserService();
  const inventoryService = useInventoryService();
  const recipeService = useRecipeService();
  useDefinitions();

  const [profile, setProfile] = useState<User | null>(null);
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedAiModel, setSelectedAiModel] = useState<string>('GEMINI');
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>([]);
  const [cravings, setCravings] = useState('');
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

    setPageError(null);

    try {
      // 1. Profil verilerini yukle
      try {
        const nextProfile = await loadProfile(user, userService);
        setProfile(nextProfile);
      } catch (err) {
        console.error('Profile load error:', err);
        // Profil kritik degilse devam edebiliriz ama genelde kritiktir
      }

      // 2. Envanter ve Rating verilerini paralel yukle
      const [inventoryGroups, userRatings] = await Promise.all([
        inventoryService.getInventoryGroups().catch((err) => {
          console.error('Inventory groups load error:', err);
          return [] as InventoryGroup[];
        }),
        recipeService.getRatingsByUser(user.id).catch((error) => {
          console.error('Ratings load error:', error);
          return [] as RecipeRatingResponse[];
        })
      ]);

      const nextRatings = userRatings.reduce<Record<number, RecipeRatingResponse>>((acc: Record<number, RecipeRatingResponse>, rating: RecipeRatingResponse) => {
        acc[rating.recipeId] = rating;
        return acc;
      }, {});

      setGroups(inventoryGroups);
      setRatingsByRecipe(nextRatings);
      
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
      setPageError(getErrorMessage(error, 'Recommendation verileri yuklenemedi.'));
    } finally {
      setLoading(false);
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
      console.log('Fetching recommendations for user:', user.id);
      const response = await recipeService.getRecommendations({
        userId: user.id,
        availableIngredients,
        cravings: cravings.trim() || undefined,
        aiModel: selectedAiModel
      });

      setRecommendations(response.recommendedRecipes);
      setRatingDrafts((current: Record<number, RatingDraft>) => {
        const nextDrafts = { ...current };

        response.recommendedRecipes.forEach((recipe: RecommendedRecipe) => {
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

  const handleCookRecipe = (recipe: RecommendedRecipe) => {
    // Convert RecommendedRecipe to RecipeListItem for SmartConsumptionPanel
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
      <header className="relative overflow-hidden rounded-[2.9rem] bg-card px-8 py-8 text-foreground shadow-[0_30px_90px_-36px_rgba(40,36,33,0.18)] meal-highlight-frame dark:bg-espresso-midnight dark:text-white dark:shadow-[0_30px_90px_-36px_rgba(40,36,33,0.78)]">
        <div className="absolute inset-0 pointer-events-none opacity-75 dark:opacity-100">
          <div className="absolute -top-16 right-0 h-56 w-56 rounded-full bg-terracotta/25 blur-[100px] dark:bg-terracotta/35" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-moss-sage/15 blur-[100px] dark:bg-moss-sage/20" />
        </div>
        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary dark:border-white/10 dark:bg-white/5 dark:text-alabaster/80">
              <Sparkles size={14} className="text-terracotta" />
              AI Recommendation Engine
            </div>
            <div>
              <h1 className="font-serif text-4xl font-bold leading-tight text-foreground dark:text-white sm:text-5xl">Canin ne cekiyorsa onu veriye bagla.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-foreground-muted dark:text-alabaster/70 sm:text-lg">
                Profilindeki sert kisitlar, sevmediklerin, sectigin inventory lokasyonu ve bugunku craving sinyalin tek prompt icinde {selectedAiModel.charAt(0) + selectedAiModel.slice(1).toLowerCase()}&apos;ye tasinir.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="rounded-[2rem] border border-card-border bg-white/70 px-5 py-4 text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground-muted dark:text-alabaster/40">Aktif Lokasyon</p>
              <p className="mt-2 font-serif text-3xl font-bold text-foreground dark:text-white">{activeGroup?.name || 'Seçilmedi'}</p>
            </div>
            <div className="rounded-[2rem] border border-card-border bg-white/70 px-5 py-4 text-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground-muted dark:text-alabaster/40">Malzemeler</p>
              <p className="mt-2 font-serif text-3xl font-bold text-foreground dark:text-white">{availableIngredients.length}</p>
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

      {/* 2. Orta-Üst: Envanter ve AI Model Seçimi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="meal-card meal-highlight-frame shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-moss-sage/10 p-3 text-moss-forest dark:text-moss-sage">
              <Boxes size={20} />
            </div>
            <div>
              <p className="meal-overline">Lokasyon ve Envanter</p>
              <h2 className="meal-section-title mt-1 text-2xl">Envanter Seçimi</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-espresso-midnight/35 dark:text-alabaster/35 flex items-center gap-2">
              <MapPin size={12} /> Kayıtlı Lokasyonlar
            </p>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groups.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-card-border p-4 text-center">
                  <p className="text-sm text-foreground-muted italic">Henüz lokasyon bulunamadı.</p>
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
                        <Boxes size={12} /> {group.itemCount || 0} Malzeme
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {activeGroup && inventorySummary && (
              <div className="mt-4 grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300">
                <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                  <p className="text-[10px] uppercase font-bold text-primary/60">Kategoriler</p>
                  <p className="text-2xl font-bold text-primary">{inventorySummary.categories}</p>
                </div>
                <div className="rounded-2xl bg-terracotta/5 p-4 border border-terracotta/10">
                  <p className="text-[10px] uppercase font-bold text-terracotta/60">Azalan Stok</p>
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
              <p className="meal-overline">Algoritma Ayarları</p>
              <h2 className="meal-section-title mt-1 text-2xl">Yapay Zeka Modeli</h2>
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
              Seçilen model, kişisel tercihleriniz ve envanter durumunuzu analiz ederek en uygun tarifleri hazırlar.
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
                <p className="meal-overline">Kullanıcı Bilgileri</p>
                <h2 className="meal-section-title mt-1 text-2xl">{buildDisplayName(user) || 'Chef AI'}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-xl bg-espresso-midnight p-2 text-white hover:bg-espresso-midnight/90 dark:bg-terracotta"
              title="Profili Düzenle"
            >
              <ChefHat size={18} />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/50 p-3 border border-card-border dark:bg-white/5">
                <p className="text-[10px] uppercase font-bold opacity-50">Diyet Tipi</p>
                <p className="font-semibold text-sm truncate">{profile?.dietType ? formatEnumLabel(profile.dietType) : 'Normal'}</p>
              </div>
              <div className="rounded-2xl bg-white/50 p-3 border border-card-border dark:bg-white/5">
                <p className="text-[10px] uppercase font-bold opacity-50">Hedef</p>
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
                <span className="text-xs font-bold text-terracotta/70 uppercase">Günlük Kalori Hedefi</span>
                <span className="text-xl font-bold text-terracotta">{profile?.dailyCalorieTarget ?? '-'} kcal</span>
              </div>
            </div>
          </div>
        </section>

        <section className="meal-card meal-highlight-frame shadow-[0_24px_60px_-30px_rgba(40,36,33,0.38)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="meal-overline">Get Recommendation</p>
              <h2 className="meal-section-title mt-2 text-3xl">Final craving sinyalini ekle.</h2>
            </div>

            <button
              type="button"
              onClick={handleGetRecommendations}
              disabled={recommending || !hasInventory}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-terracotta px-8 py-4 font-bold text-white shadow-xl shadow-terracotta/25 transition-all hover:scale-[1.02] hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {recommending ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {recommending ? 'AI Düşünüyor...' : 'Önerileri Al'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">
                Bugün özellikle canınızın çektiği bir şey var mı?
              </label>
              <textarea
                rows={4}
                value={cravings}
                onChange={(event) => setCravings(event.target.value)}
                placeholder='Örn: "Hafif bir akşam yemeği", "Yüksek proteinli", "Asya mutfağı"'
                className="base-input px-5 py-4 dark:border-gray-700 dark:bg-gray-800/50"
              />
            </div>

            <div className="rounded-2xl border border-card-border bg-card/50 p-5 dark:border-white/10 dark:bg-espresso-midnight/30">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-terracotta">
                  <ChefHat size={18} />
                </div>
                <p className="font-serif text-lg font-bold">Context Summary</p>
              </div>

              <div className="mt-4 space-y-3 text-sm text-foreground/75 dark:text-white/75">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={14} className="text-red-400" />
                  <span>Alerjenler kesin kısıt olarak uygulanır.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Boxes size={14} className="text-ochre-soft" />
                  <span>{availableIngredients.length} malzeme önceliklendirilir.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Flame size={14} className="text-terracotta" />
                  <span>{cravings.trim() ? 'Özel craving sinyali aktif.' : 'Ek sinyal eklenmedi.'}</span>
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
            <h3 className="meal-section-title mt-5">Recommendation sonuçları burada belirecek.</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-espresso-midnight/60 dark:text-alabaster/60">
              Seçtiğin inventory lokasyonu ve kullanıcı profilinle birlikte son craving sinyalini gönderdiğinde, her tarif için neden seçildiğini anlatan AI insight kartları oluşturacağız.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="meal-overline">Results</p>
                <h2 className="meal-section-title mt-1">AI tarafından seçilen tarifler</h2>
              </div>
              <p className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">
                {activeGroup?.name || 'Inventory'} lokasyonu baz alındı{cravings.trim() ? ` ve "${cravings.trim()}" craving'i vurgulandı.` : '.'}
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
                          <span className="match-score-badge text-xs">{matchPercentage}% pantry fit</span>
                          {cravings.trim() && (
                            <span className="meal-badge-neon border-card-border bg-white/80 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white">
                              Craving active
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-5 left-5 right-5">
                          <div className="meal-card rounded-[2rem] border-card-border bg-white/85 p-5 shadow-none dark:border-white/20 dark:bg-white/10">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-foreground-muted dark:text-white/65">AI Pick</p>
                            <h3 className="mt-2 font-serif text-3xl font-bold text-foreground dark:text-white">{recipe.recipeTitle}</h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {recipe.matchedIngredients.length > 0 ? (
                                recipe.matchedIngredients.slice(0, 3).map((item: string) => (
                                  <span key={item} className="rounded-full border border-card-border bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-foreground/50 dark:text-white/50 italic">No direct pantry matches</span>
                              )}
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
                              {recipe.ratingCount ? (
                                <span className="meal-badge-neon border-primary/20 bg-primary/5 text-primary">
                                  {recipe.ratingCount} reviews
                                </span>
                              ) : null}
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

                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 items-stretch">
                          <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-none dark:bg-white/5 h-full">
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
                                    recipe.matchedIngredients.map((item: string) => (
                                      <span key={item} className="medical-badge bg-white/60 border-moss-sage/20 text-moss-forest dark:text-moss-sage">
                                        {item}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">Bu tarif daha cok hedef ve craving uyumundan secildi.</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-4">
                                <div className="meal-metric-card border-ochre-soft/20 bg-ochre-soft/10 px-4 flex-1">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-soft">Might still need</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {recipe.missingIngredients.length > 0 ? (
                                      recipe.missingIngredients.map((item: string) => (
                                        <span key={item} className="meal-badge-neon border-ochre-soft/20 bg-white/70 py-1.5 text-[11px] text-espresso-midnight dark:border-ochre-soft/30 dark:bg-white/5 dark:text-alabaster">
                                          {item}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">Bu tarifi neredeyse tamamen mevcut stock ile kurabiliyorsun.</span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCookRecipe(recipe)}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-moss-forest px-4 py-3.5 font-bold text-white shadow-lg shadow-moss-forest/20 transition-all hover:scale-[1.02] hover:bg-moss-forest/90 dark:bg-moss-sage dark:text-espresso-midnight"
                                >
                                  <UtensilsCrossed size={18} />
                                  Bu Tarifi Yap
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="meal-card rounded-[2rem] bg-white/65 p-5 shadow-none dark:bg-white/5 h-full relative z-10">
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
  );
};

export default RecommendationPage;
