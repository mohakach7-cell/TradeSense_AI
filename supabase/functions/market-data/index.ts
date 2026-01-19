import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Dynamic CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "https://lovable.dev",
];

const isAllowedOrigin = (origin: string): boolean => {
  if (!origin || origin === 'null') return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Permissive check for localhost and 127.0.0.1 with any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (origin.endsWith(".lovable.app") && origin.startsWith("https://")) return true;
  if (origin.endsWith(".lovableproject.com") && origin.startsWith("https://")) return true;
  const prodDomain = Deno.env.get("ALLOWED_ORIGIN");
  if (prodDomain && origin === prodDomain) return true;
  return false;
};

const getCorsHeaders = (origin: string): Record<string, string> => ({
  "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARKET-DATA] ${step}${detailsStr}`);
};

// Allowed symbols whitelist for validation
const ALLOWED_SYMBOLS = new Set([
  // US Stocks
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META",
  // Crypto
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE",
  // Forex
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "EURGBP",
]);

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (!supabaseUrl) {
      throw new Error("Missing SUPABASE_URL environment variable");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    logStep("Function started");

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("Authentication required - no header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("Invalid authentication", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    logStep("User authenticated", { userId: user.id });

    const { symbols } = await req.json();
    
    // Validate symbols input
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: "Symbols array is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate max symbols to prevent abuse
    if (symbols.length > 50) {
      return new Response(
        JSON.stringify({ error: "Maximum 50 symbols allowed per request" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Filter to only allowed symbols
    const validSymbols = symbols.filter(
      (s): s is string => typeof s === "string" && ALLOWED_SYMBOLS.has(s.toUpperCase())
    ).map(s => s.toUpperCase());

    if (validSymbols.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid symbols provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Fetching quotes for symbols", { count: validSymbols.length });

    const apiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!apiKey) {
      throw new Error("FINNHUB_API_KEY not configured");
    }

    // Map internal symbols to Finnhub symbols
    const symbolMapping: Record<string, string> = {
      // US Stocks
      AAPL: "AAPL",
      MSFT: "MSFT",
      GOOGL: "GOOGL",
      AMZN: "AMZN",
      NVDA: "NVDA",
      TSLA: "TSLA",
      META: "META",
      // Crypto (Binance)
      BTC: "BINANCE:BTCUSDT",
      ETH: "BINANCE:ETHUSDT",
      BNB: "BINANCE:BNBUSDT",
      SOL: "BINANCE:SOLUSDT",
      XRP: "BINANCE:XRPUSDT",
      ADA: "BINANCE:ADAUSDT",
      DOGE: "BINANCE:DOGEUSDT",
      // Forex (OANDA)
      EURUSD: "OANDA:EUR_USD",
      GBPUSD: "OANDA:GBP_USD",
      USDJPY: "OANDA:USD_JPY",
      USDCHF: "OANDA:USD_CHF",
      AUDUSD: "OANDA:AUD_USD",
      USDCAD: "OANDA:USD_CAD",
      EURGBP: "OANDA:EUR_GBP",
    };

    const quotes: QuoteData[] = [];
    const errors: string[] = [];

    // Fetch quotes in parallel (batch of 5 to avoid rate limits)
    const batchSize = 5;
    for (let i = 0; i < validSymbols.length; i += batchSize) {
      const batch = validSymbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol: string) => {
        try {
          const finnhubSymbol = symbolMapping[symbol] || symbol;
          const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;
          
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          
          // Finnhub returns: c (current), d (change), dp (change percent), h (high), l (low), o (open), pc (previous close), t (timestamp)
          if (data && data.c !== undefined && data.c > 0) {
            return {
              symbol,
              price: data.c,
              change: data.d || 0,
              changePercent: data.dp || 0,
              high: data.h || data.c,
              low: data.l || data.c,
              open: data.o || data.c,
              previousClose: data.pc || data.c,
              timestamp: data.t || Date.now() / 1000,
            };
          } else {
            logStep(`No data for ${symbol}`, data);
            return null;
          }
        } catch (err) {
          logStep(`Error fetching ${symbol}`, { error: String(err) });
          errors.push(symbol);
          return null;
        }
      });

      const results = await Promise.all(batchPromises);
      quotes.push(...results.filter((q): q is QuoteData => q !== null));

      // Small delay between batches to respect rate limits
      if (i + batchSize < validSymbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    logStep("Quotes fetched successfully", { count: quotes.length, errors: errors.length });

    return new Response(
      JSON.stringify({ quotes, errors }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...getCorsHeaders(req.headers.get("origin") || ""), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
