import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface PlanConfig {
  name: string;
  price: number;
  capital: number;
  profitTarget: number;
  maxDailyLoss: number;
  maxTotalLoss: number;
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    name: "Starter Challenge",
    price: 99,
    capital: 5000,
    profitTarget: 10,
    maxDailyLoss: 5,
    maxTotalLoss: 10
  },
  pro: {
    name: "Pro Challenge",
    price: 249,
    capital: 25000,
    profitTarget: 10,
    maxDailyLoss: 5,
    maxTotalLoss: 10
  },
  elite: {
    name: "Elite Challenge",
    price: 499,
    capital: 100000,
    profitTarget: 8,
    maxDailyLoss: 4,
    maxTotalLoss: 8
  }
};

function isValidPlan(plan: unknown): plan is keyof typeof PLAN_CONFIGS {
  return typeof plan === 'string' && ['starter', 'pro', 'elite'].includes(plan);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse and validate request body
    const body = await req.json();
    const { plan } = body;

    if (!isValidPlan(plan)) {
      console.error('Invalid plan:', plan);
      return new Response(
        JSON.stringify({ error: 'Invalid plan selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planConfig = PLAN_CONFIGS[plan];
    console.log('Creating crypto checkout for plan:', plan, 'price:', planConfig.price);

    // Get Coinbase Commerce API key
    const coinbaseApiKey = Deno.env.get('COINBASE_COMMERCE_API_KEY');
    if (!coinbaseApiKey) {
      console.error('Coinbase Commerce API key not configured');
      return new Response(
        JSON.stringify({ error: 'Crypto payments not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine redirect URLs (only allow known origins)
    const redirectOrigin = isAllowedOrigin(origin)
      ? origin
      : (Deno.env.get("ALLOWED_ORIGIN") ??
          "https://a89d2ad0-2f65-4057-a887-dc1a5ce323b2.lovableproject.com");

    const successUrl = `${redirectOrigin}/payment-success?provider=crypto`;
    const cancelUrl = `${redirectOrigin}/payment-cancelled`;

    // Create Coinbase Commerce charge
    const chargeResponse = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': coinbaseApiKey,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify({
        name: planConfig.name,
        description: `Trading Challenge - Capital: $${planConfig.capital.toLocaleString()}`,
        pricing_type: 'fixed_price',
        local_price: {
          amount: planConfig.price.toString(),
          currency: 'USD'
        },
        metadata: {
          user_id: user.id,
          plan: plan,
          initial_balance: planConfig.capital,
          profit_target: planConfig.profitTarget,
          max_daily_loss: planConfig.maxDailyLoss,
          max_total_loss: planConfig.maxTotalLoss
        },
        redirect_url: successUrl,
        cancel_url: cancelUrl
      })
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      console.error('Coinbase Commerce API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create crypto checkout' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chargeData = await chargeResponse.json();
    console.log('Coinbase charge created:', chargeData.data?.id);

    if (!chargeData.data?.hosted_url) {
      console.error('No hosted URL in response');
      return new Response(
        JSON.stringify({ error: 'Invalid response from payment provider' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        url: chargeData.data.hosted_url,
        charge_id: chargeData.data.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating crypto checkout:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
