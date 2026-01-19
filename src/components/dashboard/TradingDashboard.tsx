import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Target, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";

// Mock market data - in production, this would come from yfinance API or web scraping
const initialMarketData = [
  { symbol: "AAPL", name: "Apple Inc.", price: 178.45, change: 2.34, changePercent: 1.33 },
  { symbol: "MSFT", name: "Microsoft", price: 374.12, change: -1.23, changePercent: -0.33 },
  { symbol: "BTC", name: "Bitcoin", price: 95118.00, change: 1245.50, changePercent: 3.01 },
  { symbol: "ETH", name: "Ethereum", price: 2234.75, change: 45.20, changePercent: 2.06 },
  { symbol: "IAM", name: "Maroc Telecom", price: 109.48, change: 0.80, changePercent: 0.84 },
  { symbol: "ATW", name: "Attijariwafa Bank", price: 485.00, change: -3.20, changePercent: -0.66 },
];

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface TradingDashboardProps {
  balance?: number;
  profitTarget?: number;
  maxDailyLoss?: number;
  maxTotalLoss?: number;
}

const TradingDashboard = ({
  balance = 5000,
  profitTarget = 10,
  maxDailyLoss = -5,
  maxTotalLoss = -10,
}: TradingDashboardProps) => {
  const { t, i18n } = useTranslation();
  const [marketData, setMarketData] = useState<MarketItem[]>(initialMarketData);
  const [selectedSymbol, setSelectedSymbol] = useState<MarketItem>(initialMarketData[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [accountBalance, setAccountBalance] = useState(balance);
  const [dailyPnL, setDailyPnL] = useState(125.50);
  const [totalPnL, setTotalPnL] = useState(342.75);

  const isRtl = i18n.language === "ar";
  const localeStr = i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US";
  const MAD_RATE = 10;
  const moroccanSymbols = ["IAM", "ATW", "BCP", "LHM", "CIH", "TQM"];

  const formatMarketPrice = (price: number, symbol: string) => {
    if (moroccanSymbols.includes(symbol)) {
      return `${price.toLocaleString(localeStr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
    }
    return `$${price.toLocaleString(localeStr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData((prevData) =>
        prevData.map((item) => {
          const randomChange = (Math.random() - 0.5) * 2;
          const newPrice = item.price + randomChange;
          const newChange = item.change + randomChange * 0.1;
          return {
            ...item,
            price: Number(newPrice.toFixed(2)),
            change: Number(newChange.toFixed(2)),
            changePercent: Number(((newChange / newPrice) * 100).toFixed(2)),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const dailyPnLPercent = (dailyPnL / balance) * 100;
  const totalPnLPercent = (totalPnL / balance) * 100;
  const progressToTarget = Math.min((totalPnLPercent / profitTarget) * 100, 100);

  const isDailyLossBreached = dailyPnLPercent <= maxDailyLoss;
  const isTotalLossBreached = totalPnLPercent <= maxTotalLoss;
  const isTargetReached = totalPnLPercent >= profitTarget;

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="trading" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.balance")}</span>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="font-mono text-2xl font-bold text-foreground">
            {((accountBalance + totalPnL) * MAD_RATE).toLocaleString(localeStr)} DH
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t("dashboard.initialCapital")}: {(balance * MAD_RATE).toLocaleString(localeStr)} DH</div>
        </Card>

        <Card variant="trading" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.dailyPnl")}</span>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={`font-mono text-2xl font-bold ${dailyPnL >= 0 ? "text-primary" : "text-destructive"}`}>
            {dailyPnL >= 0 ? "+" : ""}{(dailyPnL * MAD_RATE).toLocaleString(localeStr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-mono ${dailyPnL >= 0 ? "text-primary" : "text-destructive"}`}>
              {dailyPnLPercent.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">/ {t("dashboard.limit")}: {maxDailyLoss}%</span>
          </div>
        </Card>

        <Card variant="trading" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("dashboard.totalPnl")}</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className={`font-mono text-2xl font-bold ${totalPnL >= 0 ? "text-primary" : "text-destructive"}`}>
            {totalPnL >= 0 ? "+" : ""}{(totalPnL * MAD_RATE).toLocaleString(localeStr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-mono ${totalPnL >= 0 ? "text-primary" : "text-destructive"}`}>
              {totalPnLPercent.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">/ {t("dashboard.limit")}: {maxTotalLoss}%</span>
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
                style={{ width: `${progressToTarget}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{progressToTarget.toFixed(0)}% {t("dashboard.reached")}</div>
          </div>
        </Card>
      </div>

      {/* Status Alerts */}
      {(isDailyLossBreached || isTotalLossBreached || isTargetReached) && (
        <div className="flex gap-2 flex-wrap">
          {isDailyLossBreached && (
            <Badge variant="failed" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t("dashboard.limitReached")}
            </Badge>
          )}
          {isTotalLossBreached && (
            <Badge variant="failed" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t("dashboard.limitReached")}
            </Badge>
          )}
          {isTargetReached && (
            <Badge variant="funded" className="gap-1">
              <Target className="w-3 h-3" />
              {t("dashboard.targetReached")}
            </Badge>
          )}
        </div>
      )}

      {/* Market Data & Trading */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Watch */}
        <Card variant="trading" className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">{t("dashboard.liveMarkets")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {marketData.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => setSelectedSymbol(item)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    selectedSymbol.symbol === item.symbol
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary/30 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <span className="font-mono font-bold text-xs">{item.symbol.slice(0, 3)}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{item.symbol}</div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-foreground">
                      {formatMarketPrice(item.price, item.symbol)}
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-mono ${item.change >= 0 ? "text-primary" : "text-destructive"}`}>
                      {item.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {item.changePercent >= 0 ? "+" : ""}{item.changePercent}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trading Panel */}
        <Card variant="trading">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{selectedSymbol.symbol}</CardTitle>
              <Badge variant="live" className="text-xs">{t("dashboard.live")}</Badge>
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

            {/* Order Size */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("dashboard.quantity")}</label>
              <div className="flex gap-2">
                {[0.01, 0.05, 0.1, 0.5, 1].map((size) => (
                  <button
                    key={size}
                    className="flex-1 py-2 text-xs font-mono rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Buy/Sell Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="buy" size="lg" className="w-full">
                {t("dashboard.buy")}
              </Button>
              <Button variant="sell" size="lg" className="w-full">
                {t("dashboard.sell")}
              </Button>
            </div>

            {/* AI Signal */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{t("dashboard.aiSignal")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.bullishTrend")} {formatMarketPrice(selectedSymbol.price * 0.98, selectedSymbol.symbol)}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TradingDashboard;
