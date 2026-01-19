import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PaymentCancelled = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-12">
        <Card variant="trading" className="max-w-md w-full text-center">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Paiement Annulé</CardTitle>
            <CardDescription className="text-base">
              Votre paiement a été annulé. Aucun montant n'a été débité de votre compte.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous pouvez réessayer à tout moment. Si vous avez des questions, n'hésitez pas à contacter notre support.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link to="/challenges" className="flex-1">
                <Button variant="hero" className="w-full gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Réessayer
                </Button>
              </Link>
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Accueil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default PaymentCancelled;
