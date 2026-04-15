import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, X, Ban } from 'lucide-react';
import { useInventoryService } from '../../services/inventoryService';
import { useIngredientService } from '../../services/ingredientService';
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
    if (!value || seen.has(key)) return acc;
    seen.add(key);
    acc.push(value);
    return acc;
  }, []);
};

const formatCategory = (category: Ingredient['category']): string => category.replace(/_/g, ' ');

const TastePreferencePicker: React.FC<TastePreferencePickerProps> = ({ values, onChange, error }) => {
  const inventoryService = useInventoryService();
  const ingredientService = useIngredientService();
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
        const nextResults = await ingredientService.searchIngredients(searchTerm, 6);
        if (!active) return;
        setResults(nextResults.filter((ingredient) => !selectedKeys.has(normalizeKey(ingredient.name))));
      } catch (_error) {
        if (!active) return;
        setResults([]);
        setSearchError('Arama servisi şu an meşgul.');
      } finally {
        if (active) setSearching(false);
      }
    }, 200);

    return () => { active = false; window.clearTimeout(timeoutId); };
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
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => normalizeKey(item) !== normalizeKey(value)));
  };

  return (
      <div className="space-y-6">
        {/* Header Kısmı */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-terracotta/10 rounded-lg text-terracotta">
                <Ban size={18} />
              </div>
              <h4 className="meal-section-title text-lg tracking-tight">Lezzet Tercihleri</h4>
            </div>
            <p className="text-sm text-foreground/50 max-w-md italic">
              Sevmediğin malzemeleri buraya ekle, MealAI sana özel tariflerde bunları geri plana atsın.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-card-border rounded-2xl shadow-sm self-start sm:self-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">Liste</span>
            <span className="text-sm font-bold text-terracotta">{values.length} Öge</span>
          </div>
        </div>

        {/* Arama Inputu */}
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-terracotta/50 group-focus-within:text-terracotta transition-colors">
            <Search size={20} />
          </div>
          <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && trimmedQuery && commitValue(trimmedQuery)}
              className="base-input pl-12 pr-14 py-4 shadow-brand-soft border-terracotta/5 focus:border-terracotta/30"
              placeholder="Örn: Patlıcan, dereotu, bamya..."
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {searching ? (
                <Loader2 size={20} className="animate-spin text-terracotta/40 mr-2" />
            ) : canAddQuery ? (
                <button
                    type="button"
                    onClick={() => commitValue(trimmedQuery)}
                    className="p-2 bg-terracotta text-white rounded-xl shadow-lg shadow-terracotta/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={18} />
                </button>
            ) : null}
          </div>

          {/* Canlı Arama Sonuçları ve Hata Paneli */}
          {(searching || results.length > 0 || searchError || (trimmedQuery.length >= 2 && !searching)) && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden rounded-2xl border border-card-border bg-card shadow-brand-elevated animate-in slide-in-from-top-2 duration-300">
                {searching ? (
                    <div className="p-6 text-center text-sm text-foreground/40 flex items-center justify-center gap-3">
                      <Loader2 size={18} className="animate-spin text-terracotta" /> Kütüphane taranıyor...
                    </div>
                ) : searchError ? (
                    <div className="p-5 text-center text-sm text-red-500 bg-red-500/5 flex items-center justify-center gap-2 font-semibold">
                      <Ban size={16} /> {searchError}
                    </div>
                ) : results.length > 0 ? (
                    <div className="divide-y divide-card-border">
                      {results.map((ingredient) => (
                          <button
                              key={ingredient.id}
                              type="button"
                              onClick={() => commitValue(ingredient.name)}
                              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-terracotta/5 transition-colors group/item"
                          >
                            <div>
                              <p className="font-bold text-foreground group-hover/item:text-terracotta transition-colors">{ingredient.name}</p>
                              <p className="text-[10px] uppercase tracking-widest text-foreground/30 mt-0.5">{formatCategory(ingredient.category)}</p>
                            </div>
                            <Plus size={16} className="text-terracotta opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </button>
                      ))}
                    </div>
                ) : trimmedQuery.length >= 2 ? (
                    <button
                        type="button"
                        onClick={() => commitValue(trimmedQuery)}
                        className="w-full px-5 py-4 text-left hover:bg-terracotta/5 flex items-center justify-between group/add"
                    >
                      <div>
                        <p className="text-sm font-bold text-foreground">"{trimmedQuery}" listeye eklensin mi?</p>
                        <p className="text-xs text-foreground/40 mt-0.5">Eşleşme bulunamadı, manuel olarak eklenecek.</p>
                      </div>
                      <Plus size={18} className="text-terracotta" />
                    </button>
                ) : null}
              </div>
          )}
        </div>

        {/* Dislike Edilenler Listesi (Badges) */}
        <div className="min-h-[60px] p-4 rounded-3xl border-2 border-dashed border-card-border bg-card/30">
          {values.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {values.map((value) => (
                    <div
                        key={value}
                        className="meal-badge pr-2 group/badge border-terracotta/10 bg-terracotta/5 hover:bg-terracotta/10 hover:border-terracotta/20 transition-all duration-300"
                    >
                      <span className="text-terracotta font-semibold">{value}</span>
                      <button
                          type="button"
                          onClick={() => removeValue(value)}
                          className="ml-1 p-0.5 text-terracotta/40 group-hover/badge:text-terracotta group-hover/badge:bg-white dark:group-hover/badge:bg-gray-800 rounded-full transition-all"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                ))}
              </div>
          ) : (
              <div className="h-full flex items-center justify-center text-sm text-foreground/30 font-medium italic">
                Henüz sevmediğin bir malzeme eklemedin.
              </div>
          )}
        </div>

        {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 pl-1 uppercase tracking-widest">
              <Ban size={12} /> {error}
            </div>
        )}
      </div>
  );
};

export default TastePreferencePicker;
