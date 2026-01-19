import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Download, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  CalendarIcon,
  X,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, arMA } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];

interface TradeHistoryProps {
  trades: Trade[];
}

const TradeHistory = ({ trades }: TradeHistoryProps) => {
  const { t, i18n } = useTranslation();
  const [symbolFilter, setSymbolFilter] = useState<string>("");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const moroccanSymbols = ["IAM", "ATW", "BCP", "LHM", "CIH", "TQM"];
  const MAD_RATE = 10;

  const currentLocale = i18n.language === "fr" ? fr : i18n.language === "ar" ? arMA : enUS;
  const isRtl = i18n.language === "ar";
  const localeStr = i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US";

  // Get unique symbols from trades
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(trades.map((t) => t.symbol));
    return Array.from(symbols).sort();
  }, [trades]);

  // Filter trades
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      // Symbol filter
      if (symbolFilter && !trade.symbol.toLowerCase().includes(symbolFilter.toLowerCase())) {
        return false;
      }

      // Direction filter
      if (directionFilter !== "all" && trade.direction !== directionFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && trade.status !== statusFilter) {
        return false;
      }

      // Date range filter
      const tradeDate = new Date(trade.created_at);
      if (startDate && tradeDate < startDate) {
        return false;
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (tradeDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [trades, symbolFilter, directionFilter, statusFilter, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const closed = filteredTrades.filter((t) => t.status === "closed");
    // Convert P&L for stats as well if needed, assuming simple sum for now but logic should match display
    // If trade P&L is in USD for international, we need to convert it before summing
    const totalPnL = closed.reduce((sum, t) => {
      let pnl = Number(t.pnl) || 0;
      if (!moroccanSymbols.includes(t.symbol)) {
        pnl = pnl * MAD_RATE;
      }
      return sum + pnl;
    }, 0);
    
    const winners = closed.filter((t) => Number(t.pnl) > 0);
    const losers = closed.filter((t) => Number(t.pnl) < 0);
    const winRate = closed.length > 0 ? (winners.length / closed.length) * 100 : 0;

    return {
      totalTrades: filteredTrades.length,
      closedTrades: closed.length,
      openTrades: filteredTrades.filter((t) => t.status === "open").length,
      totalPnL,
      winRate,
      winners: winners.length,
      losers: losers.length,
    };
  }, [filteredTrades, moroccanSymbols]);

  // Clear all filters
  const clearFilters = () => {
    setSymbolFilter("");
    setDirectionFilter("all");
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "ID",
      t("dashboard.trades.table.date"),
      t("dashboard.trades.table.symbol"),
      t("dashboard.trades.table.direction"),
      t("dashboard.trades.table.entryPrice"),
      t("dashboard.trades.table.exitPrice"),
      t("dashboard.trades.table.quantity"),
      t("dashboard.trades.table.pnl"),
      t("dashboard.trades.table.status"),
      t("dashboard.trades.table.closedAt"),
    ];

    const rows = filteredTrades.map((trade) => [
      trade.id,
      format(new Date(trade.created_at), "dd/MM/yyyy HH:mm"),
      trade.symbol,
      trade.direction === "buy" ? t("dashboard.trades.buy") : t("dashboard.trades.sell"),
      Number(trade.entry_price).toFixed(2),
      trade.exit_price ? Number(trade.exit_price).toFixed(2) : "-",
      Number(trade.quantity).toFixed(4),
      trade.pnl ? Number(trade.pnl).toFixed(2) : "-",
      trade.status === "open" ? t("dashboard.trades.open") : t("dashboard.trades.closed"),
      trade.closed_at ? format(new Date(trade.closed_at), "dd/MM/yyyy HH:mm") : "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
      link.setAttribute(
      "download",
      `trades_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format price based on symbol
  const formatPrice = (price: number | null | undefined, symbol: string) => {
    if (price === null || price === undefined) return "-";
    
    // Convert to DH if international
    let displayPrice = price;
    if (!moroccanSymbols.includes(symbol)) {
      displayPrice = price * MAD_RATE;
    }

    const formattedPrice = displayPrice.toLocaleString(localeStr, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formattedPrice} DH`;
  };

  // Helper to format P&L based on symbol
  const formatPnL = (pnl: number | null | undefined, symbol: string) => {
    if (pnl === null || pnl === undefined) return "-";
    
    // Convert to DH if international
    let displayPnL = pnl;
    if (!moroccanSymbols.includes(symbol)) {
      displayPnL = pnl * MAD_RATE;
    }

    const absPnL = Math.abs(displayPnL).toLocaleString(localeStr, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = pnl >= 0 ? "+" : "-";
    return `${sign}${absPnL} DH`;
  };

  const hasActiveFilters = symbolFilter || directionFilter !== "all" || statusFilter !== "all" || startDate || endDate;

  return (
    <Card variant="trading" dir={isRtl ? "rtl" : "ltr"}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">{t("dashboard.trades.title")}</CardTitle>
          <Badge variant="outline" className={cn(isRtl ? "mr-2" : "ml-2")}>
            {t("dashboard.trades.count", { count: filteredTrades.length })}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && "border-primary text-primary")}
          >
            <Filter className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
            {t("dashboard.trades.filters")}
            {hasActiveFilters && (
              <Badge variant="default" className={cn("h-5 w-5 p-0 flex items-center justify-center text-xs", isRtl ? "mr-2" : "ml-2")}>
                !
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredTrades.length === 0}>
            <Download className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
            {t("dashboard.trades.exportCsv")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("dashboard.trades.filters")}</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className={cn("w-4 h-4", isRtl ? "ml-1" : "mr-1")} />
                  {t("dashboard.trades.clear")}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Symbol Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("dashboard.trades.symbol")}</Label>
                <Input
                  placeholder={t("dashboard.trades.search")}
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Direction Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("dashboard.trades.direction")}</Label>
                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="all">{t("dashboard.trades.all")}</SelectItem>
                    <SelectItem value="buy">{t("dashboard.trades.buy")}</SelectItem>
                    <SelectItem value="sell">{t("dashboard.trades.sell")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("dashboard.trades.status")}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="all">{t("dashboard.trades.all")}</SelectItem>
                    <SelectItem value="open">{t("dashboard.trades.open")}</SelectItem>
                    <SelectItem value="closed">{t("dashboard.trades.closed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("dashboard.trades.startDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: currentLocale }) : t("dashboard.trades.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={currentLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("dashboard.trades.endDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className={cn("h-4 w-4", isRtl ? "ml-2" : "mr-2")} />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: currentLocale }) : t("dashboard.trades.select")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={currentLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.trades.total")}</div>
            <div className="text-lg font-bold font-mono">{stats.totalTrades}</div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.trades.open")}</div>
            <div className="text-lg font-bold font-mono text-warning">{stats.openTrades}</div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.trades.closed")}</div>
            <div className="text-lg font-bold font-mono">{stats.closedTrades}</div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.trades.winners")}</div>
            <div className="text-lg font-bold font-mono text-primary">{stats.winners}</div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.trades.losers")}</div>
            <div className="text-lg font-bold font-mono text-destructive">{stats.losers}</div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.trades.winRate")}</div>
            <div className="text-lg font-bold font-mono">{stats.winRate.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg text-center">
            <div className="text-xs text-muted-foreground">{t("dashboard.trades.totalPnl")}</div>
            <div className={cn(
              "text-lg font-bold font-mono",
              stats.totalPnL >= 0 ? "text-primary" : "text-destructive"
            )}>
              {stats.totalPnL >= 0 ? "+" : ""}{stats.totalPnL.toLocaleString(localeStr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className={cn("text-xs font-medium", isRtl ? "text-right" : "text-left")}>{t("dashboard.trades.table.date")}</TableHead>
                  <TableHead className={cn("text-xs font-medium", isRtl ? "text-right" : "text-left")}>{t("dashboard.trades.table.symbol")}</TableHead>
                  <TableHead className={cn("text-xs font-medium", isRtl ? "text-right" : "text-left")}>{t("dashboard.trades.table.direction")}</TableHead>
                  <TableHead className={cn("text-xs font-medium text-right")}>{t("dashboard.trades.table.entryPrice")}</TableHead>
                  <TableHead className={cn("text-xs font-medium text-right")}>{t("dashboard.trades.table.exitPrice")}</TableHead>
                  <TableHead className={cn("text-xs font-medium text-right")}>{t("dashboard.trades.table.quantity")}</TableHead>
                  <TableHead className={cn("text-xs font-medium text-right")}>{t("dashboard.trades.table.pnl")}</TableHead>
                  <TableHead className="text-xs font-medium text-center">{t("dashboard.trades.table.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t("dashboard.trades.noTrades")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrades.map((trade) => {
                    const pnl = trade.pnl ? Number(trade.pnl) : null;
                    return (
                      <TableRow key={trade.id} className="hover:bg-secondary/20">
                        <TableCell className="text-xs font-mono">
                          {format(new Date(trade.created_at), "dd/MM/yy HH:mm", { locale: currentLocale })}
                        </TableCell>
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {trade.direction === "buy" ? (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-primary" />
                                <span className="text-xs text-primary">{t("dashboard.trades.buy")}</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="w-3 h-3 text-destructive" />
                                <span className="text-xs text-destructive">{t("dashboard.trades.sell")}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatPrice(Number(trade.entry_price), trade.symbol)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatPrice(trade.exit_price ? Number(trade.exit_price) : null, trade.symbol)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Number(trade.quantity).toLocaleString(localeStr, { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {pnl !== null ? (
                            <span className={pnl >= 0 ? "text-primary" : "text-destructive"}>
                              {formatPnL(pnl, trade.symbol)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={trade.status === "open" ? "pending" : "secondary"} className="text-xs">
                            {trade.status === "open" ? t("dashboard.trades.open") : t("dashboard.trades.closed")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeHistory;
