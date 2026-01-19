import { } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TradingDashboardLive from "@/components/dashboard/TradingDashboardLive";
import PaymentHistory from "@/components/dashboard/PaymentHistory";
import ChallengesList from "@/components/dashboard/ChallengesList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Settings, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/hooks/useChallenge";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { challenge } = useChallenge();
  const navigate = useNavigate();

  

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto text-center p-8 rounded-xl border border-border bg-secondary/30">
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("auth.loginRequired")}</h1>
              <p className="text-muted-foreground mb-6">{t("auth.pleaseLogin")}</p>
              <Button onClick={() => navigate("/auth")}>{t("nav.login")}</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const planLabels: Record<string, string> = {
    starter: t("challenges.starter"),
    pro: t("challenges.pro"),
    elite: t("challenges.elite"),
  };

  const planCapitals: Record<string, string> = {
    starter: "$5,000",
    pro: "$25,000",
    elite: "$100,000",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {t("dashboard.title")}
                </h1>
                {challenge && (
                  <Badge variant="live" className="gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {t("dashboard.live")}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {t("dashboard.welcome")}, {user.email?.split("@")[0]}
                {challenge && (
                  <> • {t("dashboard.challenge")} {planLabels[challenge.plan] || challenge.plan} • {t("dashboard.capital")}: {planCapitals[challenge.plan] || `$${Number(challenge.initial_balance).toLocaleString()}`}</>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" title={t("common.notifications")}>
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" title={t("common.settings")}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                {t("nav.myAccount")}
              </Button>
            </div>
          </div>

          {/* Trading Dashboard */}
          <TradingDashboardLive />

          {/* Challenges & Payment History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <ChallengesList />
            <PaymentHistory />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
