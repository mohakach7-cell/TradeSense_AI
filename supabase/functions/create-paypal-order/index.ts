import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

const getCorsHeaders = (origin: string): Record<string, string> => {
  const allowed = isAllowedOrigin(origin);
  console.log(`[CORS] Origin: "${origin}", Allowed: ${allowed}`);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

// Valid plans whitelist
const VALID_PLANS = ["starter", "pro", "elite"] as const;
type ValidPlan = typeof VALID_PLANS[number];

const CHALLENGE_PLANS: Record<ValidPlan, { price: number; initial_balance: number; profit_target_percent: number; max_daily_loss_percent: number; max_total_loss_percent: number }> = {
  starter: { price: 99, initial_balance: 5000, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10 },
  pro: { price: 249, initial_balance: 25000, profit_target_percent: 10, max_daily_loss_percent: 5, max_total_loss_percent: 10 },
  elite: { price: 499, initial_balance: 100000, profit_target_percent: 8, max_daily_loss_percent: 4, max_total_loss_percent: 8 },
};

// Validation helper
function isValidPlan(plan: unknown): plan is ValidPlan {
  return typeof plan === "string" && VALID_PLANS.includes(plan as ValidPlan);
}

const logStep = (step: string, details?: unknown) => {
  console.log(`[PAYPAL-CREATE-ORDER] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

async function getPayPalAccessToken(userToken?: string): Promise<{ token: string; apiBase: string }> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  let settings: { enabled?: boolean; client_id?: string; secret?: string; mode?: string } | null = null;

  if (service) {
    const supabaseAdmin = createClient(url, service, { auth: { persistSession: false } });
    const { data } = await supabaseAdmin
      .from("paypal_settings")
      .select("enabled, client_id, secret, mode")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    settings = data;
  }

  if (!settings && userToken) {
    const supabaseUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${userToken}` } } });
    const { data } = await supabaseUser
      .from("paypal_settings")
      .select("enabled, client_id, secret, mode")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    settings = data;
  }

  const envClientId = (Deno.env.get("PAYPAL_CLIENT_ID") ?? "").trim();
  const envSecret = (Deno.env.get("PAYPAL_SECRET") ?? "").trim();
  const envMode = (Deno.env.get("PAYPAL_MODE") ?? "").trim().toLowerCase();

  const hasEnvCreds = !!envClientId && !!envSecret;
  const clientId = (settings?.client_id ?? envClientId).trim();
  const clientSecret = (settings?.secret ?? envSecret).trim();
  const mode = ((settings?.mode ?? (envMode === "live" ? "live" : "sandbox")) || "sandbox").trim();
  const enabled = settings ? settings.enabled === true : hasEnvCreds;

  if (!enabled) {
    throw new Error("PayPal désactivé. Activez-le dans SuperAdmin ou définissez PAYPAL_CLIENT_ID/PAYPAL_SECRET.");
  }

  if (!clientId || !clientSecret) {
    throw new Error("Identifiants PayPal non configurés");
  }

  const apiBase = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const auth = btoa(`${clientId}:${clientSecret}`);
  async function fetchWithRetry(u: string, o: RequestInit, r = 2, d = 400): Promise<Response> {
    let attempt = 0;
    while (true) {
      try {
        const res = await fetch(u, o);
        if (!res.ok && res.status >= 500 && attempt < r) {
          attempt++;
          await new Promise((s) => setTimeout(s, d * attempt));
          continue;
        }
        return res;
      } catch {
        if (attempt < r) {
          attempt++;
          await new Promise((s) => setTimeout(s, d * attempt));
          continue;
        }
        throw new Error("Network error");
      }
    }
  }
  const response = await fetchWithRetry(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: "grant_type=client_credentials",
  });

  const paypalDebugId = response.headers.get("paypal-debug-id") || undefined;
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayPal auth failed (${response.status})${paypalDebugId ? ` [debug_id: ${paypalDebugId}]` : ""}: ${data.error_description || data.error || "Unknown error"}`
    );
  }

  return { token: data.access_token, apiBase };
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl) {
      throw new Error("Missing SUPABASE_URL environment variable");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    logStep("Function started");
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      logStep("Error parsing request body", e);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { plan, test } = body;

    if (test === true) {
      try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ success: false, error: "No authorization header provided" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        const user = data?.user;
        const { token: accessToken, apiBase } = await getPayPalAccessToken(token);
        const logPayload = {
          user_id: user?.id ?? null,
          event: "test",
          status: "success",
          message: "OAuth token retrieved",
          details: { apiBase }
        };
        try {
          await supabaseAdmin.from("paypal_logs").insert(logPayload);
        } catch {
          try {
            const userClient = createClient(
              Deno.env.get("SUPABASE_URL") ?? "",
              Deno.env.get("SUPABASE_ANON_KEY") ?? "",
              { global: { headers: { Authorization: `Bearer ${token}` } } }
            );
            await userClient.from("paypal_logs").insert(logPayload);
          } catch (e) {
            console.warn("Failed to insert PayPal test log via user client", e);
          }
        }
        return new Response(JSON.stringify({ success: true, apiBase }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logStep("Test connection error", { message });
        return new Response(JSON.stringify({ success: false, error: message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    if (!isValidPlan(plan)) {
      logStep("Invalid plan provided", { plan });
      return new Response(
        JSON.stringify({ error: "Invalid plan selected. Valid plans: starter, pro, elite" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const planConfig = CHALLENGE_PLANS[plan];
    logStep("Plan selected", { plan, price: planConfig.price });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    const user = data?.user;
    
    if (authError || !user?.email) {
      logStep("Authentication failed", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    logStep("User authenticated", { userId: user.id });

    // Get PayPal access token
    const { token: accessToken, apiBase } = await getPayPalAccessToken(token);
    logStep("PayPal access token obtained");

    async function fetchWithRetry(u: string, o: RequestInit, r = 2, d = 400): Promise<Response> {
      let attempt = 0;
      while (true) {
        try {
          const res = await fetch(u, o);
          if (!res.ok && res.status >= 500 && attempt < r) {
            attempt++;
            await new Promise((s) => setTimeout(s, d * attempt));
            continue;
          }
          return res;
        } catch {
          if (attempt < r) {
            attempt++;
            await new Promise((s) => setTimeout(s, d * attempt));
            continue;
          }
          throw new Error("Network error");
        }
      }
    }
    const orderResponse = await fetchWithRetry(`${apiBase}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "USD",
            value: planConfig.price.toString(),
          },
          description: `TradeSense AI - Challenge ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          custom_id: JSON.stringify({
            user_id: user.id,
            plan,
            initial_balance: planConfig.initial_balance,
            profit_target_percent: planConfig.profit_target_percent,
            max_daily_loss_percent: planConfig.max_daily_loss_percent,
            max_total_loss_percent: planConfig.max_total_loss_percent,
          }),
        }],
        application_context: {
          brand_name: "TradeSense AI",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${origin}/payment-success?provider=paypal&plan=${encodeURIComponent(plan)}`,
          cancel_url: `${origin}/payment-cancelled`,
        },
      }),
    });

    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      throw new Error(`PayPal order creation failed: ${order.message || JSON.stringify(order)}`);
    }

    logStep("PayPal order created", { orderId: order.id });

    const approvalUrl = order.links?.find((link: { rel: string; href: string }) => link.rel === "approve")?.href;
    if (!approvalUrl) {
      throw new Error("PayPal approval URL not found");
    }

    try {
      await supabaseAdmin.from("paypal_logs").insert({
        user_id: user.id,
        event: "create_order",
        status: "success",
        message: "Order created",
        details: { orderId: order.id, plan }
      });
    } catch {
      try {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        await userClient.from("paypal_logs").insert({
          user_id: user.id,
          event: "create_order",
          status: "success",
          message: "Order created",
          details: { orderId: order.id, plan }
        });
      } catch (e) {
        console.warn("Failed to insert PayPal create_order success log via user client", e);
      }
    }

    return new Response(JSON.stringify({ 
      url: approvalUrl,
      orderId: order.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[PAYPAL-CREATE-ORDER] Fatal error: ${message}`, err);
    logStep("Function error", { message });
    
    // Log to database if possible
    try {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader ? authHeader.replace("Bearer ", "") : "";
      const { data } = token ? await supabaseClient.auth.getUser(token) : { data: undefined };
      const userId = data?.user?.id ?? null;
      
      await supabaseAdmin.from("paypal_logs").insert({
        user_id: userId,
        event: "create_order",
        status: "error",
        message: message,
        details: { error: String(err) }
      });
    } catch (logErr) {
      console.warn("Failed to write PayPal error log:", logErr);
    }

    return new Response(JSON.stringify({ error: message, details: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
