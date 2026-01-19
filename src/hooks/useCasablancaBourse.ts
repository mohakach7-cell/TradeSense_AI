import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/api";

export interface CasablancaQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  lastUpdate?: string;
}

interface UseCasablancaBourseOptions {
  symbols?: string[];
  refreshInterval?: number;
  enabled?: boolean;
}

const DEFAULT_SYMBOLS = ['IAM', 'ATW', 'BCP', 'LHM', 'CIH', 'TQM'];

export const useCasablancaBourse = ({
  symbols = DEFAULT_SYMBOLS,
  refreshInterval = 30000,
  enabled = true,
}: UseCasablancaBourseOptions = {}) => {
  const [quotes, setQuotes] = useState<Record<string, CasablancaQuote>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || symbols.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await invokeFunction("casablanca-bourse", {
        body: { symbols },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success && data?.quotes && Array.isArray(data.quotes)) {
        const quotesMap: Record<string, CasablancaQuote> = {};
        data.quotes.forEach((quote: CasablancaQuote) => {
          quotesMap[quote.symbol] = quote;
        });
        setQuotes(quotesMap);
        setLastUpdate(new Date());
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la récupération des données";
      setError(errorMessage);
      console.error("Casablanca Bourse error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [symbols, enabled]);

  // Initial fetch
  useEffect(() => {
    if (enabled && symbols.length > 0) {
      fetchData();
    }
  }, [fetchData, enabled, symbols.length]);

  // Periodic refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, enabled]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    quotes,
    isLoading,
    lastUpdate,
    error,
    refresh,
  };
};
