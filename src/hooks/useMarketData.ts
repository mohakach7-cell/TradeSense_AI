import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/api";
import { useTranslation } from "react-i18next";

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
}

interface UseMarketDataOptions {
  symbols: string[];
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

export const useMarketData = ({ symbols, refreshInterval = 30000, enabled = true }: UseMarketDataOptions) => {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchMarketData = useCallback(async () => {
    if (!enabled || symbols.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await invokeFunction("market-data", {
        body: { symbols },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.quotes && Array.isArray(data.quotes)) {
        const quotesMap: Record<string, MarketQuote> = {};
        data.quotes.forEach((quote: MarketQuote) => {
          quotesMap[quote.symbol] = quote;
        });
        setQuotes(quotesMap);
        setLastUpdate(new Date());

        if (data.errors && data.errors.length > 0) {
          console.log("Some symbols failed to fetch:", data.errors);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la récupération des données";
      setError(errorMessage);
      console.error("Market data error:", err);
      // Suppressed toast error notification as per user request to keep UI clean
      /*
      toast({
        title: t("dashboard.marketDataError"),
        description: t("dashboard.marketDataErrorDetail"),
        variant: "destructive",
      });
      */
    } finally {
      setIsLoading(false);
    }
  }, [symbols, enabled, t]);

  // Initial fetch
  useEffect(() => {
    if (enabled && symbols.length > 0) {
      fetchMarketData();
    }
  }, [fetchMarketData, enabled, symbols.length]);

  // Periodic refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(fetchMarketData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMarketData, refreshInterval, enabled]);

  const refresh = useCallback(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return {
    quotes,
    isLoading,
    lastUpdate,
    error,
    refresh,
  };
};
