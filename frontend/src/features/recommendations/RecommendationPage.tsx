import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Trash2, Loader2, Sparkles, Cpu, Boxes, MapPin, CheckCircle2, ShieldAlert, ChefHat, MessageSquareText, Star, Clock3, History, Calendar, Lock, UtensilsCrossed, Flame, KeyRound } from 'lucide-react';
import { useAuth, type AuthUser } from '../../infrastructure/auth/AuthContext';
import { useUI } from '../../infrastructure/ui/UIContext';
import { useToast } from '../../shared/hooks/useToast';
import { ApiError, NotFoundError } from '../../services/errors';
import { useInventoryService } from '../../services/inventoryService';
import { useRecipeService } from '../../services/recipeService';
import { useUserService } from '../../services/userService';
import { useDefinitions } from '../../infrastructure/ui/DefinitionContext';
import { encryptText, decryptText } from '../../shared/utils/encryption';
import MenuSelectionToggle from './components/MenuSelectionToggle';
import MenuRecommendationTabs from './components/MenuRecommendationTabs';
import { 
  type User, 
  type InventoryGroup, 
  type RecommendedRecipe, 
  type RecipeRatingResponse,
  type Inventory,
  type MenuCourseRecipe,
  type MenuRecommendation,
  type MenuRecommendationHistoryItem,
  type MenuRecommendationResponse,
  RecipeCategory
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
    if (item.quantity == null || item.quantity <= 0) return acc;

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

const getMenuCourseCount = (menus: MenuRecommendation[]): number =>
  menus.reduce((total, menu) => total + Object.values(menu.courses).filter(Boolean).length, 0);

const getMenuCategories = (menus: MenuRecommendation[]): RecipeCategory[] => {
  const categories = new Set<RecipeCategory>();
  menus.forEach((menu) => {
    (Object.keys(menu.courses) as RecipeCategory[]).forEach((category) => {
      if (menu.courses[category]) {
        categories.add(category);
      }
    });
  });
  return Array.from(categories);
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
  const [selectedAiModel, setSelectedAiModel] = useState<string>('FREE');
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>([]);
  const [menuResponse, setMenuResponse] = useState<MenuRecommendationResponse | null>(null);
  const [history, setHistory] = useState<MenuRecommendationHistoryItem[]>([]);
  const [cravings, setCravings] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RecipeCategory[]>([
    RecipeCategory.CORBALAR,
    RecipeCategory.ANA_YEMEKLER,
    RecipeCategory.TATLILAR_VE_PASTALAR
  ]);
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [ratingsByRecipe, setRatingsByRecipe] = useState<Record<number, RecipeRatingResponse>>({});
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, RatingDraft>>({});

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [modalModel, setModalModel] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');

  const availableModels = [
    { id: 'FREE', icon: Sparkles, color: 'bg-moss-forest', requiresApiKey: false },
    { id: 'GPT_OSS', icon: Cpu, color: 'bg-primary', requiresApiKey: true },
    { id: 'GEMINI', icon: Cpu, color: 'bg-terracotta', requiresApiKey: true },
    { id: 'OPENAI', icon: Cpu, color: 'bg-primary', requiresApiKey: true },
    { id: 'CLAUDE', icon: Cpu, color: 'bg-ochre-soft', requiresApiKey: true }
  ];
  const getModelLabel = (modelId: string | null | undefined) => {
    if (!modelId) return '';
    return t(`recommendations.algorithm.models.${modelId.toLowerCase()}`, {
      defaultValue: modelId.replace(/_/g, '-')
    });
  };

  // Sayfa yüklendiğinde API anahtarlarını çözerek yükle ve seçimi koru
  useEffect(() => {
    const loadKeys = async () => {
      const saved = localStorage.getItem('ai-api-keys');
      const savedLastModel = localStorage.getItem('ai-last-selected-model');
      
      if (saved) {
        try {
          const encryptedKeys = JSON.parse(saved);
          const decryptedKeys: Record<string, string> = {};
          
          for (const [model, encryptedValue] of Object.entries(encryptedKeys)) {
            try {
              decryptedKeys[model] = await decryptText(encryptedValue as string);
            } catch (err) {
              console.error(`Failed to decrypt key for ${model}:`, err);
            }
          }
          setApiKeys(decryptedKeys);

          const savedModel = availableModels.find((model) => model.id === savedLastModel);

          // Eğer kaydedilmiş model hala destekleniyorsa seçimi koru
          if (savedLastModel && savedModel && (!savedModel.requiresApiKey || decryptedKeys[savedLastModel])) {
            setSelectedAiModel(savedLastModel);
          }
        } catch (err) {
          console.error('Failed to parse saved API keys:', err);
        }
      }
    };
    void loadKeys();
  }, []);

  const handleOpenApiKeyModal = (model: string) => {
    setModalModel(model);
    setTempKey(apiKeys[model] || '');
  };

  const handleSaveApiKey = async () => {
    if (!modalModel) return;
    
    if (!tempKey || tempKey.trim() === '') {
      showToast(t('recommendations.algorithm.apiKeyModal.required'), 'error');
      return;
    }

    const nextKeys = { ...apiKeys, [modalModel]: tempKey };
    setApiKeys(nextKeys);
    
    // Tüm anahtarları şifreleyerek kaydet
    const encryptedKeys: Record<string, string> = {};
    for (const [model, value] of Object.entries(nextKeys)) {
      encryptedKeys[model] = await encryptText(value);
    }
    
    localStorage.setItem('ai-api-keys', JSON.stringify(encryptedKeys));
    showToast(t('recommendations.algorithm.apiKeyModal.saved'), 'success');
    setModalModel(null);
    setSelectedAiModel(modalModel);
    localStorage.setItem('ai-last-selected-model', modalModel);
  };

  const handleRemoveApiKey = async (model: string) => {
    const nextKeys = { ...apiKeys };
    delete nextKeys[model];
    setApiKeys(nextKeys);
    
    const encryptedKeys: Record<string, string> = {};
    for (const [m, value] of Object.entries(nextKeys)) {
      encryptedKeys[m] = await encryptText(value);
    }
    
    localStorage.setItem('ai-api-keys', JSON.stringify(encryptedKeys));
    if (selectedAiModel === model) {
      setSelectedAiModel('FREE');
      localStorage.setItem('ai-last-selected-model', 'FREE');
    }
  };

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
        recipeService.getMenuRecommendationHistory(user.id).catch((error) => {
          console.error('History load error:', error);
          return [] as MenuRecommendationHistoryItem[];
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

  const refreshRecommendationHistory = async () => {
    if (!user?.id) return;

    try {
      const recommendationHistory = await recipeService.getMenuRecommendationHistory(user.id);
      setHistory(recommendationHistory);
    } catch (error) {
      console.error('History refresh error:', error);
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

    if (selectedCategories.length === 0) {
      showToast(t('toasts.recommendations.menuCategoriesRequired'), 'warning');
      return;
    }

    // Seçilen model için API key kontrolü (FREE hariç)
    const selectedModel = availableModels.find((model) => model.id === selectedAiModel);
    if (selectedModel?.requiresApiKey && !apiKeys[selectedAiModel]) {
      handleOpenApiKeyModal(selectedAiModel);
      return;
    }

    setRecommending(true);

    try {
      console.log('Fetching recommendations for user:', user.id);
      
      // Backend'e şifreli API key gönderiyoruz
      const encryptedApiKey = apiKeys[selectedAiModel] 
        ? await encryptText(apiKeys[selectedAiModel]) 
        : undefined;

      const response = await recipeService.getMenuRecommendations({
        selectedCategories,
        inventoryGroupId: selectedGroupId,
        cravings: cravings.trim() || undefined,
        aiModel: selectedAiModel,
        apiKey: encryptedApiKey
      });

      setMenuResponse(response);
      setRecommendations([]);
      void refreshRecommendationHistory();
      showToast(t('toasts.recommendations.generationSuccess', { count: response.menus.length }), 'success');
    } catch (error) {
      showToast(getErrorMessage(error, t('toasts.recommendations.generationError')), 'error');
      setRecommendations([]);
      setMenuResponse(null);
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
        rating: draft.rating,
        comment: draft.comment.trim() || undefined,
        createdAt: new Date().toISOString()
      } as RecipeRatingResponse;

      setRatingsByRecipe((current) => ({
        ...current,
        [recipe.recipeId]: saved
      }));
      updateRatingDraft(recipe.recipeId, {
        rating: draft.rating,
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
      kcalPerServing: recipe.kcalPerServing,
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

  const markMenuRecipeCookedInState = (recipe: MenuCourseRecipe) => {
    setMenuResponse((current) => {
      if (!current) return current;

      return {
        ...current,
        menus: current.menus.map((menu) => {
          const nextCourses = { ...menu.courses };

          (Object.keys(nextCourses) as RecipeCategory[]).forEach((category) => {
            const course = nextCourses[category];
            const matchesRecommendation = recipe.recommendationRecipeId != null
              && course?.recommendationRecipeId === recipe.recommendationRecipeId;
            const matchesRecipe = course?.recipeId === recipe.recipeId;

            if (course && (matchesRecommendation || matchesRecipe)) {
              nextCourses[category] = {
                ...course,
                isCooked: true,
                totalCookCount: (course.totalCookCount ?? 0) + 1
              };
            }
          });

          return { ...menu, courses: nextCourses };
        })
      };
    });

    setHistory((current) => current.map((item) => ({
      ...item,
      menus: (item.menus ?? []).map((menu) => {
        const nextCourses = { ...menu.courses };

        (Object.keys(nextCourses) as RecipeCategory[]).forEach((category) => {
          const course = nextCourses[category];
          const matchesRecommendation = recipe.recommendationRecipeId != null
            && course?.recommendationRecipeId === recipe.recommendationRecipeId;
          const matchesRecipe = course?.recipeId === recipe.recipeId;

          if (course && (matchesRecommendation || matchesRecipe)) {
            nextCourses[category] = {
              ...course,
              isCooked: true,
              totalCookCount: (course.totalCookCount ?? 0) + 1
            };
          }
        });

        return { ...menu, courses: nextCourses };
      })
    })));
  };

  const handleCookMenuRecipe = async (recipe: MenuCourseRecipe) => {
    if (!recipe.isCooked && recipe.recommendationRecipeId != null) {
      try {
        await recipeService.markAsCooked(recipe.recommendationRecipeId);
        markMenuRecipeCookedInState(recipe);
        showToast(t('toasts.recommendations.cookMarked', { defaultValue: 'Tarif pişirildi olarak işaretlendi ve istatistiklere eklendi!' }), 'success');
      } catch (error) {
        console.error('Menu cook mark error:', error);
      }
    }

    const recipeListItem = {
      id: recipe.recipeId,
      title: recipe.recipeTitle,
      kcalPerServing: recipe.kcalPerServing,
      protein: recipe.proteinPerServing,
      carbs: recipe.carbsPerServing,
      fat: recipe.fatPerServing,
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
      {/* API Key Modal */}
      {modalModel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-espresso-midnight/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="meal-card w-full max-w-md border-card-border shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-2xl font-bold text-foreground">
                {t('recommendations.algorithm.apiKeyModal.title', { model: getModelLabel(modalModel) })}
              </h3>
              <button 
                onClick={() => setModalModel(null)}
                className="rounded-full p-2 text-foreground/40 hover:bg-foreground/5 hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-foreground-muted mb-6 leading-relaxed">
              {t('recommendations.algorithm.apiKeyModal.description', { model: getModelLabel(modalModel) })}
            </p>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder={t('recommendations.algorithm.apiKeyModal.placeholder')}
                  className="base-input px-4 py-3 pr-10"
                  autoFocus
                />
                {tempKey && (
                  <button 
                    onClick={() => setTempKey('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleSaveApiKey}
                  className="meal-button w-full justify-center !py-3 font-bold"
                >
                  {t('recommendations.algorithm.apiKeyModal.save')}
                </button>
                {apiKeys[modalModel] && (
                  <button
                    onClick={() => {
                      handleRemoveApiKey(modalModel);
                      setModalModel(null);
                    }}
                    className="flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest"
                  >
                    <Trash2 size={14} />
                    {t('recommendations.algorithm.apiKeyModal.remove')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                {t('recommendations.hero.subtitle', { model: getModelLabel(selectedAiModel) })}
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

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {availableModels.map((model) => {
              const isLocked = model.requiresApiKey && !apiKeys[model.id];
              const isSelected = selectedAiModel === model.id;
              const hasStoredApiKey = model.requiresApiKey && Boolean(apiKeys[model.id]);
              
              return (
                <div key={model.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        handleOpenApiKeyModal(model.id);
                      } else {
                        setSelectedAiModel(model.id);
                        localStorage.setItem('ai-last-selected-model', model.id);
                      }
                    }}
                    className={`group relative flex h-full w-full items-center justify-between rounded-2xl border p-4 text-sm font-semibold transition-all sm:flex-col sm:items-start sm:gap-4 ${
                      isSelected
                        ? 'border-terracotta bg-terracotta text-white shadow-lg shadow-terracotta/20'
                        : isLocked
                          ? 'border-card-border bg-white/40 text-espresso-midnight/40 dark:border-white/5 dark:bg-white/5 dark:text-alabaster/30 grayscale opacity-80'
                          : 'border-card-border bg-white text-espresso-midnight hover:border-terracotta/50 dark:border-white/10 dark:bg-white/5 dark:text-alabaster'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <model.icon size={16} className={isSelected ? 'text-white' : isLocked ? 'text-foreground/20' : 'text-terracotta'} />
                      {getModelLabel(model.id)}
                    </div>

                    <div className="flex items-center gap-2 sm:absolute sm:right-3 sm:top-3">
                      {isLocked ? (
                        <div className="rounded-full bg-foreground/10 p-1.5 text-foreground/40 dark:bg-white/10 dark:text-white/40">
                          <Lock size={12} />
                        </div>
                      ) : null}
                    </div>

                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/0 opacity-0 group-hover:bg-white/5 group-hover:opacity-100 transition-all rounded-2xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-terracotta bg-white px-2 py-1 rounded shadow-sm border border-terracotta/20">
                          {t('recommendations.algorithm.apiKeyRequired')}
                        </span>
                      </div>
                    )}
                  </button>
                  {hasStoredApiKey && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenApiKeyModal(model.id);
                      }}
                      title={t('recommendations.algorithm.changeApiKey')}
                      aria-label={t('recommendations.algorithm.changeApiKey')}
                      className={`absolute right-3 top-3 rounded-full border p-1.5 transition-colors ${
                        isSelected
                          ? 'border-white/20 bg-white/20 text-white hover:bg-white/30'
                          : 'border-card-border bg-white text-terracotta hover:border-terracotta/40 hover:bg-terracotta/5 dark:border-white/10 dark:bg-espresso-midnight/80 dark:text-alabaster dark:hover:bg-white/10'
                      }`}
                    >
                      <KeyRound size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl bg-primary/5 p-4 border border-primary/10">
            <p className="text-[11px] leading-relaxed text-primary/80">
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

          <div className="mt-6">
            <MenuSelectionToggle
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>
        </section>
      </div>

      {/* 4. Alt: Sonuçlar */}
      <section className="mt-8 space-y-6">
        {menuResponse?.menus.length ? (
          <MenuRecommendationTabs
            menus={menuResponse.menus}
            isAiGenerated={menuResponse.isAiGenerated}
            onCookRecipe={handleCookMenuRecipe}
          />
        ) : recommendations.length === 0 ? (
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
                  <article key={recipe.recipeId} className="meal-card meal-highlight-frame overflow-hidden rounded-[2rem] p-0 shadow-[0_24px_70px_-36px_rgba(40,36,33,0.38)]">
                    <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)]">
                      <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-terracotta/85 via-ochre-soft/45 to-moss-sage/30 dark:from-terracotta/90 dark:via-espresso-midnight dark:to-moss-forest/60 xl:min-h-full">
                        {recipe.imageUrl ? (
                          <img src={recipe.imageUrl} alt={recipe.recipeTitle} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ChefHat size={88} className="text-terracotta" strokeWidth={1.4} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-espresso-midnight/80 via-espresso-midnight/20 to-transparent" />

                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-terracotta shadow-sm backdrop-blur-md dark:bg-espresso-midnight/75 dark:text-alabaster">
                            <Sparkles size={13} />
                            {t('recommendations.results.aiPick')}
                          </span>
                          {cravings.trim() && (
                            <span className="inline-flex items-center rounded-full border border-white/25 bg-espresso-midnight/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-md">
                              {t('recommendations.results.cravingActive')}
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                          <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/65">{t('recommendations.results.pantryFit', { percent: matchPercentage })}</p>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                              <div
                                className="h-full rounded-full bg-terracotta shadow-[0_0_24px_rgba(226,114,91,0.55)]"
                                style={{ width: `${matchPercentage}%` }}
                              />
                            </div>
                          </div>

                          <h3 className="font-serif text-3xl font-bold leading-tight text-white">{recipe.recipeTitle}</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {recipe.matchedIngredients.length > 0 ? (
                              recipe.matchedIngredients.slice(0, 3).map((item: string) => (
                                <span key={item} className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                                  {item}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs italic text-white/70">{t('recommendations.results.noMatches')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5 p-5 lg:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="meal-overline">{t('recommendations.results.detail')}</p>
                            <h3 className="mt-1 font-serif text-2xl font-bold leading-snug text-foreground dark:text-white">{recipe.recipeTitle}</h3>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="meal-badge-neon !px-3 !py-1.5 text-[10px] font-bold">{t('recommendations.results.insightReady')}</span>
                              <span className="meal-badge-neon !px-3 !py-1.5 text-[10px] border-ochre-soft/20 bg-ochre-soft/10 font-bold text-ochre-soft">
                                {recipe.servings ? t('recommendations.results.servings', { count: recipe.servings }) : t('recommendations.results.flexiblePortions')}
                              </span>
                              {recipe.ratingCount ? (
                                <span className="meal-badge-neon !px-3 !py-1.5 text-[10px] border-primary/20 bg-primary/5 font-bold text-primary">
                                  {t('recommendations.results.reviews', { count: recipe.ratingCount })}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-[460px]">
                            {[
                              { label: t('recommendations.results.metrics.kcalPerServing'), value: formatMetric(recipe.kcalPerServing), tone: 'text-terracotta' },
                              { label: t('recommendations.results.metrics.protein'), value: formatMetric(recipe.protein, 'g'), tone: 'text-moss-forest dark:text-moss-sage' },
                              { label: t('recommendations.results.metrics.prep'), value: formatMetric(recipe.preparationTimeMinutes, 'm'), tone: 'text-ochre-soft' },
                              { label: t('recommendations.results.metrics.rating'), value: recipe.averageRating != null ? recipe.averageRating.toFixed(1) : '-', tone: 'text-espresso-midnight dark:text-alabaster', icon: true }
                            ].map((metric) => (
                              <div key={metric.label} className="rounded-2xl border border-card-border bg-white/55 px-3 py-3 text-center dark:border-white/10 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-espresso-midnight/35 dark:text-alabaster/35">{metric.label}</p>
                                <p className={`mt-1 inline-flex items-center justify-center gap-1 font-bold ${metric.tone}`}>
                                  {metric.icon && <Star size={12} className="fill-ochre-soft text-ochre-soft" />}
                                  {metric.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-card-border bg-white/55 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-2xl bg-terracotta/10 p-2 text-terracotta">
                              <MessageSquareText size={18} />
                            </div>
                            <div>
                              <p className="meal-overline tracking-[0.18em]">{t('recommendations.results.insightReady')}</p>
                              <h4 className="mt-1 font-serif text-xl font-bold text-espresso-midnight dark:text-alabaster">{t('recommendations.results.insight.title')}</h4>
                              <p className="mt-3 text-sm leading-7 text-espresso-midnight/70 dark:text-alabaster/70">{recipe.insight}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="rounded-[1.5rem] border border-moss-sage/20 bg-moss-sage/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-moss-forest/60 dark:text-moss-sage">{t('recommendations.results.insight.pantry')}</p>
                                  <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-bold text-moss-forest dark:bg-white/10 dark:text-moss-sage">{recipe.matchedIngredients.length}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {recipe.matchedIngredients.length > 0 ? (
                                    recipe.matchedIngredients.map((item: string) => (
                                      <span key={item} className="medical-badge bg-white/70 border-moss-sage/20 text-moss-forest dark:bg-white/5 dark:text-moss-sage">
                                        {item}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">{t('recommendations.results.insight.noPantryMatch')}</span>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-[1.5rem] border border-ochre-soft/20 bg-ochre-soft/10 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ochre-soft">{t('recommendations.results.insight.missing')}</p>
                                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-espresso-midnight dark:bg-white/10 dark:text-alabaster">{recipe.missingIngredients.length}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {recipe.missingIngredients.length > 0 ? (
                                    recipe.missingIngredients.map((item: string) => (
                                      <span key={item} className="rounded-full border border-ochre-soft/20 bg-white/70 px-2.5 py-1 text-[10px] font-bold text-espresso-midnight dark:border-ochre-soft/30 dark:bg-white/5 dark:text-alabaster">
                                        {item}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-sm text-espresso-midnight/55 dark:text-alabaster/55">{t('recommendations.results.insight.missingNone')}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="rounded-2xl border border-card-border bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.carbs')}</p>
                                <p className="mt-1 font-bold text-espresso-midnight dark:text-alabaster">{formatMetric(recipe.carbs, 'g')}</p>
                              </div>
                              <div className="rounded-2xl border border-card-border bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.fat')}</p>
                                <p className="mt-1 font-bold text-espresso-midnight dark:text-alabaster">{formatMetric(recipe.fat, 'g')}</p>
                              </div>
                              <div className="rounded-2xl border border-card-border bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.matched')}</p>
                                <p className="mt-1 font-bold text-moss-forest dark:text-moss-sage">{recipe.matchedIngredients.length}</p>
                              </div>
                              <div className="rounded-2xl border border-card-border bg-white/45 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-espresso-midnight/35 dark:text-alabaster/35">{t('recommendations.results.metrics.missing')}</p>
                                <p className="mt-1 inline-flex items-center gap-1.5 font-bold text-espresso-midnight dark:text-alabaster">
                                  <Clock3 size={12} className="text-ochre-soft" />
                                  {recipe.missingIngredients.length}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCookRecipe(recipe)}
                              className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] px-5 py-3 font-bold shadow-md transition-all hover:-translate-y-0.5 ${
                                recipe.isCooked
                                  ? 'border border-moss-sage/30 bg-moss-sage/20 text-moss-forest dark:text-moss-sage'
                                  : 'bg-moss-forest text-white shadow-moss-forest/20 hover:bg-moss-forest/90 dark:bg-moss-sage dark:text-espresso-midnight'
                              }`}
                            >
                              {recipe.isCooked ? <CheckCircle2 size={18} /> : <UtensilsCrossed size={18} />}
                              {recipe.isCooked
                                ? t('recommendations.results.insight.cooked', { defaultValue: 'Bu Tarifi Yaptınız!' })
                                : t('recommendations.results.insight.cook')}
                            </button>
                            {recipe.totalCookCount !== undefined && recipe.totalCookCount > 0 && (
                              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-espresso-midnight/40 dark:text-alabaster/40">
                                {t('recommendations.results.insight.usageCount', { count: recipe.totalCookCount, defaultValue: `Bu tarif toplam ${recipe.totalCookCount} kez yapıldı` })}
                              </p>
                            )}
                          </div>

                          <div className="rounded-[1.75rem] border border-card-border bg-white/55 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-espresso-midnight/10 p-2 text-espresso-midnight dark:bg-white/10 dark:text-alabaster">
                                <Star size={17} />
                              </div>
                              <div>
                                <p className="meal-overline tracking-[0.18em]">{t('recommendations.results.feedback.overline')}</p>
                                <h4 className="mt-1 font-serif text-lg font-bold text-espresso-midnight dark:text-alabaster">{t('recommendations.results.feedback.title')}</h4>
                              </div>
                            </div>

                            <div className="mt-4 space-y-4">
                              <div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-alabaster/80">{t('recommendations.results.feedback.rating')}</span>
                                  <span className="rounded-full bg-terracotta px-3 py-1 text-sm font-bold text-white shadow-sm">{draft.rating}/10</span>
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
                                <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-espresso-midnight/35 dark:text-alabaster/35">
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
                                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-espresso-midnight px-4 py-3 font-semibold text-white transition-all hover:bg-espresso-midnight/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-terracotta"
                              >
                                {draft.saving ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                                {draft.saving ? t('recommendations.results.feedback.saving') : t('recommendations.results.feedback.saveButton')}
                              </button>
                            </div>
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
            {history.map((item) => {
              const menus = item.menus ?? [];
              const courseCount = getMenuCourseCount(menus);
              const title = menus[0]?.title || t('recommendations.history.menuFallbackTitle', { defaultValue: 'Akıllı Menü' });

              return (
                <div 
                  key={item.id} 
                  className="meal-card group cursor-pointer border-card-border bg-white/50 p-5 transition-all hover:border-terracotta/30 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                  onClick={() => {
                    setRecommendations([]);
                    setMenuResponse({
                      generatedAt: item.createdAt,
                      isAiGenerated: item.isAiGenerated,
                      menus
                    });
                    const historyCategories = getMenuCategories(menus);
                    if (historyCategories.length > 0) {
                      setSelectedCategories(historyCategories);
                    }
                    setCravings(item.cravings || '');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-terracotta">
                      <Calendar size={12} />
                      {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-moss-sage/20 bg-moss-sage/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-moss-forest dark:text-moss-sage">
                        {t('recommendations.history.menuBadge', { defaultValue: 'Menü' })}
                      </span>
                      {item.isAiGenerated && (
                        <div className="rounded-full bg-primary/10 p-1 text-primary" title={t('recommendations.history.aiTitle', { defaultValue: 'AI Tarafından Oluşturuldu' })}>
                          <Cpu size={12} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="line-clamp-1 font-serif text-lg font-bold text-foreground">
                      {title}
                    </h4>
                    {item.cravings && (
                      <p className="line-clamp-2 text-xs italic text-foreground-muted">
                        "{item.cravings}"
                      </p>
                    )}
                    <div className="flex items-center justify-between border-t border-card-border/50 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                        {t('recommendations.history.menuCount', {
                          count: menus.length,
                          courses: courseCount,
                          defaultValue: `${menus.length} Menü / ${courseCount} Tarif`
                        })}
                      </span>
                      <span className="text-[10px] font-bold text-terracotta group-hover:underline">
                        {t('recommendations.history.viewDetail', { defaultValue: 'Detayları Gör' })} →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default RecommendationPage;
