import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Dynamic CORS configuration - restrict to allowed origins
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://lovable.dev",
];

const isAllowedOrigin = (origin: string): boolean => {
  // Always allow for local development
  if (!origin || origin === 'null') return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith("http://localhost:")) return true;
  if (origin.startsWith("http://127.0.0.1:")) return true;
  if (origin.endsWith(".lovable.app") && origin.startsWith("https://")) return true;
  if (origin.endsWith(".lovableproject.com") && origin.startsWith("https://")) return true;
  const prodDomain = Deno.env.get("ALLOWED_ORIGIN");
  if (prodDomain && origin === prodDomain) return true;
  return false;
};

const getCorsHeaders = (origin: string): Record<string, string> => ({
  "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

// Valid plans whitelist
const VALID_PLANS = ["starter", "pro", "elite"] as const;
type ValidPlan = typeof VALID_PLANS[number];

// Validation helpers
function isValidPlan(plan: unknown): plan is ValidPlan {
  return typeof plan === "string" && VALID_PLANS.includes(plan as ValidPlan);
}

function parseAndValidateNumber(value: unknown, defaultValue: number, min: number, max: number): number {
  const parsed = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : NaN;
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const body = await req.json();
    const { session_id, plan } = body;

    // Validate session_id
    if (!session_id || typeof session_id !== "string" || session_id.length > 500) {
      return new Response(
        JSON.stringify({ error: "Invalid session ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Session ID received", { session_id, plan });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    
    if (authError || !user) {
      logStep("Authentication failed", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    logStep("User authenticated", { userId: user.id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { status: session.payment_status, metadata: session.metadata });

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Extract and validate challenge configuration from metadata
    const metadata = session.metadata || {};
    
    // Validate plan - use metadata.plan if valid, fallback to request plan if valid, otherwise default
    let challengePlan: ValidPlan = "starter";
    if (isValidPlan(metadata.plan)) {
      challengePlan = metadata.plan;
    } else if (isValidPlan(plan)) {
      challengePlan = plan;
    }
    
    // Validate numeric values with sensible ranges
    const initialBalance = parseAndValidateNumber(metadata.initial_balance, 5000, 1000, 1000000);
    const profitTargetPercent = parseAndValidateNumber(metadata.profit_target_percent, 10, 1, 100);
    const maxDailyLossPercent = parseAndValidateNumber(metadata.max_daily_loss_percent, 5, 1, 100);
    const maxTotalLossPercent = parseAndValidateNumber(metadata.max_total_loss_percent, 10, 1, 100);

    logStep("Validated metadata", { 
      challengePlan, 
      initialBalance, 
      profitTargetPercent, 
      maxDailyLossPercent, 
      maxTotalLossPercent 
    });

    // Check if challenge already exists for this session
    const { data: existingPayment } = await supabaseClient
      .from("payments")
      .select("id, challenge_id")
      .eq("stripe_payment_id", session.payment_intent as string)
      .maybeSingle();

    if (existingPayment?.challenge_id) {
      logStep("Challenge already created for this payment", { challengeId: existingPayment.challenge_id });
      return new Response(JSON.stringify({ 
        success: true, 
        challenge_id: existingPayment.challenge_id,
        already_created: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create the challenge
    const { data: challenge, error: challengeError } = await supabaseClient
      .from("challenges")
      .insert({
        user_id: user.id,
        plan: challengePlan,
        status: "active",
        initial_balance: initialBalance,
        current_balance: initialBalance,
        profit_target_percent: profitTargetPercent,
        max_daily_loss_percent: maxDailyLossPercent,
        max_total_loss_percent: maxTotalLossPercent,
        start_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (challengeError) {
      logStep("Error creating challenge", { error: challengeError });
      throw new Error(`Failed to create challenge: ${challengeError.message}`);
    }
    logStep("Challenge created", { challengeId: challenge.id });

    // Record the payment
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        user_id: user.id,
        challenge_id: challenge.id,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || "USD",
        payment_method: "stripe",
        payment_status: "completed",
        stripe_payment_id: session.payment_intent as string,
      });

    if (paymentError) {
      logStep("Error recording payment", { error: paymentError });
    } else {
      logStep("Payment recorded");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      challenge_id: challenge.id,
      plan: challengePlan,
      initial_balance: initialBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...getCorsHeaders(req.headers.get("origin") || ""), "Content-Type": "application/json" },
      status: 500,
    });
  }
});