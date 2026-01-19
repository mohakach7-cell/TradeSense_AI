import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr, enUS, arMA } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
}

const PaymentHistory = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentLocale = i18n.language === "fr" ? fr : i18n.language === "ar" ? arMA : enUS;
  const isRtl = i18n.language === "ar";
  const localeStr = i18n.language === "ar" ? "ar-MA" : i18n.language === "fr" ? "fr-MA" : "en-US";

  useEffect(() => {
    if (!user) return;

    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, currency, payment_status, payment_method, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setPayments(data);
      }
      setIsLoading(false);
    };

    fetchPayments();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "succeeded":
        return <Badge variant="funded">{t("dashboard.payments.status.paid")}</Badge>;
      case "pending":
        return <Badge variant="live">{t("dashboard.payments.status.pending")}</Badge>;
      case "failed":
        return <Badge variant="destructive">{t("dashboard.payments.status.failed")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(localeStr, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card variant="trading">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="trading" dir={isRtl ? "rtl" : "ltr"}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t("dashboard.payments.title")}</CardTitle>
            <CardDescription>{t("dashboard.payments.subtitle")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("dashboard.payments.noPayments")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{t("dashboard.payments.table.date")}</TableHead>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{t("dashboard.payments.table.amount")}</TableHead>
                  <TableHead className={isRtl ? "text-right" : "text-left"}>{t("dashboard.payments.table.method")}</TableHead>
                  <TableHead className={isRtl ? "text-left" : "text-right"}>{t("dashboard.payments.table.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {format(new Date(payment.created_at), "dd MMM yyyy", { locale: currentLocale })}
                    </TableCell>
                    <TableCell className="font-mono text-primary">
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.payment_method === "card" ? t("dashboard.payments.method.card") : (payment.payment_method || t("dashboard.payments.method.card"))}
                    </TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}>
                      {getStatusBadge(payment.payment_status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
