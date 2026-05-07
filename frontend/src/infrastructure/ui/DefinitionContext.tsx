import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EnumDefinitions } from '../../types';
import { useDefinitionService } from '../../services/definitionService';
import { useAuth } from '../auth/AuthContext';

interface DefinitionContextType {
  enums: EnumDefinitions | null;
  loading: boolean;
  error: any;
  refreshEnums: () => Promise<void>;
}

const DefinitionContext = createContext<DefinitionContextType | undefined>(undefined);

export const DefinitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const definitionService = useDefinitionService();
  const { authenticated } = useAuth();
  const [enums, setEnums] = useState<EnumDefinitions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchEnums = useCallback(async () => {
    try {
      setLoading(true);
      const data = await definitionService.getEnumDefinitions(i18n.language);
      setEnums(data);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Enum tanımları yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  }, [definitionService, i18n.language]);

  useEffect(() => {
    fetchEnums();
  }, [fetchEnums, authenticated, i18n.language]);

  const value = useMemo(() => ({
    enums,
    loading,
    error,
    refreshEnums: fetchEnums
  }), [enums, loading, error]);

  return (
    <DefinitionContext.Provider value={value}>
      {children}
    </DefinitionContext.Provider>
  );
};

export const useDefinitions = () => {
  const context = useContext(DefinitionContext);
  if (context === undefined) {
    throw new Error('useDefinitions must be used within a DefinitionProvider');
  }
  return context;
};
