import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollReveal } from "@/hooks/useScrollReveal";

const PricingSection = () => {
  const { t } = useTranslation();

  const plans = [
    {
      name: t("challenges.starter"),
      icon: Zap,
      price: "200 DH",
      capital: "50 000 DH",
      description: t("challenges.starterDesc"),
      features: [
        `${t("home.capital")}: 50 000 DH`,
        `${t("challenges.profitTarget")}: +10%`,
        `${t("challenges.maxDailyLoss")}: -5%`,
        `${t("challenges.maxTotalLoss")}: -10%`,
        t("challenges.unlimitedDuration"),
      ],
      popular: false,
    },
    {
      name: t("challenges.pro"),
      icon: Crown,
      price: "500 DH",
      capital: "250 000 DH",
      description: t("challenges.proDesc"),
      features: [
        `${t("home.capital")}: 250 000 DH`,
        `${t("challenges.profitTarget")}: +10%`,
        `${t("challenges.maxDailyLoss")}: -5%`,
        `${t("challenges.maxTotalLoss")}: -10%`,
        t("challenges.unlimitedDuration"),
      ],
      popular: true,
    },
    {
      name: t("challenges.elite"),
      icon: Rocket,
      price: "1000 DH",
      capital: "1 000 000 DH",
      description: t("challenges.eliteDesc"),
      features: [
        `${t("home.capital")}: 1 000 000 DH`,
        `${t("challenges.profitTarget")}: +8%`,
        `${t("challenges.maxDailyLoss")}: -4%`,
        `${t("challenges.maxTotalLoss")}: -8%`,
        t("challenges.unlimitedDuration"),
      ],
      popular: false,
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="container relative z-10 mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="text-sm font-medium text-foreground">{t("home.challengesTitle")}</span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              {t("home.chooseChallenge")}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-muted-foreground text-lg">
              {t("home.chooseChallengeDesc")}
            </p>
          </ScrollReveal>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <ScrollReveal key={plan.name} delay={150 + index * 100} direction="up">
              <div
                className={`relative rounded-xl p-6 h-full flex flex-col ${
                  plan.popular 
                    ? "card-featured" 
                    : "card-premium"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    {t("home.popular")}
                  </div>
                )}

                <div className="text-center mb-6 pt-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                    plan.popular ? "bg-primary/20" : "bg-secondary"
                  }`}>
                    <plan.icon className={`w-6 h-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="text-center mb-6">
                  <span className="text-4xl font-bold font-mono tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground text-sm ml-1">{t("home.perChallenge")}</span>
                </div>

                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/80">
                    <span className="text-sm text-muted-foreground">{t("home.capital")}:</span>
                    <span className="font-mono font-semibold text-primary">{plan.capital}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        plan.popular ? "bg-primary/20" : "bg-secondary"
                      }`}>
                        <Check className={`w-3 h-3 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/challenges" className="w-full mt-auto">
                  <Button 
                    variant={plan.popular ? "default" : "outline"} 
                    className="w-full"
                  >
                    {plan.popular ? t("home.start") : t("home.choose")}
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Trust Indicators */}
        <ScrollReveal delay={500}>
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-sm text-muted-foreground">
            {[t("home.securePayment"), t("home.refund7Days"), t("home.instantAccess")].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-success" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default PricingSection;
