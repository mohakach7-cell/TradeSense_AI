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
  if (!origin || origin === 'null') return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Permissive check for localhost and 127.0.0.1 with any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
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

// Challenge plans configuration
const CHALLENGE_PLANS = {
  starter: {
    price_id: "price_1Sjo30RDLrjqQ78sGUcYola7",
    initial_balance: 5000,
    profit_target_percent: 10,
    max_daily_loss_percent: 5,
    max_total_loss_percent: 10,
  },
  pro: {
    price_id: "price_1Sjo3WRDLrjqQ78sNVuYkkDJ",
    initial_balance: 25000,
    profit_target_percent: 10,
    max_daily_loss_percent: 5,
    max_total_loss_percent: 10,
  },
  elite: {
    price_id: "price_1Sjo3jRDLrjqQ78sJJPcwXvl",
    initial_balance: 100000,
    profit_target_percent: 8,
    max_daily_loss_percent: 4,
    max_total_loss_percent: 8,
  },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (!supabaseUrl) {
      throw new Error("Missing SUPABASE_URL environment variable");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    logStep("Function started");

    // Get plan from request body
    const { plan } = await req.json();
    if (!plan || !CHALLENGE_PLANS[plan as keyof typeof CHALLENGE_PLANS]) {
      throw new Error("Invalid plan selected");
    }
    const planConfig = CHALLENGE_PLANS[plan as keyof typeof CHALLENGE_PLANS];
    logStep("Plan selected", { plan, priceId: planConfig.price_id });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: planConfig.price_id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${origin}/payment-cancelled`,
      metadata: {
        user_id: user.id,
        plan: plan,
        initial_balance: planConfig.initial_balance.toString(),
        profit_target_percent: planConfig.profit_target_percent.toString(),
        max_daily_loss_percent: planConfig.max_daily_loss_percent.toString(),
        max_total_loss_percent: planConfig.max_total_loss_percent.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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