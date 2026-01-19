import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Banknote, 
  Target, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  BarChart3,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useChallenge } from "@/hooks/useChallenge";
import { useMarketData } from "@/hooks/useMarketData";
import { useCasablancaBourse } from "@/hooks/useCasablancaBourse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TradingViewChart from "./TradingViewChart";
import TradeHistory from "./TradeHistory";
import PerformanceCharts from "./PerformanceCharts";

// Static market data (without translation - names are company names)
const staticMarketAssets = {
  stocks: [
    { symbol: "AAPL", name: "Apple Inc.", price: 178.45, change: 2.34, changePercent: 1.33 },
    { symbol: "MSFT", name: "Microsoft", price: 374.12, change: -1.23, changePercent: -0.33 },
    { symbol: "GOOGL", name: "Alphabet", price: 141.80, change: 1.56, changePercent: 1.11 },
    { symbol: "AMZN", name: "Amazon", price: 178.25, change: 3.45, changePercent: 1.97 },
    { symbol: "NVDA", name: "NVIDIA", price: 495.22, change: 12.50, changePercent: 2.59 },
    { symbol: "TSLA", name: "Tesla", price: 248.50, change: -5.30, changePercent: -2.09 },
    { symbol: "META", name: "Meta Platforms", price: 505.75, change: 8.20, changePercent: 1.65 },
  ],
  crypto: [
    { symbol: "BTC", name: "Bitcoin", price: 93166.00, change: 124.50, changePercent: 0.13 },
    { symbol: "ETH", name: "Ethereum", price: 3120.00, change: -15.20, changePercent: -0.48 },
    { symbol: "BNB", name: "Binance Coin", price: 595.00, change: -2.90, changePercent: -0.49 },
    { symbol: "SOL", name: "Solana", price: 215.00, change: -3.25, changePercent: -1.49 },
    { symbol: "XRP", name: "Ripple", price: 1.95, change: -0.02, changePercent: -1.01 },
    { symbol: "ADA", name: "Cardano", price: 0.68, change: -0.01, changePercent: -1.45 },
    { symbol: "DOGE", name: "Dogecoin", price: 0.35, change: -0.003, changePercent: -0.85 },
  ],
  forex: [
    { symbol: "EURUSD", name: "EUR/USD", price: 1.0875, change: 0.0023, changePercent: 0.21 },
    { symbol: "GBPUSD", name: "GBP/USD", price: 1.2695, change: -0.0045, changePercent: -0.35 },
    { symbol: "USDJPY", name: "USD/JPY", price: 142.35, change: 0.85, changePercent: 0.60 },
    { symbol: "USDCHF", name: "USD/CHF", price: 0.8745, change: 0.0012, changePercent: 0.14 },
    { symbol: "AUDUSD", name: "AUD/USD", price: 0.6725, change: 0.0034, changePercent: 0.51 },
    { symbol: "USDCAD", name: "USD/CAD", price: 1.3485, change: -0.0028, changePercent: -0.21 },
    { symbol: "EURGBP", name: "EUR/GBP", price: 0.8565, change: 0.0015, changePercent: 0.18 },
  ],
  commodities: [
    { symbol: "XAUUSD", name: "Gold", price: 2045.30, change: 15.80, changePercent: 0.78 },
    { symbol: "XAGUSD", name: "Silver", price: 23.45, change: 0.32, changePercent: 1.38 },
    { symbol: "WTIUSD", name: "WTI Oil", price: 72.85, change: -1.25, changePercent: -1.69 },
    { symbol: "BRENTUSD", name: "Brent Oil", price: 77.90, change: -0.95, changePercent: -1.21 },
    { symbol: "NATGAS", name: "Natural Gas", price: 2.45, change: 0.08, changePercent: 3.38 },
    { symbol: "COPPER", name: "Copper", price: 3.85, change: 0.05, changePercent: 1.32 },
  ],
  indices: [
    { symbol: "SPX500", name: "S&P 500", price: 4780.25, change: 28.50, changePercent: 0.60 },
    { symbol: "NAS100", name: "Nasdaq 100", price: 16850.00, change: 125.30, changePercent: 0.75 },
    { symbol: "DJI30", name: "Dow Jones 30", price: 37650.80, change: -45.20, changePercent: -0.12 },
    { symbol: "DAX40", name: "DAX 40", price: 16750.50, change: 85.60, changePercent: 0.51 },
    { symbol: "FTSE100", name: "FTSE 100", price: 7685.30, change: 22.10, changePercent: 0.29 },
    { symbol: "CAC40", name: "CAC 40", price: 7545.80, change: 35.40, changePercent: 0.47 },
  ],
  morocco: [
    { symbol: "IAM", name: "Maroc Telecom", price: 110.70, change: 0.80, changePercent: 0.84 },
    { symbol: "ATW", name: "Attijariwafa Bank", price: 484.36, change: -3.20, changePercent: -0.66 },
    { symbol: "BCP", name: "Banque Populaire", price: 261.40, change: 2.50, changePercent: 0.95 },
    { symbol: "LHM", name: "LafargeHolcim Maroc", price: 1845.04, change: 25.00, changePercent: 1.37 },
    { symbol: "CIH", name: "CIH Bank", price: 345.00, change: -1.50, changePercent: -0.43 },
    { symbol: "TQM", name: "Taqa Morocco", price: 1125.00, change: 15.00, changePercent: 1.35 },
  ],
};

type CategoryKey = keyof typeof staticMarketAssets;

const categoryKeys: CategoryKey[] = ["stocks", "crypto", "forex", "commodities", "indices", "morocco"];

// Flatten all assets for initial state
const getAllAssets = () => {
  const allAssets: MarketItem[] = [];
  Object.values(staticMarketAssets).forEach((assets) => {
    allAssets.push(...assets);
  });
  return allAssets;
};

const initialMarketData = getAllAssets();

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const TradingDashboardLive = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const localeStr = i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US";
  const { challenge, allChallenges, trades, allTrades, isLoading, openTrade, closeTrade, calculateUnrealizedPnL } = useChallenge();
  const [marketData, setMarketData] = useState<MarketItem[]>(initialMarketData);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("stocks");
  const [selectedSymbol, setSelectedSymbol] = useState<MarketItem>(staticMarketAssets.stocks[0]);
  const [tradeQuantity, setTradeQuantity] = useState("0.1");
  const [isTrading, setIsTrading] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<string | null>(null);
  const [useLiveData, setUseLiveData] = useState(true);

  // Category names with translations
  const getCategoryName = (key: CategoryKey) => t(`markets.${key}`);

  const MAD_RATE = 10;
  const moroccanSymbols = useMemo(() => {
    return staticMarketAssets.morocco.map((a) => a.symbol);
  }, []);

  const getPriceInDH = useCallback((price: number, symbol: string) => {
    if (moroccanSymbols.includes(symbol)) return price;
    return price * MAD_RATE;
  }, [moroccanSymbols, MAD_RATE]);

  const formatMarketPrice = useCallback((price: number, symbol: string) => {
    if (moroccanSymbols.includes(symbol)) {
      return `${price.toLocaleString(localeStr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
    }
    return `$${price.toLocaleString(localeStr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [localeStr, moroccanSymbols]);
  // Get all symbols for live data fetch (only stocks and crypto supported by Finnhub free tier)
  const liveSymbols = useMemo(() => {
    const supported = [...staticMarketAssets.stocks, ...staticMarketAssets.crypto];
    return supported.map((a) => a.symbol);
  }, []);

  // Removed redundant useMemo for moroccanSymbols
  
  // Fetch real market data (international)
  const { 
    quotes: liveQuotes, 
    isLoading: isLoadingQuotes, 
    lastUpdate, 
    refresh: refreshQuotes,
    error: quotesError
  } = useMarketData({ 
    symbols: liveSymbols, 
    refreshInterval: 20000, // Refresh every 20 seconds as requested
    enabled: useLiveData 
  });

  // Fetch Casablanca Bourse data (Moroccan stocks)
  const {
    quotes: moroccanQuotes,
    isLoading: isLoadingMoroccan,
    lastUpdate: moroccanLastUpdate,
    refresh: refreshMoroccan,
    error: moroccanError
  } = useCasablancaBourse({
    symbols: moroccanSymbols,
    refreshInterval: 20000, // Refresh every 20 seconds as requested
    enabled: useLiveData
  });

  // Get current prices as a map
  const getCurrentPrices = useCallback(() => {
    const prices: Record<string, number> = {};
    const allQuotes = { ...liveQuotes, ...moroccanQuotes };
    marketData.forEach((item) => {
      // Use live data if available
      const livePrice = allQuotes[item.symbol]?.price;
      prices[item.symbol] = livePrice || item.price;
    });
    return prices;
  }, [marketData, liveQuotes, moroccanQuotes]);

  // Auto-correct legacy balance units (50,000 -> 5,000)
  useEffect(() => {
    const correctLegacyBalance = async () => {
      if (!challenge || !challenge.id) return;
      
      const ib = Number(challenge.initial_balance);
      // If balance is too high (legacy units like 50k, 250k, 1M instead of 5k, 25k, 100k)
      if (ib >= 50000) {
        console.log("Correcting legacy balance units for challenge:", challenge.id, "Current IB:", ib);
        const factor = 10;
        const { error } = await supabase
          .from("challenges")
          .update({
            initial_balance: ib / factor,
            current_balance: Number(challenge.current_balance) / factor,
            total_pnl: Number(challenge.total_pnl) / factor,
            daily_pnl: Number(challenge.daily_pnl) / factor,
          })
          .eq("id", challenge.id);
        
        if (error) {
          console.error("Error correcting legacy balance:", error);
        } else {
          // Refresh the page or the data to show correct values
          window.location.reload();
        }
      }
    };
    
    correctLegacyBalance();
  }, [challenge?.id, challenge?.initial_balance]);

  // Auto-select first symbol when category changes
  useEffect(() => {
    const firstAsset = staticMarketAssets[selectedCategory][0];
    if (firstAsset) {
      const liveAsset = marketData.find(m => m.symbol === firstAsset.symbol) || firstAsset;
      setSelectedSymbol(liveAsset);
    }
  }, [selectedCategory]);

  // Update market data with live quotes (international + Moroccan)
  useEffect(() => {
    const allQuotes = { ...liveQuotes, ...moroccanQuotes };
    
    if (Object.keys(allQuotes).length > 0) {
      setMarketData((prevData) => {
        const newData = prevData.map((item) => {
          const liveQuote = allQuotes[item.symbol];
          if (liveQuote) {
            return {
              ...item,
              price: liveQuote.price,
              change: liveQuote.change,
              changePercent: liveQuote.changePercent,
            };
          }
          return item;
        });

        // Sync selected symbol with new market data
        if (selectedSymbol) {
          const updatedSelected = newData.find(item => item.symbol === selectedSymbol.symbol);
          if (updatedSelected && (updatedSelected.price !== selectedSymbol.price || updatedSelected.change !== selectedSymbol.change)) {
            setSelectedSymbol(updatedSelected);
          }
        }

        return newData;
      });
    }
  }, [liveQuotes, moroccanQuotes, selectedSymbol?.symbol]);

  // Fallback: Simulate price updates for assets without live data
  useEffect(() => {
    const allQuotes = { ...liveQuotes, ...moroccanQuotes };
    const interval = setInterval(() => {
      setMarketData((prevData) => {
        const newData = prevData.map((item) => {
          // Skip if we have live data for this symbol (international or Moroccan)
          if (allQuotes[item.symbol]) return item;
          
          // Realistic small variations (0.005% to 0.02% per second for smoother "live" look)
          const drift = (Math.random() - 0.5) * 0.0002; 
          const newPrice = item.price * (1 + drift);
          const newChange = (newPrice - (item.price / (1 + item.changePercent / 100)));
          const newChangePercent = ((newPrice / (item.price / (1 + item.changePercent / 100))) - 1) * 100;
          
          return {
            ...item,
            price: Number(newPrice.toFixed(item.symbol.includes("USD") || item.symbol === "BTC" || item.symbol === "ETH" ? 2 : 4)),
            change: Number(newChange.toFixed(2)),
            changePercent: Number(newChangePercent.toFixed(2)),
          };
        });

        // Sync selected symbol with simulated data
        if (selectedSymbol) {
          const updatedSelected = newData.find(item => item.symbol === selectedSymbol.symbol);
          if (updatedSelected && !allQuotes[selectedSymbol.symbol] && (updatedSelected.price !== selectedSymbol.price)) {
            setSelectedSymbol(updatedSelected);
          }
        }

        return newData;
      });
    }, 20000); // Ticking every 20 seconds as requested

    return () => clearInterval(interval);
  }, [liveQuotes, moroccanQuotes, selectedSymbol?.symbol]);

  const handleRefresh = () => {
    refreshQuotes();
    refreshMoroccan();
  };

  const handleOpenTrade = async (direction: "buy" | "sell") => {
    if (!selectedSymbol || isTrading) return;

    setIsTrading(true);
    try {
      await openTrade(
        selectedSymbol.symbol,
        direction,
        selectedSymbol.price,
        parseFloat(tradeQuantity)
      );
    } finally {
      setIsTrading(false);
    }
  };

  const handleCloseTrade = async () => {
    if (!tradeToClose) return;

    const trade = trades.find((t) => t.id === tradeToClose);
    if (!trade) return;

    const currentPrice = marketData.find((m) => m.symbol === trade.symbol)?.price || Number(trade.entry_price);

    setIsTrading(true);
    try {
      await closeTrade(tradeToClose, currentPrice);
      setCloseDialogOpen(false);
      setTradeToClose(null);
    } finally {
      setIsTrading(false);
    }
  };

  // Calculate stats
  const balance = challenge ? Number(challenge.current_balance) * MAD_RATE : 0;
  const initialBalance = challenge ? Number(challenge.initial_balance) * MAD_RATE : 0;
  const dailyPnL = challenge ? Number(challenge.daily_pnl) * MAD_RATE : 0;
  const totalPnL = challenge ? Number(challenge.total_pnl) * MAD_RATE : 0;
  const unrealizedPnL = calculateUnrealizedPnL(getCurrentPrices()) * MAD_RATE;
  const profitTarget = challenge ? Number(challenge.profit_target_percent) : 10;
  const maxDailyLoss = challenge ? Number(challenge.max_daily_loss_percent) : 5;
  const maxTotalLoss = challenge ? Number(challenge.max_total_loss_percent) : 10;

  const openPositions = trades.filter((t) => t.status === "open");
  const closedTrades = trades.filter((t) => t.status === "closed");

  const dailyPnLPercent = initialBalance > 0 ? (dailyPnL / initialBalance) * 100 : 0;
  const totalPnLPercent = initialBalance > 0 ? (totalPnL / initialBalance) * 100 : 0;
  const progressToTarget = Math.min((totalPnLPercent / profitTarget) * 100, 100);

  const isDailyLossBreached = dailyPnLPercent <= -maxDailyLoss;
  const isTotalLossBreached = totalPnLPercent <= -maxTotalLoss;
  const isTargetReached = totalPnLPercent >= profitTarget;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <Card variant="trading" className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t("dashboard.noActiveChallenge")}</h3>
        <p className="text-muted-foreground mb-4">
          {t("dashboard.buyChallenge")}
        </p>
        <Button variant="hero" onClick={() => window.location.href = "/challenges"}>
          {t("dashboard.viewChallenges")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="trading" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.balance")}</span>
            <Banknote className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {(balance + unrealizedPnL).toLocaleString(i18n.language === "ar" ? "ar-MA" : "fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t("dashboard.initialCapital")}: {initialBalance.toLocaleString(i18n.language === "ar" ? "ar-MA" : "fr-MA")} DH
          </div>
        </Card>

        <Card variant="trading" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.dailyPnl")}</span>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={`font-mono text-2xl font-bold ${dailyPnL >= 0 ? "text-primary" : "text-destructive"}`}>
            {dailyPnL >= 0 ? "+" : ""}{dailyPnL.toLocaleString(i18n.language === "ar" ? "ar-MA" : "fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-mono ${dailyPnL >= 0 ? "text-primary" : "text-destructive"}`}>
              {dailyPnLPercent.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">/ Max: -{maxDailyLoss}%</span>
          </div>
        </Card>

        <Card variant="trading" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.totalPnl")}</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={`font-mono text-2xl font-bold ${totalPnL >= 0 ? "text-primary" : "text-destructive"}`}>
            {totalPnL >= 0 ? "+" : ""}{totalPnL.toLocaleString(i18n.language === "ar" ? "ar-MA" : "fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-mono ${totalPnL >= 0 ? "text-primary" : "text-destructive"}`}>
              {totalPnLPercent.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">/ Max: -{maxTotalLoss}%</span>
          </div>
        </Card>

        <Card variant="trading" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.profitTarget")}</span>
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">{profitTarget}%</div>
          <div className="mt-2">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, progressToTarget)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{Math.max(0, progressToTarget).toFixed(0)}% {t("dashboard.reached")}</div>
          </div>
        </Card>
      </div>

      {/* Challenge Rules Panel */}
      <Card variant="trading" className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">{t("dashboard.challengeRules")}</h3>
          <Badge variant={challenge.status === "active" ? "live" : challenge.status === "passed" ? "funded" : "failed"} className="ml-auto">
            {challenge.status === "active" ? t("dashboard.inProgress") : challenge.status === "passed" ? t("dashboard.passed") : t("dashboard.failed")}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Loss Rule */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            isDailyLossBreached 
              ? "border-destructive bg-destructive/10" 
              : dailyPnLPercent < -maxDailyLoss * 0.7 
                ? "border-yellow-500 bg-yellow-500/10" 
                : "border-border bg-secondary/50"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className={`w-5 h-5 ${isDailyLossBreached ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="font-medium text-sm">{t("dashboard.maxDailyLoss")}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t("dashboard.dailyLossRule", { percent: maxDailyLoss })}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("dashboard.current")}:</span>
                <span className={`font-mono font-semibold ${dailyPnLPercent >= 0 ? "text-primary" : "text-destructive"}`}>
                  {dailyPnLPercent >= 0 ? "+" : ""}{dailyPnLPercent.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("dashboard.limit")}:</span>
                <span className="font-mono font-semibold text-destructive">-{maxDailyLoss}%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDailyLossBreached ? "bg-destructive" : dailyPnLPercent < -maxDailyLoss * 0.7 ? "bg-yellow-500" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (Math.abs(dailyPnLPercent) / maxDailyLoss) * 100))}%` }}
                />
              </div>
              {isDailyLossBreached && (
                <Badge variant="failed" className="w-full justify-center mt-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("dashboard.limitReached")}
                </Badge>
              )}
            </div>
          </div>

          {/* Total Loss Rule */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            isTotalLossBreached 
              ? "border-destructive bg-destructive/10" 
              : totalPnLPercent < -maxTotalLoss * 0.7 
                ? "border-yellow-500 bg-yellow-500/10" 
                : "border-border bg-secondary/50"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className={`w-5 h-5 ${isTotalLossBreached ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="font-medium text-sm">{t("dashboard.maxTotalLoss")}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t("dashboard.totalLossRule", { percent: maxTotalLoss })}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("dashboard.current")}:</span>
                <span className={`font-mono font-semibold ${totalPnLPercent >= 0 ? "text-primary" : "text-destructive"}`}>
                  {totalPnLPercent >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("dashboard.limit")}:</span>
                <span className="font-mono font-semibold text-destructive">-{maxTotalLoss}%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTotalLossBreached ? "bg-destructive" : totalPnLPercent < -maxTotalLoss * 0.7 ? "bg-yellow-500" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (Math.abs(totalPnLPercent) / maxTotalLoss) * 100))}%` }}
                />
              </div>
              {isTotalLossBreached && (
                <Badge variant="failed" className="w-full justify-center mt-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t("dashboard.limitReached")}
                </Badge>
              )}
            </div>
          </div>

          {/* Profit Target Rule */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            isTargetReached 
              ? "border-primary bg-primary/10" 
              : totalPnLPercent >= profitTarget * 0.7 
                ? "border-primary/50 bg-primary/5" 
                : "border-border bg-secondary/50"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className={`w-5 h-5 ${isTargetReached ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-medium text-sm">{t("dashboard.profitTarget")}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t("dashboard.profitRule", { percent: profitTarget })}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("dashboard.current")}:</span>
                <span className={`font-mono font-semibold ${totalPnLPercent >= 0 ? "text-primary" : "text-destructive"}`}>
                  {totalPnLPercent >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("dashboard.target")}:</span>
                <span className="font-mono font-semibold text-primary">+{profitTarget}%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progressToTarget))}%` }}
                />
              </div>
              {isTargetReached && (
                <Badge variant="funded" className="w-full justify-center mt-2">
                  <Target className="w-3 h-3 mr-1" />
                  {t("dashboard.targetReached")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Status Alerts */}
      {(isDailyLossBreached || isTotalLossBreached || isTargetReached || challenge.status !== "active") && (
        <div className="flex gap-2 flex-wrap">
          {challenge.status === "failed" && (
            <Badge variant="failed" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t("dashboard.challengeFailed")}
            </Badge>
          )}
          {challenge.status === "passed" && (
            <Badge variant="funded" className="gap-1">
              <Target className="w-3 h-3" />
              {t("dashboard.challengePassed")}
            </Badge>
          )}
        </div>
      )}

      {/* TradingView Chart */}
      <Card variant="trading" className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{t("dashboard.chart")} {selectedSymbol.symbol}</CardTitle>
          </div>
          <Badge variant="live" className="text-xs">TradingView</Badge>
        </CardHeader>
        <CardContent className="p-0 h-[450px]">
          <TradingViewChart symbol={selectedSymbol.symbol} />
        </CardContent>
      </Card>

      {/* Market Data & Trading */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Watch */}
        <Card variant="trading" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{t("dashboard.liveMarkets")}</CardTitle>
              {useLiveData && !quotesError && (
                <Badge variant="live" className="text-xs gap-1">
                  <Wifi className="w-3 h-3" />
                  {t("dashboard.live")}
                </Badge>
              )}
              {quotesError && (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <WifiOff className="w-3 h-3" />
                  {t("dashboard.simulated")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoadingQuotes}>
                <RefreshCw className={`w-4 h-4 ${isLoadingQuotes ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categoryKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {getCategoryName(key)}
                </button>
              ))}
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {staticMarketAssets[selectedCategory].map((asset) => {
                const liveAsset = marketData.find((m) => m.symbol === asset.symbol) || asset;
                return (
                  <div
                    key={asset.symbol}
                    onClick={() => setSelectedSymbol(liveAsset)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      selectedSymbol.symbol === asset.symbol
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <span className="font-mono font-bold text-xs">{asset.symbol.slice(0, 3)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{asset.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[100px]">{asset.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-foreground text-sm">
                        {formatMarketPrice(liveAsset.price, asset.symbol)}
                      </div>
                      <div className={`flex items-center justify-end gap-1 text-xs font-mono ${liveAsset.change >= 0 ? "text-primary" : "text-destructive"}`}>
                        {liveAsset.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {liveAsset.changePercent >= 0 ? "+" : ""}{liveAsset.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Trading Panel */}
        <Card variant="trading">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{selectedSymbol.symbol}</CardTitle>
              {useLiveData && !quotesError && !moroccanError ? (
                <Badge variant="live" className="text-xs">{t("dashboard.live")}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">{t("dashboard.simulated")}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{selectedSymbol.name}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price Display */}
            <div className="text-center py-4 bg-secondary/30 rounded-lg">
              <div className="font-mono text-3xl font-bold text-foreground mb-1">
                {formatMarketPrice(selectedSymbol.price, selectedSymbol.symbol)}
              </div>
              <div className={`flex items-center justify-center gap-1 font-mono ${selectedSymbol.change >= 0 ? "text-primary" : "text-destructive"}`}>
                {selectedSymbol.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {selectedSymbol.change >= 0 ? "+" : ""}{selectedSymbol.change.toFixed(2)} ({selectedSymbol.changePercent}%)
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">{t("dashboard.quantity")}</Label>
              <Input
                type="number"
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(e.target.value)}
                step="0.01"
                min="0.01"
                className="font-mono"
              />
              <div className="flex gap-2 mt-2">
                {[0.01, 0.05, 0.1, 0.5, 1].map((size) => (
                  <button
                    key={size}
                    onClick={() => setTradeQuantity(size.toString())}
                    className={`flex-1 py-2 text-xs font-mono rounded-lg transition-colors ${
                      tradeQuantity === size.toString()
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Buy/Sell Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="buy"
                size="lg"
                className="w-full uppercase"
                onClick={() => handleOpenTrade("buy")}
                disabled={isTrading || challenge.status !== "active"}
              >
                {t("dashboard.buy")}
              </Button>
              <Button
                variant="sell"
                size="lg"
                className="w-full uppercase"
                onClick={() => handleOpenTrade("sell")}
                disabled={isTrading || challenge.status !== "active"}
              >
                {t("dashboard.sell")}
              </Button>
            </div>

            {/* AI Signal */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{t("dashboard.aiSignal")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t("dashboard.bullishTrend")} {formatMarketPrice(selectedSymbol.price * 0.98, selectedSymbol.symbol)}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <Card variant="trading">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("dashboard.openPositions")}</CardTitle>
              <Badge variant="outline">{openPositions.length} {t("dashboard.positions")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openPositions.map((trade) => {
                const currentPrice = marketData.find((m) => m.symbol === trade.symbol)?.price || Number(trade.entry_price);
                const entryPrice = Number(trade.entry_price);
                const quantity = Number(trade.quantity);
                const unrealizedPnL = trade.direction === "buy"
                  ? (currentPrice - entryPrice) * quantity
                  : (entryPrice - currentPrice) * quantity;

                return (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                    <div className="flex items-center gap-4">
                      <Badge variant={trade.direction === "buy" ? "profit" : "loss"} className="text-xs">
                        {trade.direction === "buy" ? t("dashboard.long") : t("dashboard.short")}
                      </Badge>
                      <span className="font-semibold">{trade.symbol}</span>
                      <span className="text-sm text-muted-foreground font-mono">
                        {quantity} @ {formatMarketPrice(entryPrice, trade.symbol)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-mono font-bold ${unrealizedPnL >= 0 ? "text-primary" : "text-destructive"}`}>
                        {unrealizedPnL >= 0 ? "+" : ""}
                        {(unrealizedPnL * MAD_RATE).toLocaleString(localeStr, { minimumFractionDigits: 2 })} DH
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTradeToClose(trade.id);
                          setCloseDialogOpen(true);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Charts */}
      <PerformanceCharts trades={trades} allTrades={allTrades} challenge={challenge} allChallenges={allChallenges} />

      {/* Trade History with Filters */}
      <TradeHistory trades={trades} />

      {/* Close Trade Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.closePosition")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.closeConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleCloseTrade} disabled={isTrading}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradingDashboardLive;
