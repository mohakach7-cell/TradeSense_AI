import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Rocket, Shield, Clock, Loader2, CreditCard, Bitcoin, CheckCircle2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Plan configuration with DH pricing
const getPlans = (t: (key: string) => string) => [
  {
    id: "starter",
    name: t("challenges.starter"),
    icon: Zap,
    price: 200,
    priceDisplay: "200 DH",
    capital: "50 000 DH",
    capitalAmount: 5000,
    description: t("challenges.starterDesc"),
    featuresKeys: [
      "plans.starter.features.0",
      "plans.starter.features.1",
      "plans.starter.features.2",
      "plans.starter.features.3",
      "plans.starter.features.4",
      "plans.starter.features.5",
    ],
    profitTarget: 10,
    maxDailyLoss: 5,
    maxTotalLoss: 10,
    popular: false,
  },
  {
    id: "pro",
    name: t("challenges.pro"),
    icon: Crown,
    price: 500,
    priceDisplay: "500 DH",
    capital: "250 000 DH",
    capitalAmount: 25000,
    description: t("challenges.proDesc"),
    featuresKeys: [
      "plans.pro.features.0",
      "plans.pro.features.1",
      "plans.pro.features.2",
      "plans.pro.features.3",
      "plans.pro.features.4",
      "plans.pro.features.5",
      "plans.pro.features.6",
      "plans.pro.features.7",
    ],
    profitTarget: 10,
    maxDailyLoss: 5,
    maxTotalLoss: 10,
    popular: true,
  },
  {
    id: "elite",
    name: t("challenges.elite"),
    icon: Rocket,
    price: 1000,
    priceDisplay: "1000 DH",
    capital: "1 000 000 DH",
    capitalAmount: 100000,
    description: t("challenges.eliteDesc"),
    featuresKeys: [
      "plans.elite.features.0",
      "plans.elite.features.1",
      "plans.elite.features.2",
      "plans.elite.features.3",
      "plans.elite.features.4",
      "plans.elite.features.5",
      "plans.elite.features.6",
      "plans.elite.features.7",
      "plans.elite.features.8",
    ],
    profitTarget: 8,
    maxDailyLoss: 4,
    maxTotalLoss: 8,
    popular: false,
  },
];

const Challenges = () => {
  const { t, i18n } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingCrypto, setLoadingCrypto] = useState<string | null>(null);
  const [loadingPaypal, setLoadingPaypal] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [purchasedPlan, setPurchasedPlan] = useState<ReturnType<typeof getPlans>[0] | null>(null);

  const plans = getPlans(t);
  const isRTL = i18n.language === "ar";

  // Mock Payment Gateway - simulates payment and creates challenge
  const handleMockPayment = async (planId: string, provider: "cmi" | "crypto") => {
    if (!user) {
      toast({
        title: t("auth.loginRequired"),
        description: t("auth.pleaseLogin"),
      });
      navigate("/auth");
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    // Set loading state
    if (provider === "cmi") {
      setLoadingPlan(planId);
    } else {
      setLoadingCrypto(planId);
    }

    try {
      // Simulate payment processing (2-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

      // Create the challenge in database
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          user_id: user.id,
          plan: plan.id as "starter" | "pro" | "elite",
          status: "active",
          initial_balance: plan.capitalAmount,
          current_balance: plan.capitalAmount,
          profit_target_percent: plan.profitTarget,
          max_daily_loss_percent: plan.maxDailyLoss,
          max_total_loss_percent: plan.maxTotalLoss,
          daily_pnl: 0,
          total_pnl: 0,
          trading_days: 0,
          start_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          challenge_id: challenge.id,
          amount: plan.price,
          currency: "MAD",
          payment_status: "completed",
          payment_method: provider === "cmi" ? "CMI" : "Crypto",
          stripe_payment_id: `mock_${provider}_${Date.now()}`,
        });

      if (paymentError) {
        console.error("Payment record error:", paymentError);
        // Don't fail the whole flow if payment record fails
      }

      // Show success dialog
      setPurchasedPlan(plan);
      setSuccessDialogOpen(true);

      toast({
        title: t("challenges.paymentSuccess"),
        description: t("challenges.challengeActive"),
      });

    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: t("common.error"),
        description: t("common.error"),
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
      setLoadingCrypto(null);
    }
  };

  const handlePayPalPayment = async (planId: string) => {
    if (!user) {
      toast({
        title: t("auth.loginRequired"),
        description: t("auth.pleaseLogin"),
      });
      navigate("/auth");
      return;
    }
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setLoadingPaypal(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: { plan: planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Configuration PayPal indisponible");
    } catch (err: unknown) {
      console.error("Error creating PayPal order:", err);
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : "Échec de l'initialisation du paiement PayPal",
        variant: "destructive",
      });
    } finally {
      setLoadingPaypal(null);
    }
  };

  const handleGoToDashboard = () => {
    setSuccessDialogOpen(false);
    navigate("/dashboard");
  };

  const howItWorksSteps = [
    { step: "1", icon: Zap, titleKey: "challenges.step1", descKey: "challenges.step1Desc" },
    { step: "2", icon: Shield, titleKey: "challenges.step2", descKey: "challenges.step2Desc" },
    { step: "3", icon: Check, titleKey: "challenges.step3", descKey: "challenges.step3Desc" },
    { step: "4", icon: Clock, titleKey: "challenges.step4", descKey: "challenges.step4Desc" },
  ];

  return (
    <div className={`min-h-screen bg-background ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <Navbar />
      
      <main className="pt-24 pb-12">
        {/* Hero */}
        <div className="container mx-auto px-4 mb-12">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4 border-primary/30">
              {t("challenges.title")}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              {t("home.chooseChallenge")} <span className="text-gradient">{t("challenges.title")}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("home.chooseChallengeDesc")}
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">
              {t("challenges.howItWorks")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {howItWorksSteps.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
                    <item.icon className="w-7 h-7 text-primary" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{t(item.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(item.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                variant={plan.popular ? "gradient" : "trading"}
                className={`relative overflow-hidden transition-all duration-300 hover:transform hover:-translate-y-2 ${
                  plan.popular ? "border-primary/50 shadow-lg shadow-primary/10" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-lg">
                    {t("home.popular")}
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <plan.icon className={`w-7 h-7 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center pb-6">
                  <div className="mb-4">
                    <span className="text-4xl font-bold font-mono text-foreground">{plan.priceDisplay}</span>
                    <span className="text-muted-foreground ml-1">{t("home.perChallenge")}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 mb-6">
                    <span className="text-sm text-muted-foreground">{t("home.capital")}:</span>
                    <span className="font-mono font-bold text-primary">{plan.capital}</span>
                  </div>

                  <ul className="space-y-3 text-left" dir={isRTL ? "rtl" : "ltr"}>
                    {plan.featuresKeys.map((featureKey, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm text-muted-foreground">{t(featureKey)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button
                    variant={plan.popular ? "hero" : "outline"}
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => handleMockPayment(plan.id, "cmi")}
                    disabled={loadingPlan !== null || loadingCrypto !== null}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("challenges.processing")}
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        {t("challenges.payWithCMI")}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20 hover:text-orange-600"
                    onClick={() => handleMockPayment(plan.id, "crypto")}
                    disabled={loadingPlan !== null || loadingCrypto !== null}
                  >
                    {loadingCrypto === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("challenges.processing")}
                      </>
                    ) : (
                      <>
                        <Bitcoin className="w-4 h-4" />
                        {t("challenges.payWithCrypto")}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => handlePayPalPayment(plan.id)}
                    disabled={loadingPaypal !== null}
                  >
                    {loadingPaypal === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("challenges.processing")}
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        {t("challenges.payPaypal")}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <span>{t("challenges.securePayment")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <span>CMI & Crypto</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <span>{t("challenges.instantActivation")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <span>{t("challenges.support247")}</span>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">
              {t("challenges.rules")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card variant="trading" className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  {t("challenges.objectives")}
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {t("challenges.profitTarget")}: 8-10%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {t("challenges.minTradingDays")}: 5
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {t("challenges.unlimitedDuration")}
                  </li>
                </ul>
              </Card>

              <Card variant="trading" className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-destructive" />
                  {t("challenges.riskLimits")}
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    {t("challenges.maxDailyLoss")}: -4% à -5%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    {t("challenges.maxTotalLoss")}: -8% à -10%
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <DialogTitle className="text-2xl text-center">{t("challenges.paymentSuccess")}</DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <p>{t("challenges.challengeActive")} <strong className="text-foreground">{purchasedPlan?.name}</strong></p>
              <div className="mt-4 p-4 rounded-lg bg-secondary/50 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("home.capital")}:</span>
                  <span className="font-mono font-semibold text-primary">{purchasedPlan?.capital}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("challenges.profitTarget")}:</span>
                  <span className="font-mono font-semibold text-primary">+{purchasedPlan?.profitTarget}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("challenges.maxDailyLoss")}:</span>
                  <span className="font-mono font-semibold text-destructive">-{purchasedPlan?.maxDailyLoss}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("challenges.maxTotalLoss")}:</span>
                  <span className="font-mono font-semibold text-destructive">-{purchasedPlan?.maxTotalLoss}%</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button variant="hero" onClick={handleGoToDashboard} className="w-full">
              {t("challenges.startTrading")}
            </Button>
            <Button variant="outline" onClick={() => setSuccessDialogOpen(false)} className="w-full">
              {t("common.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Challenges;
