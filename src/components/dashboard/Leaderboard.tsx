import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Medal, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LeaderboardEntry = {
  rank: number;
  full_name: string;
  profit: string;
  trades: number;
  win_rate: string;
  status: string;
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center font-mono font-bold text-muted-foreground">{rank}</span>;
  }
};

const getStatusBadge = (status: string, t: any) => {
  switch (status) {
    case "funded":
      return <Badge variant="funded">{t("leaderboard.funded")}</Badge>;
    case "passed":
      return <Badge variant="passed">{t("leaderboard.passed")}</Badge>;
    case "failed":
      return <Badge variant="failed">{t("dashboard.failed")}</Badge>;
    default:
      return <Badge variant="pending">{t("leaderboard.inProgress")}</Badge>;
  }
};

const Leaderboard = () => {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isRtl = i18n.language === "ar";
  const localeStr = i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US";

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_leaderboard");
        
        if (error) {
          console.error(t("leaderboard.errors.fetchTraders"), error);
          setEntries([]);
        } else if (data) {
          const formatted = data.map((trader: any, index: number) => ({
            rank: index + 1,
            full_name: trader.full_name || t("leaderboard.anonymousTrader"),
            profit: (trader.profit_percent >= 0 ? "+" : "") + trader.profit_percent.toFixed(1) + "%",
            trades: trader.total_trades || 0,
            win_rate: trader.total_trades > 0 
              ? Math.round((trader.winning_trades / trader.total_trades) * 100) + "%" 
              : "0%",
            status: trader.status || "active"
          }));
          setEntries(formatted);
        }
      } catch (err) {
        console.error(t("leaderboard.errors.critical"), err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [i18n.language]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-MA" : "fr-MA", {
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, [i18n.language]);

  return (
    <Card variant="trading" dir={isRtl ? "rtl" : "ltr"}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{t("leaderboard.top10Monthly")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("leaderboard.monthlyRankingDesc")}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30">{monthLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-4">{t("leaderboard.trader")}</div>
            <div className="col-span-2 text-right">{t("leaderboard.profit")}</div>
            <div className="col-span-2 text-right">{t("leaderboard.trades")}</div>
            <div className="col-span-1 text-right">{t("leaderboard.winRate")}</div>
            <div className="col-span-2 text-right">{t("leaderboard.status")}</div>
          </div>

          {loading && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {t("leaderboard.loading")}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {t("leaderboard.noTraders")}
            </div>
          )}

          {!loading &&
            entries.map((trader, index) => {
              return (
                <div
                  key={`${trader.full_name}-${trader.rank}`}
                  className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-lg items-center transition-all hover:bg-secondary/30 ${
                    Number(trader.rank) <= 3 ? "bg-primary/5" : ""
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="col-span-1 flex items-center">{getRankIcon(Number(trader.rank))}</div>
                  <div className="col-span-4">
                    <div className="font-semibold text-foreground">{trader.full_name}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-mono font-bold text-primary">
                      {trader.profit}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-mono text-muted-foreground">{trader.trades}</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="font-mono text-muted-foreground">{trader.win_rate}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    {getStatusBadge(trader.status, t)}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-primary">
              {isRtl ? "1.25 مليون درهم" : "1.25M DH"}
            </div>
            <div className="text-xs text-muted-foreground">{t("leaderboard.totalPayouts")}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-foreground">89%</div>
            <div className="text-xs text-muted-foreground">{t("leaderboard.successRate")}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-foreground">
              {Number(1247).toLocaleString(localeStr)}
            </div>
            <div className="text-xs text-muted-foreground">{t("leaderboard.activeTraders")}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
