import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Zap, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollReveal } from "@/hooks/useScrollReveal";

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-grid-subtle opacity-60" />
      
      {/* Subtle accent glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <ScrollReveal delay={0}>
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm font-medium text-foreground">{t("home.badge")}</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Main Heading */}
          <ScrollReveal delay={100}>
            <h1 className="text-center text-4xl md:text-6xl lg:text-7xl font-bold mb-8 tracking-tight leading-[1.1]">
              {t("home.title")}
              <br />
              <span className="text-primary">{t("home.titleHighlight")}</span> {t("home.titleEnd")}
            </h1>
          </ScrollReveal>

          {/* Subtitle */}
          <ScrollReveal delay={200}>
            <p className="text-center text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              {t("home.subtitle")} <span className="text-foreground font-semibold">{t("home.subtitleAmount")}</span> {t("home.subtitleEnd")}
            </p>
          </ScrollReveal>

          {/* CTA Buttons */}
          <ScrollReveal delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
              <Link to="/challenges">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base gap-2">
                  {t("home.startNow")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base gap-2">
                  <Play className="w-4 h-4" />
                  {t("home.viewDashboard")}
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal delay={400}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mb-24 text-center">
              {[
                { value: "$2.5M+", label: t("home.capitalManaged") },
                { value: "1,200+", label: t("home.activeTraders") },
                { value: "89%", label: t("home.successRate") },
                { value: "24/7", label: t("home.aiSupport") },
              ].map((stat, index) => (
                <div key={index}>
                  <div className="stat-value text-primary">{stat.value}</div>
                  <div className="stat-label mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: TrendingUp,
              title: t("home.tradingChallenges"),
              description: t("home.tradingChallengesDesc"),
            },
            {
              icon: Shield,
              title: t("home.riskManagement"),
              description: t("home.riskManagementDesc"),
            },
            {
              icon: Zap,
              title: t("home.liveData"),
              description: t("home.liveDataDesc"),
            },
          ].map((feature, index) => (
            <ScrollReveal key={index} delay={500 + index * 100} direction="up">
              <div className="card-premium p-6 rounded-xl h-full">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
