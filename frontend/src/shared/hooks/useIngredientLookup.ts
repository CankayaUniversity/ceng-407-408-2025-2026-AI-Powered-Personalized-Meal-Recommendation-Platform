import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIngredientService } from '../../services/ingredientService';
import { useConsumptionService } from '../../services/consumptionService';
import type { Ingredient } from '../../types';

const locale = 'tr-TR';

export const matchesIngredientQuery = (query: string, ingredientName: string): boolean =>
  query.trim().toLocaleLowerCase(locale) === ingredientName.trim().toLocaleLowerCase(locale);

interface UseIngredientLookupOptions {
  query: string;
  enabled?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

export const useIngredientLookup = ({
  query,
  enabled = true,
  debounceMs = 250,
  minQueryLength = 2,
  limit = 12
}: UseIngredientLookupOptions) => {
  const ingredientService = useIngredientService();
  const consumptionService = useConsumptionService();
  const requestIdRef = useRef(0);
  
  const [results, setResults] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  
  // Malzeme birim zekası için state'ler
  const [unitWeights, setUnitWeights] = useState<Record<string, number>>({});
  const [ingredientSpecificWeights, setIngredientSpecificWeights] = useState<Record<number, Record<string, number>>>({});
  const [conversions, setConversions] = useState<Record<number, any[]>>({});

  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const canSearch = enabled && trimmedQuery.length >= minQueryLength;

  // Başlangıçta genel birim ağırlıklarını çek
  useEffect(() => {
    ingredientService.getAllUnitWeights()
      .then(setUnitWeights)
      .catch(err => console.error("Failed to load global unit weights:", err));
  }, [ingredientService]);

  useEffect(() => {
    if (!canSearch) {
      requestIdRef.current += 1;
      setResults([]);
      setSearching(false);
      setSearchError(null);
      setHasCompletedSearch(false);
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setResults([]);
    setSearching(true);
    setSearchError(null);
    setHasCompletedSearch(false);

    const timerId = window.setTimeout(async () => {
      try {
        const nextResults = await ingredientService.searchIngredients(trimmedQuery, limit);
        if (requestIdRef.current !== currentRequestId) return;

        setResults(nextResults);
        setHasCompletedSearch(true);
      } catch (_error) {
        if (requestIdRef.current !== currentRequestId) return;

        setResults([]);
        setSearchError('Malzeme araması şu anda kullanılamıyor.');
        setHasCompletedSearch(true);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setSearching(false);
        }
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [canSearch, debounceMs, ingredientService, limit, trimmedQuery]);

  // Bir malzemenin birimlerini ve katsayılarını getiren akıllı fonksiyon
  const fetchIngredientIntelligence = useCallback(async (ingredientId: number) => {
    if (!ingredientId) return;
    
    // Zaten yüklüyse tekrar çekme (opsiyonel, tazelik istenirse kaldırılabilir)
    if (conversions[ingredientId]) return;

    try {
      const [weights, convs] = await Promise.all([
        ingredientService.getAllUnitWeights(ingredientId),
        ingredientService.getUnitConversions(ingredientId, 1, 'GRAM')
      ]);
      
      setIngredientSpecificWeights(prev => ({ ...prev, [ingredientId]: weights }));
      setConversions(prev => ({ ...prev, [ingredientId]: convs }));
    } catch (err) {
      console.error(`Failed to fetch intelligence for ingredient ${ingredientId}:`, err);
    }
  }, [consumptionService, conversions]);

  const getIngredientUnits = useCallback((ingredient?: Ingredient) => {
    if (!ingredient) return { quickUnits: [], standardUnits: [] };

    const ingredientId = ingredient.id;
    const backendConversions = conversions[ingredientId];

    if (backendConversions && backendConversions.length > 0) {
      const quick = backendConversions
        .filter((c: any) => c.highPriority)
        .map((c: any) => c.unit.toUpperCase());
      
      const standard = backendConversions
        .map((c: any) => c.unit.toUpperCase());

      return {
        quickUnits: quick.slice(0, 6),
        standardUnits: standard
      };
    }

    // Fallback logic
    const base = ['GRAM', 'ML', 'ADET'];
    const weights = (ingredientId && ingredientSpecificWeights[ingredientId]) || unitWeights;
    const extra = Object.keys(weights).map((u: any) => u.toUpperCase());
    const allUnits = Array.from(new Set([...base, ...extra]));

    const standard = allUnits.sort((a, b) => {
        if (a === 'GRAM') return -1;
        if (b === 'GRAM') return 1;
        return a.localeCompare(b);
    });

    return {
      quickUnits: [],
      standardUnits: standard
    };
  }, [conversions, ingredientSpecificWeights, unitWeights]);

  const clearResults = useCallback(() => {
    requestIdRef.current += 1;
    setResults([]);
    setSearching(false);
    setSearchError(null);
    setHasCompletedSearch(false);
  }, []);

  const resetSearch = clearResults;

  return {
    results,
    searching,
    searchError,
    hasCompletedSearch,
    canSearch,
    clearResults,
    resetSearch,
    // Zeka dışarıya açılıyor
    unitWeights,
    ingredientSpecificWeights,
    conversions,
    fetchIngredientIntelligence,
    getIngredientUnits
  };
};
