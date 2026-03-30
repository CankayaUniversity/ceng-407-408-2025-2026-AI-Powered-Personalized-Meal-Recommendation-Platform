import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { useInventoryService } from '../../services/inventoryService';
import { type Ingredient } from '../../types';

interface TastePreferencePickerProps {
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

const locale = 'tr-TR';

const normalizeLabel = (value: string): string => value.trim();

const normalizeKey = (value: string): string => normalizeLabel(value).toLocaleLowerCase(locale);

const normalizeValues = (values: string[]): string[] => {
  const seen = new Set<string>();

  return values.reduce<string[]>((acc, item) => {
    const value = normalizeLabel(item);
    const key = normalizeKey(value);

    if (!value || seen.has(key)) {
      return acc;
    }

    seen.add(key);
    acc.push(value);
    return acc;
  }, []);
};

const formatCategory = (category: Ingredient['category']): string => category.replace(/_/g, ' ');

const TastePreferencePicker: React.FC<TastePreferencePickerProps> = ({ values, onChange, error }) => {
  const inventoryService = useInventoryService();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const selectedKeys = useMemo(() => new Set(values.map((value) => normalizeKey(value))), [values]);
  const canAddQuery = trimmedQuery.length > 0 && !selectedKeys.has(normalizeKey(trimmedQuery));

  useEffect(() => {
    const searchTerm = deferredQuery.trim();

    if (searchTerm.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError(null);

        const nextResults = await inventoryService.searchIngredients(searchTerm, 6);

        if (!active) {
          return;
        }

        setResults(nextResults.filter((ingredient) => !selectedKeys.has(normalizeKey(ingredient.name))));
      } catch (_error) {
        if (!active) {
          return;
        }

        setResults([]);
        setSearchError('Malzeme araması şu anda yapılamıyor.');
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [deferredQuery, inventoryService, selectedKeys]);

  const commitValue = (value: string) => {
    const normalizedValue = normalizeLabel(value);

    if (!normalizedValue || selectedKeys.has(normalizeKey(normalizedValue))) {
      setQuery('');
      setResults([]);
      return;
    }

    onChange(normalizeValues([...values, normalizedValue]));
    setQuery('');
    setResults([]);
    setSearchError(null);
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => normalizeKey(item) !== normalizeKey(value)));
  };

  const shouldShowResults = searching || results.length > 0 || trimmedQuery.length >= 2 || searchError;

  return (
    <div className="rounded-[2rem] border border-terracotta/20 dark:border-terracotta/10 bg-gradient-to-br from-terracotta/10 via-white to-alabaster dark:from-terracotta/20 dark:via-gray-900/40 dark:to-gray-800/40 p-5 shadow-[0_24px_60px_-40px_rgba(226,114,91,0.45)] dark:shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-terracotta/15 dark:bg-terracotta/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta dark:text-terracotta/90">
            Taste Preferences
          </div>
          <p className="mt-3 text-sm leading-6 text-espresso-midnight/65 dark:text-gray-400">
            Alerji değil, sadece önerilerde geri planda kalmasını istediğin malzemeleri ekle.
          </p>
        </div>
        <div className="inline-flex items-center rounded-full bg-white/85 dark:bg-gray-800/80 px-3 py-2 text-xs font-semibold text-terracotta dark:text-terracotta/90 shadow-sm">
          {values.length} dislike
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-espresso-midnight/80 dark:text-gray-300">Malzeme Ara</span>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-terracotta/75 dark:text-terracotta/60" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ',') && trimmedQuery) {
                  event.preventDefault();
                  commitValue(trimmedQuery);
                }
              }}
              className="w-full rounded-[1.6rem] border border-terracotta/20 dark:border-gray-700 bg-white/90 dark:bg-gray-800/50 py-4 pl-12 pr-12 text-sm text-espresso-midnight dark:text-gray-100 shadow-sm outline-none transition-all focus:border-terracotta focus:ring-4 focus:ring-terracotta/10"
              placeholder="Örn. Kişniş, kereviz, zeytin"
            />
            {searching ? (
              <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-terracotta" />
            ) : canAddQuery ? (
              <button
                type="button"
                onClick={() => commitValue(trimmedQuery)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-terracotta p-2 text-white shadow-lg shadow-terracotta/20 transition-transform hover:scale-105"
                aria-label={`"${trimmedQuery}" malzemesini dislike listesine ekle`}
              >
                <Plus size={14} />
              </button>
            ) : null}
          </div>
        </label>

        <div className="rounded-2xl border border-white/70 dark:border-gray-800 bg-white/80 dark:bg-gray-800/40 px-4 py-3 text-xs leading-5 text-espresso-midnight/55 dark:text-gray-400">
          Arama sonuçlarından hızlıca seçebilir, istersen yazdığın ifadeyi doğrudan listeye ekleyebilirsin.
        </div>

        {shouldShowResults && (
          <div className="overflow-hidden rounded-[1.5rem] border border-terracotta/15 dark:border-gray-700 bg-white/90 dark:bg-gray-800 shadow-sm">
            {searching ? (
              <div className="flex items-center gap-3 px-4 py-4 text-sm text-espresso-midnight/60 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin text-terracotta" />
                <span>Malzemeler getiriliyor...</span>
              </div>
            ) : searchError ? (
              <div className="px-4 py-4 text-sm text-red-600 dark:text-red-400">{searchError}</div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-terracotta/10 dark:divide-gray-700">
                {results.map((ingredient) => (
                  <button
                    key={ingredient.id}
                    type="button"
                    onClick={() => commitValue(ingredient.name)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-terracotta/8 dark:hover:bg-terracotta/10"
                  >
                    <div>
                      <p className="font-semibold text-espresso-midnight dark:text-gray-100">{ingredient.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-espresso-midnight/40 dark:text-gray-500">{formatCategory(ingredient.category)}</p>
                    </div>
                    <Plus size={16} className="shrink-0 text-terracotta" />
                  </button>
                ))}
              </div>
            ) : trimmedQuery.length >= 2 ? (
              <button
                type="button"
                onClick={() => commitValue(trimmedQuery)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-terracotta/8 dark:hover:bg-terracotta/10"
              >
                <div>
                  <p className="font-semibold text-espresso-midnight dark:text-gray-100">"{trimmedQuery}" için eşleşme bulunamadı</p>
                  <p className="mt-1 text-sm text-espresso-midnight/55 dark:text-gray-400">Yazdığın ifadeyi yine de dislike listene ekle.</p>
                </div>
                <Plus size={16} className="shrink-0 text-terracotta" />
              </button>
            ) : null}
          </div>
        )}

        {values.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {values.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-2 rounded-full border border-terracotta/20 dark:border-terracotta/40 bg-terracotta/10 px-4 py-2 text-sm font-semibold text-terracotta dark:text-terracotta/90"
              >
                {value}
                <button
                  type="button"
                  onClick={() => removeValue(value)}
                  className="text-terracotta/75 hover:text-terracotta dark:text-terracotta/60 dark:hover:text-terracotta/90 transition-colors"
                  aria-label={`${value} tercihini kaldır`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-terracotta/25 dark:border-terracotta/40 bg-white/70 dark:bg-gray-800/30 px-4 py-5 text-sm text-espresso-midnight/55 dark:text-gray-400">
            Henüz dislike listesi oluşturulmadı.
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default TastePreferencePicker;
