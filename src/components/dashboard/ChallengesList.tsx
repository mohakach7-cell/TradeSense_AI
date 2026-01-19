import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, TrendingDown, Clock, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr, enUS, arMA } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type Challenge = Database["public"]["Tables"]["challenges"]["Row"];

const ChallengesList = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const MAD_RATE = 10;
  const currentLocale = i18n.language === "fr" ? fr : i18n.language === "ar" ? arMA : enUS;
  const isRtl = i18n.language === "ar";
  const localeStr = i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US";

  useEffect(() => {
    if (!user) return;

    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setChallenges(data);
      }
      setIsLoading(false);
    };

    fetchChallenges();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="live" className="gap-1"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" />{t("dashboard.challenges.status.active")}</Badge>;
      case "passed":
        return <Badge variant="funded">{t("dashboard.challenges.status.passed")}</Badge>;
      case "failed":
        return <Badge variant="destructive">{t("dashboard.challenges.status.failed")}</Badge>;
      case "funded":
        return <Badge variant="funded" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{t("dashboard.funded")}</Badge>;
      case "pending":
        return <Badge variant="outline">{t("dashboard.pending")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const planLabels: Record<string, string> = {
    starter: t("challenges.starter"),
    pro: t("challenges.pro"),
    elite: t("challenges.elite"),
  };

  const getProgressPercent = (challenge: Challenge) => {
    const profitPercent = (Number(challenge.total_pnl) / Number(challenge.initial_balance)) * 100;
    const target = Number(challenge.profit_target_percent);
    return Math.min(Math.max((profitPercent / target) * 100, 0), 100);
  };

  const getPnLPercent = (challenge: Challenge) => {
    return ((Number(challenge.total_pnl) / Number(challenge.initial_balance)) * 100).toFixed(2);
  };

  if (isLoading) {
    return (
      <Card variant="trading">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="trading" dir={isRtl ? "rtl" : "ltr"}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("dashboard.challenges.title")}</CardTitle>
              <CardDescription>{t("dashboard.challenges.count", { count: challenges.length })}</CardDescription>
            </div>
          </div>
          <Link to="/challenges">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              {t("dashboard.challenges.new")}
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {challenges.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">{t("dashboard.challenges.noChallenges")}</p>
            <Link to="/challenges">
              <Button variant="hero" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                {t("dashboard.challenges.startChallenge")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => {
              const pnlPercent = parseFloat(getPnLPercent(challenge));
              const isPositive = pnlPercent >= 0;
              
              return (
                <div
                  key={challenge.id}
                  className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-semibold">
                        {planLabels[challenge.plan] || challenge.plan}
                      </Badge>
                      {getStatusBadge(challenge.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      <Clock className={cn("w-3 h-3 inline", isRtl ? "ml-1" : "mr-1")} />
                      {format(new Date(challenge.created_at), "dd MMM yyyy", { locale: currentLocale })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("dashboard.challenges.capital")}</p>
                      <p className="font-mono font-semibold text-foreground">
                        {(Number(challenge.initial_balance) * MAD_RATE).toLocaleString(localeStr)} DH
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("dashboard.challenges.currentBalance")}</p>
                      <p className="font-mono font-semibold text-foreground">
                        {(Number(challenge.current_balance) * MAD_RATE).toLocaleString(localeStr)} DH
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("dashboard.challenges.totalPnl")}</p>
                      <p className={`font-mono font-semibold flex items-center gap-1 ${isPositive ? "text-primary" : "text-destructive"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? "+" : ""}{pnlPercent}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("dashboard.challenges.tradingDays")}</p>
                      <p className="font-mono font-semibold text-foreground">
                        {challenge.trading_days}
                      </p>
                    </div>
                  </div>

                  {challenge.status === "active" && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">
                          {t("dashboard.challenges.targetProgress", { target: challenge.profit_target_percent })}
                        </span>
                        <span className="font-mono text-primary">
                          {getProgressPercent(challenge).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={getProgressPercent(challenge)} className="h-2" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChallengesList;
