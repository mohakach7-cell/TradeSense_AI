import { useTranslation } from "react-i18next";
import { 
  Brain, 
  BarChart3, 
  Shield, 
  Globe, 
  Wallet, 
  Trophy,
  LineChart,
  Bot,
} from "lucide-react";
import { ScrollReveal } from "@/hooks/useScrollReveal";

const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Brain,
      title: t("home.aiAssistant"),
      description: t("home.aiAssistantDesc"),
    },
    {
      icon: BarChart3,
      title: t("home.liveDataTitle"),
      description: t("home.liveDataTitleDesc"),
    },
    {
      icon: Shield,
      title: t("home.riskManagementTitle"),
      description: t("home.riskManagementTitleDesc"),
    },
    {
      icon: Globe,
      title: t("home.globalMarkets"),
      description: t("home.globalMarketsDesc"),
    },
    {
      icon: Wallet,
      title: t("home.flexiblePayment"),
      description: t("home.flexiblePaymentDesc"),
    },
    {
      icon: Trophy,
      title: t("home.leaderboardTitle"),
      description: t("home.leaderboardTitleDesc"),
    },
    {
      icon: LineChart,
      title: t("home.proCharts"),
      description: t("home.proChartsDesc"),
    },
    {
      icon: Bot,
      title: t("home.aiSignals"),
      description: t("home.aiSignalsDesc"),
    },
  ];

  return (
    <section className="py-24 relative bg-secondary/30">
      <div className="container relative z-10 mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="text-sm font-medium text-foreground">{t("home.features")}</span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              {t("home.featuresTitle")}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-muted-foreground text-lg">
              {t("home.featuresSubtitle")}
            </p>
          </ScrollReveal>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={100 + index * 50} direction="up">
              <div className="card-premium p-5 rounded-xl h-full">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
