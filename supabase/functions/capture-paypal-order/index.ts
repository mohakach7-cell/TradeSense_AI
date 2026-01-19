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
  console.log(`[PAYPAL-CAPTURE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    const body = await req.json();
    const { orderId, plan } = body;

    // Validate orderId
    if (!orderId || typeof orderId !== "string" || orderId.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid order ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Capturing order", { orderId, plan });

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

    // Get PayPal access token
    const { token: accessToken, apiBase } = await getPayPalAccessToken(token);

    // Capture the order
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
    const captureResponse = await fetchWithRetry(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    const captureData = await captureResponse.json();
    if (!captureResponse.ok || captureData.status !== "COMPLETED") {
      await supabaseClient.from("paypal_logs").insert({
        user_id: user.id,
        event: "capture",
        status: "error",
        message: captureData.message || captureData.status || "Payment capture failed"
      });
      throw new Error(`Payment capture failed: ${captureData.message || captureData.status}`);
    }

    logStep("Payment captured", { status: captureData.status });

    // Extract metadata from custom_id with validation
    const customId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id 
      || captureData.purchase_units?.[0]?.custom_id;
    
    // Default metadata values
    let validatedPlan: ValidPlan = "starter";
    let initialBalance = 5000;
    let profitTargetPercent = 10;
    let maxDailyLossPercent = 5;
    let maxTotalLossPercent = 10;
    
    if (customId && typeof customId === "string") {
      try {
        const parsed = JSON.parse(customId);
        
        // Validate each field
        if (isValidPlan(parsed.plan)) {
          validatedPlan = parsed.plan;
        }
        initialBalance = parseAndValidateNumber(parsed.initial_balance, 5000, 1000, 1000000);
        profitTargetPercent = parseAndValidateNumber(parsed.profit_target_percent, 10, 1, 100);
        maxDailyLossPercent = parseAndValidateNumber(parsed.max_daily_loss_percent, 5, 1, 100);
        maxTotalLossPercent = parseAndValidateNumber(parsed.max_total_loss_percent, 10, 1, 100);
        
        logStep("Validated custom_id metadata", { 
          validatedPlan, 
          initialBalance, 
          profitTargetPercent, 
          maxDailyLossPercent, 
          maxTotalLossPercent 
        });
      } catch (e) {
        logStep("Could not parse custom_id, using defaults", { customId, error: String(e) });
      }
    } else {
      // Use plan from request if valid
      if (isValidPlan(plan)) {
        validatedPlan = plan;
      }
    }

    // Create challenge
    const { data: challenge, error: challengeError } = await supabaseClient
      .from("challenges")
      .insert({
        user_id: user.id,
        plan: validatedPlan,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        profit_target_percent: profitTargetPercent,
        max_daily_loss_percent: maxDailyLossPercent,
        max_total_loss_percent: maxTotalLossPercent,
        status: "active",
        start_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (challengeError) {
      logStep("Challenge creation error", { error: challengeError });
      throw new Error(`Failed to create challenge: ${challengeError.message}`);
    }

    logStep("Challenge created", { challengeId: challenge.id });

    // Create payment record with validated amount
    const captureAmount = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount;
    const paymentAmount = parseAndValidateNumber(captureAmount?.value, 0, 0, 1000000);
    
    await supabaseClient.from("payments").insert({
      user_id: user.id,
      challenge_id: challenge.id,
      amount: paymentAmount,
      currency: (captureAmount?.currency_code || "USD").substring(0, 3).toUpperCase(),
      payment_status: "paid",
      stripe_payment_id: orderId, // Using this field for PayPal order ID
      payment_method: "paypal",
    });

    logStep("Payment record created");
    try {
      await supabaseClient.from("paypal_logs").insert({
        user_id: user.id,
        event: "capture",
        status: "success",
        message: "Payment captured",
        details: { orderId, amount: paymentAmount }
      });
    } catch (e) {
      console.warn("Failed to insert PayPal capture success log", e);
    }

    return new Response(JSON.stringify({
      success: true,
      challenge_id: challenge.id,
      plan: validatedPlan,
      initial_balance: initialBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    try {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader ? authHeader.replace("Bearer ", "") : "";
      const { data: userData } = token ? await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      ).auth.getUser(token) : { data: undefined };
      const uid = userData?.user?.id ?? null;
      await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      ).from("paypal_logs").insert({
        user_id: uid,
        event: "capture",
        status: "error",
        message: errorMessage,
      });
    } catch (e) {
      console.error("Failed to write PayPal error log", e);
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...getCorsHeaders(req.headers.get("origin") || ""), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
