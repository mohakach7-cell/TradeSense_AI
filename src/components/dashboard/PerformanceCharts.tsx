import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, BarChart3, PieChartIcon, Activity, History } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type Challenge = Database["public"]["Tables"]["challenges"]["Row"];

interface PerformanceChartsProps {
  trades: Trade[];
  allTrades?: Trade[];
  challenge: Challenge | null;
  allChallenges?: Challenge[];
}

const PerformanceCharts = ({ trades, allTrades = [], challenge, allChallenges = [] }: PerformanceChartsProps) => {
  const { t, i18n } = useTranslation();
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  const currentLocale = i18n.language === "fr" ? fr : i18n.language === "ar" ? ar : enUS;
  const isRtl = i18n.language === "ar";
  
  const MAD_RATE = 10;
  const moroccanSymbols = ["IAM", "ATW", "BCP", "LHM", "CIH", "TQM"];

  // Use all trades if toggled on, otherwise just current challenge trades
  const displayTrades = showAllHistory ? allTrades : trades;
  const displayChallenge = showAllHistory ? null : challenge;
  // Calculate capital evolution data
  const capitalEvolution = useMemo(() => {
    const closedTrades = displayTrades
      .filter((t) => t.status === "closed" && t.closed_at)
      .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());

    if (closedTrades.length === 0) return [];

    // For all history mode, start from 0 as we don't have a single initial balance
    const initialBalance = showAllHistory 
      ? 0 
      : Number(challenge?.initial_balance || 0) * MAD_RATE;
    
    let runningBalance = initialBalance;

    const data = [];
    
    if (!showAllHistory && challenge) {
      data.push({
        date: format(new Date(challenge.start_date || challenge.created_at), "dd/MM", { locale: currentLocale }),
        fullDate: challenge.start_date || challenge.created_at,
        balance: initialBalance,
        pnl: 0,
      });
    }

    closedTrades.forEach((trade) => {
      let pnl = Number(trade.pnl) || 0;
      if (!moroccanSymbols.includes(trade.symbol)) {
        pnl = pnl * MAD_RATE;
      }
      runningBalance += pnl;
      data.push({
        date: format(new Date(trade.closed_at!), "dd/MM HH:mm", { locale: currentLocale }),
        fullDate: trade.closed_at!,
        balance: runningBalance,
        pnl: pnl,
      });
    });

    return data;
  }, [displayTrades, challenge, showAllHistory, currentLocale]);

  // Calculate P&L distribution data
  const pnlDistribution = useMemo(() => {
    const closedTrades = displayTrades.filter((t) => t.status === "closed" && t.pnl !== null);
    
    if (closedTrades.length === 0) return [];

    // Create buckets for P&L distribution
    const pnls = closedTrades.map((t) => {
      let pnl = Number(t.pnl);
      if (!moroccanSymbols.includes(t.symbol)) {
        pnl = pnl * MAD_RATE;
      }
      return pnl;
    });
    const minPnL = Math.min(...pnls);
    const maxPnL = Math.max(...pnls);
    
    // Create 10 buckets
    const bucketCount = 10;
    const range = maxPnL - minPnL || 1;
    const bucketSize = range / bucketCount;

    const buckets: { range: string; count: number; isPositive: boolean }[] = [];
    
    for (let i = 0; i < bucketCount; i++) {
      const start = minPnL + i * bucketSize;
      const end = start + bucketSize;
      const count = pnls.filter((p) => p >= start && (i === bucketCount - 1 ? p <= end : p < end)).length;
      
      buckets.push({
        range: `${start.toLocaleString(i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US", { maximumFractionDigits: 0 })} DH`,
        count,
        isPositive: start + bucketSize / 2 >= 0,
      });
    }

    return buckets;
  }, [displayTrades, i18n.language]);

  // Calculate daily P&L data
  const dailyPnL = useMemo(() => {
    const closedTrades = displayTrades.filter((t) => t.status === "closed" && t.closed_at);
    
    const dailyMap = new Map<string, number>();
    
    closedTrades.forEach((trade) => {
      const dateKey = format(new Date(trade.closed_at!), "yyyy-MM-dd");
      let pnl = Number(trade.pnl) || 0;
      if (!moroccanSymbols.includes(trade.symbol)) {
        pnl = pnl * MAD_RATE;
      }
      const currentPnL = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, currentPnL + pnl);
    });

    return Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, pnl]) => ({
        date: format(new Date(date), "dd/MM", { locale: currentLocale }),
        pnl,
        isPositive: pnl >= 0,
      }));
  }, [displayTrades, currentLocale]);

  // Calculate win/loss stats for pie chart (no change needed as it counts wins/losses, not values)
  const winLossData = useMemo(() => {
    const closedTrades = displayTrades.filter((t) => t.status === "closed" && t.pnl !== null);
    const wins = closedTrades.filter((t) => Number(t.pnl) > 0).length;
    const losses = closedTrades.filter((t) => Number(t.pnl) < 0).length;
    const breakeven = closedTrades.filter((t) => Number(t.pnl) === 0).length;

    return [
      { name: t("dashboard.performance.winners"), value: wins, color: "hsl(var(--primary))" },
      { name: t("dashboard.performance.losers"), value: losses, color: "hsl(var(--destructive))" },
      { name: t("dashboard.performance.breakeven"), value: breakeven, color: "hsl(var(--muted))" },
    ].filter((d) => d.value > 0);
  }, [displayTrades, t]);

  // Calculate performance stats
  const stats = useMemo(() => {
    const closedTrades = displayTrades.filter((t) => t.status === "closed" && t.pnl !== null);
    if (closedTrades.length === 0) return null;

    const pnls = closedTrades.map((t) => {
      let pnl = Number(t.pnl) || 0;
      if (!moroccanSymbols.includes(t.symbol)) {
        pnl = pnl * MAD_RATE;
      }
      return pnl;
    });
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);

    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
    const maxWin = wins.length > 0 ? Math.max(...wins) : 0;
    const maxLoss = losses.length > 0 ? Math.min(...losses) : 0;

    return {
      avgWin,
      avgLoss,
      profitFactor,
      maxWin,
      maxLoss,
      totalTrades: closedTrades.length,
    };
  }, [displayTrades]);

  const hasData = displayTrades.filter((t) => t.status === "closed").length > 0;
  const hasAllHistoryData = allTrades.filter((t) => t.status === "closed").length > 0;

  if (!hasData && !hasAllHistoryData) {
    return (
      <Card variant="trading" className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t("dashboard.performance.noDataTitle")}</h3>
        <p className="text-muted-foreground">
          {t("dashboard.performance.noDataDesc")}
        </p>
      </Card>
    );
  }

  if (!hasData && hasAllHistoryData && !showAllHistory) {
    return (
      <Card variant="trading" className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t("dashboard.performance.noChallengeDataTitle")}</h3>
        <p className="text-muted-foreground mb-4">
          {t("dashboard.performance.noChallengeDataDesc")}
        </p>
        <button
          onClick={() => setShowAllHistory(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <History className="w-4 h-4" />
          {t("dashboard.performance.viewAllHistory")}
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle for showing all history */}
      {hasAllHistoryData && (
        <div className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="show-all-history" className="font-medium">
                {t("dashboard.performance.showAllHistory")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {showAllHistory 
                  ? t("dashboard.performance.allHistoryDesc", { count: allTrades.filter(t => t.status === 'closed').length })
                  : t("dashboard.performance.currentHistoryDesc", { count: trades.filter(t => t.status === 'closed').length })
                }
              </p>
            </div>
          </div>
          <Switch
            id="show-all-history"
            checked={showAllHistory}
            onCheckedChange={setShowAllHistory}
          />
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-card border border-border/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.performance.avgWin")}</div>
            <div className="text-lg font-bold font-mono text-primary">+{stats.avgWin.toLocaleString(i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US", { minimumFractionDigits: 2 })} DH</div>
          </div>
          <div className="p-3 bg-card border border-border/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.performance.avgLoss")}</div>
            <div className="text-lg font-bold font-mono text-destructive">-{stats.avgLoss.toLocaleString(i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US", { minimumFractionDigits: 2 })} DH</div>
          </div>
          <div className="p-3 bg-card border border-border/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.performance.profitFactor")}</div>
            <div className="text-lg font-bold font-mono">{stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-card border border-border/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.performance.maxWin")}</div>
            <div className="text-lg font-bold font-mono text-primary">+{stats.maxWin.toLocaleString(i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US", { minimumFractionDigits: 2 })} DH</div>
          </div>
          <div className="p-3 bg-card border border-border/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.performance.maxLoss")}</div>
            <div className="text-lg font-bold font-mono text-destructive">{stats.maxLoss.toLocaleString(i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US", { minimumFractionDigits: 2 })} DH</div>
          </div>
          <div className="p-3 bg-card border border-border/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.performance.tradesAnalyzed")}</div>
            <div className="text-lg font-bold font-mono">{stats.totalTrades}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capital Evolution Chart */}
        <Card variant="trading">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t("dashboard.performance.capitalEvolution")}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {t("dashboard.trades.total")}: {capitalEvolution.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={capitalEvolution}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    reversed={isRtl}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k DH`}
                    orientation={isRtl ? "right" : "left"}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      direction: isRtl ? "rtl" : "ltr",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${value.toLocaleString(i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US", { minimumFractionDigits: 2 })} DH`, t("dashboard.capital")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorBalance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Win/Loss Pie Chart */}
        <Card variant="trading">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t("dashboard.performance.winLossDistribution")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      direction: isRtl ? "rtl" : "ltr",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily P&L Bar Chart */}
        <Card variant="trading">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t("dashboard.performance.dailyPnl")}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {dailyPnL.length} {t("common.days")}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    reversed={isRtl}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${value} DH`}
                    orientation={isRtl ? "right" : "left"}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      direction: isRtl ? "rtl" : "ltr",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString(i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US", { minimumFractionDigits: 2 })} DH`, "P&L"]}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyPnL.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* P&L Distribution Chart */}
        <Card variant="trading">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{t("dashboard.performance.pnlDistribution")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    reversed={isRtl}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    allowDecimals={false}
                    orientation={isRtl ? "right" : "left"}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      direction: isRtl ? "rtl" : "ltr",
                    }}
                    formatter={(value: number) => [value, t("dashboard.trades.title")]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pnlDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceCharts;
