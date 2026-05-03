import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Search, Filter, Clock, Star, ChevronRight, Plus, ChefHat, Flame, X, Info, Edit3, Users } from 'lucide-react';
import { useRecipeService } from '../../services/recipeService';
import type { RecipeListItem } from '../../types';
import { useToast } from '../../shared/hooks/useToast';
import { useAuth } from '../../infrastructure/auth/AuthContext';
import { useUI } from '../../infrastructure/ui/UIContext';

type RecipeArtworkProps = {
  imageUrl?: string | null;
  title: string;
  variant?: 'card' | 'hero';
  className?: string;
  mediaClassName?: string;
};

const RecipeArtwork: React.FC<RecipeArtworkProps> = ({
  imageUrl,
  title,
  variant = 'card',
  className = '',
  mediaClassName = ''
}) => {
  const { t } = useTranslation();
  const normalizedImageUrl = imageUrl?.trim() || null;
  const [hasImageError, setHasImageError] = useState(false);
  const isHero = variant === 'hero';

  useEffect(() => {
    setHasImageError(false);
  }, [normalizedImageUrl]);

  if (!hasImageError && normalizedImageUrl) {
    return (
      <div className={className}>
        <img
          key={normalizedImageUrl}
          src={normalizedImageUrl}
          alt={title}
          className={mediaClassName}
          onError={() => setHasImageError(true)}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={t('recipes.defaultImageAlt', { title })}
        className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-alabaster via-white to-terracotta/10 dark:from-espresso-midnight dark:via-espresso-midnight dark:to-terracotta/20 ${mediaClassName}`}
      >
        <div className="absolute inset-0">
          <div className="absolute -left-8 top-6 h-28 w-28 rounded-full bg-terracotta/20 blur-3xl dark:bg-terracotta/25" />
          <div className="absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-moss-sage/25 blur-3xl dark:bg-moss-sage/20" />
          <div className="absolute left-8 right-8 top-8 h-px bg-terracotta/15 dark:bg-white/10" />
          <div className="absolute left-10 right-10 bottom-8 h-px bg-espresso-midnight/8 dark:bg-white/8" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <div
            className={`flex items-center justify-center rounded-[1.8rem] border border-white/50 bg-white/70 text-terracotta shadow-lg shadow-terracotta/10 backdrop-blur-md dark:border-white/10 dark:bg-white/5 ${
              isHero ? 'h-20 w-20' : 'h-16 w-16'
            }`}
          >
            <ChefHat size={isHero ? 40 : 30} strokeWidth={1.8} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-espresso-midnight/35 dark:text-alabaster/35">
              MealAI
            </p>
            <p
              className={`font-serif font-bold text-espresso-midnight/70 dark:text-alabaster/70 ${
                isHero ? 'text-2xl' : 'text-lg'
              }`}
            >
              {t('recipes.chefTouch')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecipeRating: React.FC<{ 
  recipeId: number; 
  initialRating?: number;
  averageRating?: number;
  ratingCount?: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
  showText?: boolean;
}> = ({ recipeId, initialRating = 0, averageRating, ratingCount = 0, onRate, readOnly = false, size = 20, showText = true }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [rating, setRating] = useState(initialRating);
  const { user } = useAuth();
  const recipeService = useRecipeService();
  const { showToast } = useToast();

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleRate = async (value: number) => {
    if (readOnly || !user) return;
    
    const oldRating = rating;
    setRating(value);

    try {
      await recipeService.rateRecipe({
        recipeId,
        userId: user.id,
        rating: value * 2,
        comment: ''
      });
      if (onRate) onRate(value);
      showToast('Puanınız kaydedildi.', 'success');
    } catch (err: any) {
      setRating(oldRating);
      showToast(err.message || 'Puan kaydedilemedi.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation();
              handleRate(star);
            }}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(null)}
            className={`transition-all duration-200 ${readOnly ? 'cursor-default' : 'hover:scale-125 active:scale-95'}`}
          >
            <Star
              size={size}
              className={`${
                star <= (hover || rating)
                  ? 'text-terracotta fill-terracotta'
                  : 'text-espresso-midnight/10 dark:text-white/10'
              } transition-colors`}
              strokeWidth={2}
            />
          </button>
        ))}
        {averageRating !== undefined && showText && (
          <span className="ml-2 text-xs font-bold text-foreground-muted">
            ({averageRating.toFixed(1)}) <span className="font-normal opacity-60 ml-0.5">• {ratingCount} oy</span>
          </span>
        )}
      </div>
      {rating > 0 && !readOnly && showText && (
        <p className="text-[10px] font-black uppercase tracking-widest text-terracotta">Puanınız: {rating}/5</p>
      )}
    </div>
  );
};

/**
 * MealAI Recipe Explorer - Custom Toast & Portal Integrated
 */
const RecipeList: React.FC = () => {
  const { t } = useTranslation();
  const recipeService = useRecipeService();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { openRecipeModal, isRecipeModalOpen } = useUI();

  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');


  // --- Modal States ---
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [recipeDetail, setRecipeDetail] = useState<any>(null);

  const size = 12;
  const debouncedSearch = useDebounce(searchTerm, 400);
  const lastQueryRef = useRef<string>('');

  const handleToggleFavorite = async (recipeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('Favorilere eklemek için giriş yapmalısınız.', 'info');
      return;
    }

    try {
      const isFav = await recipeService.toggleFavorite(recipeId);
      
      // Update local state
      setRecipes(prev => prev.map(r => 
        r.id === recipeId ? { ...r, isFavorite: isFav } : r
      ));
      
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe({ ...selectedRecipe, isFavorite: isFav });
      }
      
      if (recipeDetail?.id === recipeId) {
        setRecipeDetail({ ...recipeDetail, isFavorite: isFav });
      }

      showToast(isFav ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.', 'success');
    } catch (err) {
      showToast('İşlem başarısız oldu.', 'error');
    }
  };

  // Fetch List Data
  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      const queryKey = `${debouncedSearch ?? ''}|${page}|${size}|${user?.id || 'anonymous'}`;
      if (lastQueryRef.current === queryKey) return;

      lastQueryRef.current = queryKey;
      setLoading(true);

      try {
        const data = await recipeService.getRecipes({
          title: debouncedSearch || undefined,
          page,
          size,
          signal: abortController.signal
        });
        if (mounted) setRecipes(data);
      } catch (e: any) {
        if (mounted && e?.name !== 'CanceledError' && e?.name !== 'AbortError') {
          // Profil sayfasındaki toast kullanımınıza göre (success/error/info)
          showToast(e?.message || t('toasts.recipes.loadError'), 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [debouncedSearch, page, recipeService, showToast, user?.id]);

  useEffect(() => {
    if (!isRecipeModalOpen && lastQueryRef.current) {
        // Force refresh if modal closed (might have added/edited)
        lastQueryRef.current = '';
        // Bu useEffect bağımlılıkları değişince zaten yukarıdaki fetchData'yı tetikleyecek queryKey değiştiği için
        // ama explicit çağırmak yerine lastQueryRef'i temizlemek yeterli.
        setPage(0); // Veya mevcut sayfayı tetiklemek için state güncellemesi
    }
  }, [isRecipeModalOpen]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // --- Modal Handlers ---
  const handleOpenDetail = async (recipe: RecipeListItem) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const details = await recipeService.getRecipeById(recipe.id);
      setRecipeDetail(details);
      // Sync favorite state from details if it differs (though details should be most fresh)
      if (details && details.isFavorite !== undefined) {
        const isFav = details.isFavorite;
        setRecipes(prev => prev.map(r => 
          r.id === recipe.id ? { ...r, isFavorite: isFav } : r
        ));
        setSelectedRecipe(prev => {
          if (!prev) return null;
          return { ...prev, isFavorite: isFav, imageUrl: details.imageUrl, status: details.status };
        });
      }
    } catch (err: any) {
      showToast(err?.message || t('toasts.recipes.detailsError'), 'error');
      handleCloseModal();
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedRecipe(null);
      setRecipeDetail(null);
    }, 300);
  };

  const categories = [
    { key: 'all', label: t('recipes.categories.all') },
    { key: 'main', label: t('recipes.categories.main') },
    { key: 'breakfast', label: t('recipes.categories.breakfast') },
    { key: 'salad', label: t('recipes.categories.salad') },
    { key: 'dessert', label: t('recipes.categories.dessert') },
    { key: 'fit', label: t('recipes.categories.fit') },
  ];

  return (
      <div className="relative space-y-8 animate-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-moss-sage/10 text-moss-forest dark:text-moss-sage px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              <ChefHat size={12} />
              <span>{t('recipes.curatorPicks')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-espresso-midnight dark:text-white tracking-tight leading-tight">
              {t('recipes.libraryTitlePart1')} <span className="text-terracotta italic font-normal">{t('recipes.libraryTitlePart2')}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 glass-card rounded-2xl text-sm font-bold border-card-border hover:text-terracotta transition-all">
              <Filter size={18} /> Filtrele
            </button>
            <button 
              onClick={() => openRecipeModal()}
              className="flex items-center gap-2 px-6 py-3 bg-terracotta text-white rounded-2xl text-sm font-bold shadow-brand-hero hover:scale-105 transition-all"
            >
              <Plus size={18} /> {t('recipes.newRecipe')}
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-espresso-midnight/30 group-focus-within:text-terracotta transition-colors" size={22} />
          <input
              type="text"
              placeholder={t('recipes.searchPlaceholder')}
              className="w-full pl-16 pr-6 py-5 bg-white dark:bg-white/[0.03] border border-card-border rounded-[2rem] shadow-brand-card focus:border-terracotta text-espresso-midnight dark:text-white text-lg transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat) => (
              <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-8 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                      activeCategory === cat.key
                          ? 'bg-espresso-midnight dark:bg-terracotta text-white shadow-brand-hero scale-105'
                          : 'bg-white dark:bg-white/5 text-espresso-midnight/50 dark:text-white/40 border border-card-border hover:border-terracotta/50'
                  }`}
              >
                {cat.label}
              </button>
          ))}
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && <div className="col-span-full py-20 text-center italic text-foreground-muted animate-pulse">Lezzetler yükleniyor...</div>}

          {!loading && recipes.map((recipe) => (
              <div
                  key={recipe.id}
                  onClick={() => handleOpenDetail(recipe)}
                  className="group meal-card cursor-pointer rounded-[2.5rem] overflow-hidden border border-card-border hover:-translate-y-2 transition-all duration-500 bg-white dark:bg-white/[0.02]"
              >
                <div className="h-64 relative overflow-hidden">
                  <RecipeArtwork
                    imageUrl={recipe.imageUrl}
                    title={recipe.title}
                    className="h-full w-full"
                    mediaClassName="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.04]"
                  />
                  <div className="absolute top-5 left-5 flex flex-col gap-2">
                    <div className="glass-card-dark px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-terracotta dark:text-white">
                      {recipe.category || 'Gurme'}
                    </div>
                    {recipe.status && (
                      <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-lg ${
                        recipe.status === 'APPROVED' ? 'bg-moss-forest/20 text-moss-forest border-moss-forest/30' :
                        recipe.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                        recipe.status === 'DRAFT' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                        'bg-red-500/20 text-red-500 border-red-500/30'
                      }`}>
                        {t(`recipes.status.${recipe.status.toLowerCase()}`)}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleToggleFavorite(recipe.id, e)}
                    className={`absolute top-5 right-5 p-2.5 glass-card-dark rounded-xl transition-all hover:scale-110 active:scale-90 ${recipe.isFavorite ? 'text-terracotta' : 'text-white/70 hover:text-terracotta'}`}
                  >
                    <Star size={18} fill={recipe.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <div className="absolute top-5 right-20 flex gap-2">
                    {user && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                openRecipeModal(recipe);
                            }}
                            className="p-2.5 glass-card-dark rounded-xl text-white hover:text-terracotta transition-colors shadow-lg"
                            title={t('common.edit')}
                        >
                            <Edit3 size={18} />
                        </button>
                    )}
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-2xl font-serif font-bold text-espresso-midnight dark:text-white group-hover:text-terracotta transition-colors leading-tight line-clamp-2">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-moss-sage/10 text-moss-forest dark:text-moss-sage rounded-lg shrink-0" title={`${recipe.ratingCount || 0} oy`}>
                      <Star size={14} className="fill-current" />
                      <span className="text-xs font-black">{recipe.averageRating?.toFixed(1) ?? 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-foreground-muted" title={t('recipes.modal.timeLabel')}>
                      <Clock size={16} className="text-terracotta"/> <span className="text-xs font-bold uppercase tracking-widest">{recipe.preparationTimeMinutes || 30} DK</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground-muted" title={t('recipes.modal.servingsLabel')}>
                      <Plus size={16} className="text-terracotta"/> <span className="text-xs font-bold uppercase tracking-widest">{recipe.servings || 2} KİŞİ</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground-muted" title={t('recipes.modal.caloriesLabel')}>
                      <Flame size={16} className="text-terracotta"/> <span className="text-xs font-bold uppercase tracking-widest">{Math.round(recipe.totalCalories || 0)} KCAL</span>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-card-border flex items-center justify-between">
                    <span className="text-[10px] font-black text-espresso-midnight/30 dark:text-white/30 uppercase tracking-[0.2em]">{t('recipes.viewRecipe')}</span>
                    <div className="w-10 h-10 rounded-2xl bg-terracotta/5 text-terracotta flex items-center justify-center group-hover:bg-terracotta group-hover:text-white transition-all">
                      <ChevronRight size={20} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-4 mt-12 pb-10">
          <button
              className="p-4 glass-card border-card-border rounded-2xl disabled:opacity-30 hover:text-terracotta transition-all"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <div className="glass-card px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted">
            SAYFA <span className="text-espresso-midnight dark:text-white text-sm ml-2">{page + 1}</span>
          </div>
          <button
              className="p-4 glass-card border-card-border rounded-2xl disabled:opacity-30 hover:text-terracotta transition-all"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || (recipes.length < size)}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* --- PORTAL MODAL --- */}
        {isModalOpen && selectedRecipe && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
              <div className="fixed inset-0 bg-espresso-midnight/80 backdrop-blur-md" onClick={handleCloseModal} />

              <div className="relative z-[10000] w-full max-w-5xl max-h-screen md:max-h-[90vh] bg-white dark:bg-espresso-midnight rounded-none md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/10">
                <button onClick={handleCloseModal} className="absolute top-8 right-8 z-50 p-3 bg-black/20 hover:bg-terracotta text-white rounded-2xl transition-all hover:rotate-90">
                  <X size={24} />
                </button>

                <div className="overflow-y-auto custom-scrollbar">
                  <div className="h-64 md:h-96 relative shrink-0">
                    <RecipeArtwork
                      imageUrl={selectedRecipe.imageUrl}
                      title={selectedRecipe.title}
                      variant="hero"
                      className="h-full w-full"
                      mediaClassName="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-espresso-midnight via-transparent to-transparent" />
                    <div className="absolute bottom-10 left-10 right-10">
                      <div className="flex items-center justify-between">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-white drop-shadow-lg">{selectedRecipe.title}</h2>
                        <div className="flex gap-3">
                          <button 
                            onClick={(e) => handleToggleFavorite(selectedRecipe.id, e)}
                            className={`p-4 rounded-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 ${selectedRecipe.isFavorite ? 'bg-terracotta text-white' : 'bg-white/10 text-white/70 hover:text-white'}`}
                          >
                            <Star size={24} fill={selectedRecipe.isFavorite ? "currentColor" : "none"} />
                          </button>
                          {user && (
                            <button 
                              onClick={() => {
                                handleCloseModal();
                                openRecipeModal(selectedRecipe);
                              }}
                              className="p-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl hover:bg-terracotta transition-all hover:scale-105"
                              title={t('common.edit')}
                            >
                              <Edit3 size={24} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10" title={t('recipes.modal.timeLabel')}>
                          <Clock size={18} className="text-terracotta" /> {selectedRecipe.preparationTimeMinutes || 30} DK
                        </div>
                        <div className="flex items-center gap-2 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10" title={t('recipes.modal.servingsLabel')}>
                          <Users size={18} className="text-terracotta" /> {selectedRecipe.servings || 2} KİŞİ
                        </div>
                        <div className="flex items-center gap-2 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10" title={t('recipes.modal.caloriesLabel')}>
                          <Flame size={18} className="text-terracotta" /> {Math.round(selectedRecipe.totalCalories || 0)} KCAL
                        </div>
                        {selectedRecipe.status && (
                          <div className={`flex items-center gap-2 text-white/90 text-[10px] font-black uppercase bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 ${
                            selectedRecipe.status === 'APPROVED' ? 'text-moss-sage' :
                            selectedRecipe.status === 'PENDING' ? 'text-yellow-400' :
                            selectedRecipe.status === 'DRAFT' ? 'text-blue-400' :
                            'text-red-400'
                          }`}>
                            {t(`recipes.status.${selectedRecipe.status.toLowerCase()}`)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-10 md:p-14">
                    {modalLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-foreground-muted italic font-serif">
                          <div className="w-12 h-12 border-4 border-terracotta/20 border-t-terracotta rounded-full animate-spin" />
                          {t('recipes.preparingDetails')}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
                          {/* Rating Section in Detail */}
                          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-terracotta/5 rounded-[2rem] border border-terracotta/10 gap-6">
                            <div className="space-y-1 text-center md:text-left">
                              <h4 className="text-lg font-bold text-espresso-midnight dark:text-white">Bu tarifi nasıl buldunuz?</h4>
                              <p className="text-xs text-foreground-muted uppercase tracking-widest font-black">
                                Genel Ortalanma: {selectedRecipe.averageRating?.toFixed(1) || '0.0'} / 10
                              </p>
                            </div>
                            <RecipeRating 
                              recipeId={selectedRecipe.id} 
                              initialRating={recipeDetail?.userRating ? Math.round(recipeDetail.userRating / 2) : 0}
                              averageRating={selectedRecipe.averageRating ? selectedRecipe.averageRating / 2 : 0}
                              ratingCount={selectedRecipe.ratingCount || 0}
                              size={32}
                            />
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                            <div className="lg:col-span-4 space-y-8">
                              <h3 className="text-xl font-bold flex items-center gap-3 text-espresso-midnight dark:text-white">
                                <ChefHat size={24} className="text-terracotta" /> Malzemeler
                              </h3>
                              <ul className="space-y-3">
                                {(recipeDetail?.ingredients || []).map((ing: any, idx: number) => (
                                    <li key={idx} className="flex justify-between items-center p-3 rounded-2xl hover:bg-terracotta/5 border-b border-card-border dark:border-white/5 transition-colors">
                                      <span className="text-foreground-muted dark:text-white/80">{ing.name}</span>
                                      <span className="font-bold text-terracotta bg-terracotta/10 px-3 py-1 rounded-lg text-xs">
                                        {ing.amount} {ing.unit || 'g'}
                                      </span>
                                    </li>
                                ))}
                              </ul>
                            </div>

                            <div className="lg:col-span-8 space-y-8">
                              <h3 className="text-xl font-bold flex items-center gap-3 text-espresso-midnight dark:text-white">
                                <Info size={24} className="text-moss-forest" /> {t('recipes.instructions')}
                              </h3>
                              <div className="space-y-6 text-lg leading-relaxed text-foreground-muted dark:text-white/70 font-light">
                                {recipeDetail?.instructions?.split('\n').filter((s:string)=>s.trim()).map((step: string, i: number) => (
                                    <div key={i} className="flex gap-6 group">
                                      <div className="flex-none w-10 h-10 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center font-bold text-sm group-hover:bg-terracotta group-hover:text-white transition-all shadow-sm">
                                        {i + 1}
                                      </div>
                                      <p className="pt-1">{step}</p>
                                    </div>
                                )) || <p className="italic opacity-50">Tarif detayları henüz eklenmemiş.</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
        )}
      </div>
  );
};

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default RecipeList;
