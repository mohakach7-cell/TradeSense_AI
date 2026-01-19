import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";

const Profile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          toast({
            title: t("common.error"),
            description: t("profile.fetchError"),
            variant: "destructive",
          });
        } else if (data) {
          setFullName(data.full_name || "");
        }
      }
      setLoading(false);
    };

    getProfile();
  }, [user, toast, t]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast({
        title: t("common.error"),
        description: t("profile.notLoggedIn"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating profile:", error);
      toast({
        title: t("common.error"),
        description: t("profile.updateError"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("common.success"),
        description: t("profile.updateSuccess"),
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/30">
              {t("nav.profile")}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              {t("profile.title")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("profile.description")}
            </p>
          </div>

          <div className="max-w-md mx-auto bg-card p-8 rounded-lg shadow-lg">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.loading") : t("common.save")}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;