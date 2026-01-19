import { supabase } from "@/integrations/supabase/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:54321";

type InvokeOptions = {
  body?: unknown;
  headers?: Record<string, string>;
};

function buildFunctionsUrl() {
  const base = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  return base.includes("/functions/v1") ? base : `${base}/functions/v1`;
}

export async function invokeFunction(functionName: string, options: InvokeOptions = {}) {
  const { body, headers } = options;
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  try {
    const response = await fetch(`${buildFunctionsUrl()}/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
       return { data: null, error: { message: data.error || response.statusText } };
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : "Network error" } };
  }
}
