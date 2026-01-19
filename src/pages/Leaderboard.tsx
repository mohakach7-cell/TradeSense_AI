import { useTranslation } from "react-i18next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LeaderboardComponent from "@/components/dashboard/Leaderboard";
import { Badge } from "@/components/ui/badge";

const LeaderboardPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <div className={`min-h-screen bg-background ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30">
              {t("leaderboard.title")}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              {i18n.language === "ar" ? (
                <>
                  <span className="text-gradient">{t("leaderboard.trader")}</span> {t("common.top", "أفضل")}
                </>
              ) : (
                <>
                  Top <span className="text-gradient">{t("leaderboard.trader")}s</span>
                </>
              )}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("home.leaderboardDescription", "Découvrez les meilleurs traders de notre communauté et suivez leur progression.")}
            </p>
          </div>

          {/* Leaderboard */}
          <div className="max-w-4xl mx-auto">
            <LeaderboardComponent />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LeaderboardPage;
