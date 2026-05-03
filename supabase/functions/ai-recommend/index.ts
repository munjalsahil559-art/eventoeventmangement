import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mood, userId } = await req.json().catch(() => ({}));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all upcoming events
    const { data: events } = await supabase
      .from("events")
      .select("id, title, category, city, date, price, description, rating, tickets_sold")
      .order("date", { ascending: true })
      .limit(60);

    // Fetch user history if userId provided
    let history: any[] = [];
    if (userId) {
      const { data } = await supabase
        .from("bookings")
        .select("events(title, category, city)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      history = data || [];
    }

    const eventList = (events || []).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      city: e.city,
      date: e.date,
      price: e.price,
      rating: e.rating,
    }));

    const historySummary = history
      .map((h: any) => h.events ? `${h.events.title} (${h.events.category}, ${h.events.city})` : null)
      .filter(Boolean)
      .join("; ") || "No prior bookings";

    const systemPrompt = `You are an expert event & entertainment curator for "Evento". Recommend events from the provided catalog that fit the user's mood and past behavior. Return ONLY valid JSON via the recommend_events tool.`;

    const userPrompt = `User mood: ${mood || "general curiosity"}
Past bookings: ${historySummary}

Event catalog (JSON):
${JSON.stringify(eventList)}

Pick the 6 best matching event IDs from the catalog. Provide a warm 1-2 sentence overall vibe message and per-event short reasons (max 12 words each).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_events",
              description: "Return curated event recommendations",
              parameters: {
                type: "object",
                properties: {
                  vibe_message: { type: "string" },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        event_id: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["event_id", "reason"],
                    },
                  },
                },
                required: ["vibe_message", "recommendations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_events" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : { vibe_message: "", recommendations: [] };

    // Hydrate with full event data
    const idMap = new Map((events || []).map((e: any) => [e.id, e]));
    const enriched = (parsed.recommendations || [])
      .map((r: any) => ({ ...idMap.get(r.event_id), reason: r.reason }))
      .filter((e: any) => e && e.id);

    return new Response(
      JSON.stringify({ vibe_message: parsed.vibe_message, recommendations: enriched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-recommend error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});