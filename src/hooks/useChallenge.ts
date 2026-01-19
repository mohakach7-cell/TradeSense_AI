import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
type Trade = Database["public"]["Tables"]["trades"]["Row"];

const MAD_RATE = 10;
const MOROCCAN_SYMBOLS = ["IAM", "ATW", "BCP", "LHM", "CIH", "TQM"];

export const useChallenge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to convert price/pnl to USD if it's from a Moroccan symbol
  const toUSD = (amount: number, symbol: string) => {
    return MOROCCAN_SYMBOLS.includes(symbol) ? amount / MAD_RATE : amount;
  };

  // Helper to convert price/pnl to DH for display
  const toDH = (amount: number, symbol: string) => {
    return MOROCCAN_SYMBOLS.includes(symbol) ? amount : amount * MAD_RATE;
  };

  // Fetch active challenge
  const fetchChallenge = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Auto-correct legacy balance units (50,000 -> 5,000)
      if (data) {
        const ib = Number(data.initial_balance);
        if (ib >= 50000) {
          console.log("Correcting legacy balance units for challenge:", data.id);
          const factor = 10;
          const { data: correctedData, error: updateError } = await supabase
            .from("challenges")
            .update({
              initial_balance: ib / factor,
              current_balance: Number(data.current_balance) / factor,
              total_pnl: Number(data.total_pnl) / factor,
              daily_pnl: Number(data.daily_pnl) / factor,
            })
            .eq("id", data.id)
            .select()
            .single();
          
          if (!updateError && correctedData) {
            setChallenge(correctedData);
            return;
          }
        }
      }
      
      setChallenge(data);
    } catch (error) {
      console.error("Error fetching challenge:", error);
    }
  };

  // Fetch all challenges for the user
  const fetchAllChallenges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllChallenges(data || []);
    } catch (error) {
      console.error("Error fetching all challenges:", error);
    }
  };

  // Fetch trades for the active challenge
  const fetchTrades = async () => {
    if (!user || !challenge) return;

    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error("Error fetching trades:", error);
    }
  };

  // Fetch all trades for the user (for historical performance)
  const fetchAllTrades = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllTrades(data || []);
    } catch (error) {
      console.error("Error fetching all trades:", error);
    }
  };

  // Open a new trade
  const openTrade = async (
    symbol: string,
    direction: "buy" | "sell",
    entryPrice: number,
    quantity: number
  ) => {
    if (!user || !challenge) {
      toast({
        title: "Erreur",
        description: "Aucun challenge actif trouvé.",
        variant: "destructive",
      });
      return null;
    }

    if (challenge.status !== "active") {
      toast({
        title: "Challenge terminé",
        description: "Votre challenge n'est plus actif.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("trades")
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          symbol,
          direction,
          entry_price: entryPrice,
          quantity,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Position ouverte",
        description: `${direction.toUpperCase()} ${quantity} ${symbol} @ ${toDH(entryPrice, symbol).toLocaleString("fr-MA", { minimumFractionDigits: 2 })} DH`,
      });

      return data;
    } catch (error) {
      console.error("Error opening trade:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la position.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Close an existing trade
  const closeTrade = async (tradeId: string, exitPrice: number) => {
    if (!user || !challenge) return null;

    try {
      // Get the trade first
      const { data: trade, error: fetchError } = await supabase
        .from("trades")
        .select("*")
        .eq("id", tradeId)
        .single();

      if (fetchError || !trade) throw fetchError || new Error("Trade not found");

      // Calculate P&L in the currency of the symbol
      const entryPrice = Number(trade.entry_price);
      const quantity = Number(trade.quantity);
      let symbolPnL: number;

      if (trade.direction === "buy") {
        symbolPnL = (exitPrice - entryPrice) * quantity;
      } else {
        symbolPnL = (entryPrice - exitPrice) * quantity;
      }

      // Convert P&L to USD for the challenge balance
      const pnlInUSD = toUSD(symbolPnL, trade.symbol);

      // Update the trade
      const { data: updatedTrade, error: updateError } = await supabase
        .from("trades")
        .update({
          exit_price: exitPrice,
          pnl: symbolPnL, // Store P&L in symbol's currency to match prices
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", tradeId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update challenge P&L (always in USD)
      await updateChallengePnL(pnlInUSD);

      toast({
        title: "Position fermée",
        description: `P&L: ${symbolPnL >= 0 ? "+" : ""}${toDH(pnlInUSD, trade.symbol).toLocaleString("fr-MA", { minimumFractionDigits: 2 })} DH`,
        variant: symbolPnL >= 0 ? "default" : "destructive",
      });

      return updatedTrade;
    } catch (error) {
      console.error("Error closing trade:", error);
      toast({
        title: "Erreur",
        description: "Impossible de fermer la position.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update challenge P&L after closing a trade
  const updateChallengePnL = async (tradePnL: number) => {
    if (!challenge) return;

    try {
      const newDailyPnL = Number(challenge.daily_pnl) + tradePnL;
      const newTotalPnL = Number(challenge.total_pnl) + tradePnL;
      const newBalance = Number(challenge.current_balance) + tradePnL;

      const { error } = await supabase
        .from("challenges")
        .update({
          daily_pnl: newDailyPnL,
          total_pnl: newTotalPnL,
          current_balance: newBalance,
        })
        .eq("id", challenge.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating challenge P&L:", error);
    }
  };

  // Reset daily P&L (should be called at market open)
  const resetDailyPnL = async () => {
    if (!challenge) return;

    try {
      const { error } = await supabase
        .from("challenges")
        .update({
          daily_pnl: 0,
          trading_days: challenge.trading_days + 1,
        })
        .eq("id", challenge.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error resetting daily P&L:", error);
    }
  };

  // Calculate unrealized P&L in USD
  const calculateUnrealizedPnL = (currentPrices: Record<string, number>) => {
    return trades
      .filter((t) => t.status === "open")
      .reduce((total, trade) => {
        const currentPrice = currentPrices[trade.symbol] || Number(trade.entry_price);
        const entryPrice = Number(trade.entry_price);
        const quantity = Number(trade.quantity);
        
        let symbolPnL: number;
        if (trade.direction === "buy") {
          symbolPnL = (currentPrice - entryPrice) * quantity;
        } else {
          symbolPnL = (entryPrice - currentPrice) * quantity;
        }
        
        return total + toUSD(symbolPnL, trade.symbol);
      }, 0);
  };

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchChallenge(), fetchAllChallenges(), fetchAllTrades()]);
      setIsLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Fetch trades when challenge changes
  useEffect(() => {
    if (challenge) {
      fetchTrades();
    }
  }, [challenge?.id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user || !challenge) return;

    const tradesChannel = supabase
      .channel("trades-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trades",
          filter: `challenge_id=eq.${challenge.id}`,
        },
        () => {
          fetchTrades();
          fetchAllTrades();
        }
      )
      .subscribe();

    const challengeChannel = supabase
      .channel("challenge-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${challenge.id}`,
        },
        (payload) => {
          setChallenge(payload.new as Challenge);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(challengeChannel);
    };
  }, [user, challenge?.id]);

  return {
    challenge,
    allChallenges,
    trades,
    allTrades,
    isLoading,
    openTrade,
    closeTrade,
    calculateUnrealizedPnL,
    resetDailyPnL,
    refetch: fetchChallenge,
  };
};
