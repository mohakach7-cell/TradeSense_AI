import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, ArrowRight, Loader2, AlertCircle, Home, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challengeData, setChallengeData] = useState<{
    challenge_id: string;
    plan: string;
    initial_balance: number;
  } | null>(null);

  const sessionId = searchParams.get("session_id");
  const paypalToken = searchParams.get("token"); // PayPal order ID
  const plan = searchParams.get("plan");
  const provider = searchParams.get("provider") || "stripe";

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // If no user, redirect to auth
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check for payment identifier
    const paymentId = provider === "paypal" ? paypalToken : sessionId;
    if (!paymentId) {
      setError("Session de paiement non trouvée. Veuillez réessayer.");
      setIsVerifying(false);
      return;
    }

    if (provider === "paypal") {
      capturePaypalPayment();
    } else {
      verifyStripePayment();
    }
  }, [user, authLoading, sessionId, paypalToken, provider]);

  type CaptureResult = {
    success?: boolean;
    challenge_id: string;
    plan?: string;
    initial_balance?: number;
  };

  const handleSuccess = (data: CaptureResult) => {
    setChallengeData({
      challenge_id: data.challenge_id,
      plan: data.plan || plan || "starter",
      initial_balance: data.initial_balance || 5000,
    });
    toast({
      title: "Paiement confirmé !",
      description: "Votre challenge a été activé. Redirection vers le dashboard...",
    });
    setTimeout(() => {
      navigate("/dashboard");
    }, 3000);
  };

  const verifyStripePayment = async () => {
    try {
      console.log("Verifying Stripe payment with session:", sessionId);
      
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { session_id: sessionId, plan },
      });

      if (error) throw error;
      if (data?.success) {
        handleSuccess(data);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Error verifying Stripe payment:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le paiement. Contactez le support.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const capturePaypalPayment = async () => {
    try {
      console.log("Capturing PayPal payment with order:", paypalToken);
      
      const { data, error } = await supabase.functions.invoke("capture-paypal-order", {
        body: { orderId: paypalToken, plan },
      });

      if (error) throw error;
      if (data?.success) {
        handleSuccess(data);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Error capturing PayPal payment:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: "Impossible de finaliser le paiement PayPal. Contactez le support.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const planLabels: Record<string, string> = {
    starter: "Starter",
    pro: "Pro",
    elite: "Elite",
  };

  const planCapitals: Record<string, string> = {
    starter: "$5,000",
    pro: "$25,000",
    elite: "$100,000",
  };

  // Loading state
  if (authLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Vérification du paiement...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh] p-4">
          <Card variant="trading" className="max-w-lg w-full">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Erreur de vérification</CardTitle>
              <CardDescription className="text-base">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/challenges">
                <Button variant="hero" size="lg" className="w-full">
                  Réessayer
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="lg" className="w-full gap-2">
                  <Home className="w-4 h-4" />
                  Retour à l'accueil
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-20" />
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />

      <Card variant="glass" className="relative z-10 max-w-lg w-full border-primary/30">
        <CardHeader className="text-center pb-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl">
            Paiement Réussi !
          </CardTitle>
          <CardDescription className="text-base">
            Votre challenge de trading est maintenant actif
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {challengeData && (
            <div className="bg-secondary/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant="funded" className="text-sm">
                  {planLabels[challengeData.plan] || challengeData.plan}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Capital</span>
                <span className="font-mono font-bold text-primary text-lg">
                  {planCapitals[challengeData.plan] || `$${challengeData.initial_balance.toLocaleString()}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Objectif</span>
                <span className="font-mono font-bold text-foreground">
                  {challengeData.plan === "elite" ? "+8%" : "+10%"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Statut</span>
                <Badge variant="live" className="gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Actif
                </Badge>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center animate-pulse">
            Redirection automatique dans quelques secondes...
          </p>

          <div className="space-y-3">
            <Link to="/dashboard">
              <Button variant="hero" size="lg" className="w-full gap-2">
                <TrendingUp className="w-5 h-5" />
                Accéder au Dashboard
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/challenges">
              <Button variant="outline" size="lg" className="w-full gap-2">
                <Trophy className="w-4 h-4" />
                Mes Challenges
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="lg" className="w-full gap-2">
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Un email de confirmation vous a été envoyé. Bonne chance pour votre challenge !
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
