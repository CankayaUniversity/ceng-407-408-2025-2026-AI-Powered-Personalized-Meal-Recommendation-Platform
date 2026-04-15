import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIngredientService } from '../../services/ingredientService';
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
  const requestIdRef = useRef(0);
  const [results, setResults] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);

  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const canSearch = enabled && trimmedQuery.length >= minQueryLength;

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
    resetSearch
  };
};
