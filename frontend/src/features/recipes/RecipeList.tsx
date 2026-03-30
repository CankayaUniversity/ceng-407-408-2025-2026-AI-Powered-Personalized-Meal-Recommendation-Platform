import React, { useEffect, useRef, useState } from 'react';
import { Search, Filter, Clock, Zap, Star, ChevronRight } from 'lucide-react';
import { useRecipeService } from '../../services/recipeService';
import type { RecipeListItem } from '../../types';

const RecipeList: React.FC = () => {
  const recipeService = useRecipeService();
  const [searchTerm, setSearchTerm] = useState('');
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const size = 12;

  // Debounce edilmiş arama terimi
  const debouncedSearch = useDebounce(searchTerm, 400);
  // Aynı parametrelerle tekrarlı istekleri engellemek için son sorgu anahtarını tutar
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      const queryKey = `${debouncedSearch ?? ''}|${page}|${size}`;
      // Aynı parametrelerle ardışık çağrıları önle
      if (lastQueryRef.current === queryKey) {
        return;
      }
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
  }, [debouncedSearch, page]); // recipeService bağımlılıktan çıkarıldı

  // Arama değiştiğinde sayfayı sıfırla
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-serif">Tarif Kütüphanesi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Damak tadına uygun yüzlerce sağlıklı tarif.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
             <Filter size={18} />
             Filtrele
           </button>
           <button className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100 dark:shadow-none">
             Yeni Tarif Ekle
           </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
        <input 
          type="text"
          placeholder="Tarif, malzeme veya kategori ara..."
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-gray-100 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {['Hepsi', 'Ana Yemek', 'Kahvaltı', 'Salata', 'Tatlı', 'Atıştırmalık'].map((cat, i) => (
          <button 
            key={i}
            className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${
              i === 0 
                ? 'bg-gray-900 dark:bg-orange-500 text-white shadow-lg' 
                : 'bg-white dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && (
          <div className="col-span-full text-center text-gray-500">Yükleniyor...</div>
        )}
        {error && (
          <div className="col-span-full text-center text-red-600">{error}</div>
        )}
        {!loading && !error && recipes.map((recipe) => (
          <div key={recipe.id} className="group glass-card rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="h-52 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-6xl relative">
               {/* Image or emoji fallback */}
               {recipe.imageUrl ? (
                 // eslint-disable-next-line @next/next/no-img-element
                 <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
               ) : (
                 <span role="img" aria-label="recipe">🍽️</span>
               )}
               <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-orange-600 dark:text-orange-400 shadow-sm">
                 {recipe.category || 'Genel'}
               </div>
               <button className="absolute bottom-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-400 hover:text-red-500 transition-colors">
                  <Star size={20} className={((recipe.averageRating || 0) > 4.7) ? 'fill-yellow-500 text-yellow-500' : ''} />
               </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-serif group-hover:text-orange-500 transition-colors">{recipe.title}</h3>
                <div className="flex items-center gap-1 text-sm font-bold bg-green-50 dark:bg-emerald-900/20 text-green-700 dark:text-emerald-400 px-2 py-1 rounded-lg">
                  <Star size={14} className="fill-green-700 dark:fill-emerald-400" />
                  {recipe.averageRating ?? '-'}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-4">
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  {recipe.preparationTimeMinutes ? `${recipe.preparationTimeMinutes} dk` : '-'}
                </div>
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                  <Zap size={16} />
                  {recipe.totalCalories ? Math.round(recipe.totalCalories) : '-'} kcal
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Detayları Gör</span>
                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
        >
          Önceki
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">Sayfa {page + 1}</span>
        <button
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || (recipes.length < size)}
        >
          Sonraki
        </button>
      </div>
    </div>
  );
};

// Basit debounce hook'u
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default RecipeList;
