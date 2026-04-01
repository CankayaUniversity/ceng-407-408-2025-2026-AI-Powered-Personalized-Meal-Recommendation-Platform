import React, { useEffect, useRef, useState } from 'react';
import { Search, Filter, Clock, Star, ChevronRight, Plus, ChefHat, Flame } from 'lucide-react';
import { useRecipeService } from '../../services/recipeService';
import type { RecipeListItem } from '../../types';

/**
 * MealAI Recipe Explorer
 * Tasarım Dili: Terracotta (Accent), Espresso Midnight (Text), Moss Sage (Health/Green)
 */
const RecipeList: React.FC = () => {
  const recipeService = useRecipeService();
  const [searchTerm, setSearchTerm] = useState('');
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [activeCategory, setActiveCategory] = useState('Hepsi');
  const size = 12;

  const debouncedSearch = useDebounce(searchTerm, 400);
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      const queryKey = `${debouncedSearch ?? ''}|${page}|${size}`;
      if (lastQueryRef.current === queryKey) return;

      lastQueryRef.current = queryKey;
      setLoading(true);
      setError(null);

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
          setError(e?.message || 'Tarifler yüklenemedi');
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
  }, [debouncedSearch, page]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto px-4 py-8">
        {/* Dynamic Header Area */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-moss-sage/10 text-moss-forest dark:text-moss-sage px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              <ChefHat size={12} />
              <span>Küratör Seçimleri</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-espresso-midnight dark:text-white tracking-tight">
              Tarif <span className="text-terracotta italic font-normal">Kütüphanesi</span>
            </h1>
            <p className="text-foreground-muted text-lg italic border-l-2 border-terracotta/20 pl-4">
              Damak tadınıza ve hedeflerinize uygun, yapay zeka destekli tarifler.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 glass-card rounded-2xl text-sm font-bold text-espresso-midnight dark:text-alabaster border-card-border hover:text-terracotta transition-all">
              <Filter size={18} strokeWidth={2} />
              Filtrele
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-terracotta text-white rounded-2xl text-sm font-bold hover:bg-terracotta-spiced transition-all shadow-brand-hero hover:scale-105 active:scale-95">
              <Plus size={18} strokeWidth={3} />
              Yeni Tarif
            </button>
          </div>
        </header>

        {/* Advanced Search Bar */}
        <div className="relative group">
          <div className="absolute inset-0 bg-terracotta/5 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-espresso-midnight/30 dark:text-alabaster/20 group-focus-within:text-terracotta transition-colors" size={22} />
          <input
              type="text"
              placeholder="Tarif, malzeme veya mutfak tipi ara..."
              className="w-full pl-16 pr-6 py-5 bg-white dark:bg-white/[0.03] border border-card-border rounded-[2rem] shadow-brand-card focus:outline-none focus:ring-4 focus:ring-terracotta/10 focus:border-terracotta text-espresso-midnight dark:text-white placeholder:text-espresso-midnight/20 dark:placeholder:text-alabaster/20 text-lg transition-all relative z-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Pills - Bento Style */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
          {['Hepsi', 'Ana Yemek', 'Kahvaltı', 'Salata', 'Tatlı', 'Fit & Sağlıklı'].map((cat) => (
              <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-8 py-3 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                      activeCategory === cat
                          ? 'bg-espresso-midnight dark:bg-terracotta text-white shadow-brand-hero scale-105'
                          : 'bg-white dark:bg-white/5 text-espresso-midnight/50 dark:text-alabaster/40 border border-card-border hover:border-terracotta/50'
                  }`}
              >
                {cat}
              </button>
          ))}
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-terracotta/20 border-t-terracotta rounded-full animate-spin mx-auto" />
                <p className="text-foreground-muted font-medium italic italic">Mutfağa göz atılıyor...</p>
              </div>
          )}

          {error && (
              <div className="col-span-full py-12 px-6 glass-card border-red-500/20 text-center rounded-[2rem]">
                <p className="text-red-500 font-bold">{error}</p>
              </div>
          )}

          {!loading && !error && recipes.map((recipe) => (
              <div key={recipe.id} className="group meal-card rounded-[2.5rem] overflow-hidden border-card-border hover:-translate-y-2 transition-all duration-500">
                {/* Card Image Area */}
                <div className="h-64 relative overflow-hidden">
                  {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  ) : (
                      <div className="w-full h-full bg-terracotta/5 flex items-center justify-center text-7xl opacity-40">
                        🍽️
                      </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-5 left-5 flex flex-col gap-2">
                    <div className="glass-card-dark px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter text-white">
                      {recipe.category || 'Gurme'}
                    </div>
                  </div>

                  <button className="absolute top-5 right-5 p-2.5 glass-card-dark rounded-xl text-white/60 hover:text-terracotta transition-colors group/fav">
                    <Star size={18} className={(recipe.averageRating || 0) > 4.7 ? 'fill-terracotta text-terracotta' : ''} />
                  </button>

                  <div className="absolute bottom-4 left-5 right-5 flex justify-between items-center">
                    <div className="glass-card-dark px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Flame size={14} className="text-terracotta" />
                      <span className="text-xs font-bold text-white">{recipe.totalCalories ? Math.round(recipe.totalCalories) : '-'} kcal</span>
                    </div>
                  </div>
                </div>

                {/* Card Content Area */}
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-2xl font-serif font-bold text-espresso-midnight dark:text-white group-hover:text-terracotta transition-colors leading-tight">
                      {recipe.title}
                    </h3>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-moss-sage/10 text-moss-forest dark:text-moss-sage rounded-lg shrink-0">
                      <Star size={14} className="fill-current" />
                      <span className="text-xs font-black">{recipe.averageRating?.toFixed(1) ?? 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-foreground-muted">
                      <Clock size={16} strokeWidth={2.5} className="text-terracotta" />
                      <span className="text-xs font-bold uppercase tracking-widest">{recipe.preparationTimeMinutes || 30} Dakika</span>
                    </div>
                    <div className="h-4 w-px bg-card-border" />
                    <div className="text-[10px] font-black uppercase tracking-widest text-foreground-muted/60">
                      {recipe.preparationTimeMinutes && recipe.preparationTimeMinutes < 20 ? 'Hızlı Seçim' : 'Gurme Hazırlık'}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-card-border flex items-center justify-between">
                    <span className="text-[10px] font-black text-espresso-midnight/30 dark:text-alabaster/30 uppercase tracking-[0.2em]">Tarifi İncele</span>
                    <div className="w-10 h-10 rounded-2xl bg-terracotta/5 text-terracotta flex items-center justify-center group-hover:bg-terracotta group-hover:text-white transition-all duration-300">
                      <ChevronRight size={20} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>

        {/* Enhanced Pagination */}
        <div className="flex items-center justify-center gap-4 mt-12 pb-10">
          <button
              className="p-4 glass-card border-card-border rounded-2xl text-espresso-midnight dark:text-alabaster disabled:opacity-30 hover:text-terracotta transition-all"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>

          <div className="glass-card px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted border-card-border">
            SAYFA <span className="text-espresso-midnight dark:text-white text-sm ml-2">{page + 1}</span>
          </div>

          <button
              className="p-4 glass-card border-card-border rounded-2xl text-espresso-midnight dark:text-alabaster disabled:opacity-30 hover:text-terracotta transition-all"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || (recipes.length < size)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
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
