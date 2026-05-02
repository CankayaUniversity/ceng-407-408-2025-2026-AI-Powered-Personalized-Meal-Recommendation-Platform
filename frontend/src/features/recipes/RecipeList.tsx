import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Search, Filter, Clock, Star, ChevronRight, Plus, ChefHat, Flame, X, Info } from 'lucide-react';
import { useRecipeService } from '../../services/recipeService';
import type { RecipeListItem } from '../../types';
import { useToast } from '../../shared/hooks/useToast';

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
  const normalizedImageUrl = imageUrl?.trim() || null;
  const [hasImageError, setHasImageError] = useState(normalizedImageUrl == null);
  const isHero = variant === 'hero';

  useEffect(() => {
    setHasImageError(normalizedImageUrl == null);
  }, [normalizedImageUrl]);

  if (!hasImageError && normalizedImageUrl) {
    return (
      <div className={className}>
        <img
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

/**
 * MealAI Recipe Explorer - Custom Toast & Portal Integrated
 */
const RecipeList: React.FC = () => {
  const { t } = useTranslation();
  const recipeService = useRecipeService();
  const { showToast } = useToast();

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

  // Fetch List Data
  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      const queryKey = `${debouncedSearch ?? ''}|${page}|${size}`;
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
  }, [debouncedSearch, page, recipeService, showToast]);

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
            <button className="flex items-center gap-2 px-6 py-3 bg-terracotta text-white rounded-2xl text-sm font-bold shadow-brand-hero hover:scale-105 transition-all">
              <Plus size={18} /> Yeni Tarif
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
                  <div className="absolute top-5 left-5 glass-card-dark px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-terracotta dark:text-white">
                    {recipe.category || 'Gurme'}
                  </div>
                  <button className="absolute top-5 right-5 p-2.5 glass-card-dark rounded-xl text-primary transition-colors">
                    <Star size={18} fill={(recipe.averageRating || 0) > 4.5 ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-2xl font-serif font-bold text-espresso-midnight dark:text-white group-hover:text-terracotta transition-colors leading-tight line-clamp-2">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-moss-sage/10 text-moss-forest dark:text-moss-sage rounded-lg shrink-0">
                      <Star size={14} className="fill-current" />
                      <span className="text-xs font-black">{recipe.averageRating?.toFixed(1) ?? 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-foreground-muted">
                      <Clock size={16} className="text-terracotta"/> <span className="text-xs font-bold uppercase tracking-widest">{recipe.preparationTimeMinutes || 30} DK</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground-muted">
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
                      <h2 className="text-4xl md:text-5xl font-serif font-bold text-white drop-shadow-lg">{selectedRecipe.title}</h2>
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                          <Clock size={18} className="text-terracotta" /> {selectedRecipe.preparationTimeMinutes || 30} DK
                        </div>
                        <div className="flex items-center gap-2 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                          <Flame size={18} className="text-terracotta" /> {Math.round(selectedRecipe.totalCalories || 0)} KCAL
                        </div>
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
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
