import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollReveal } from "@/hooks/useScrollReveal";

const CTASection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 relative bg-primary/5">
      <div className="absolute inset-0 bg-grid-subtle opacity-40" />
      
      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 tracking-tight">
              {t("home.ctaTitle")} <span className="text-primary">{t("home.ctaTitleHighlight")}</span> ?
            </h2>
          </ScrollReveal>
          
          <ScrollReveal delay={200}>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              {t("home.ctaSubtitle")}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <Link to="/challenges">
              <Button size="lg" className="h-12 px-8 text-base gap-2">
                {t("home.startChallenge")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <p className="text-sm text-muted-foreground mt-8">
              {t("home.ctaFooter")}
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
