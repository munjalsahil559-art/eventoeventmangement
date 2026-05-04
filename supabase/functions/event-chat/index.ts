import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify user (optional — for personalization)
    let userId: string | null = null;
    let pastBookings: any[] = [];
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id || null;
      if (userId) {
        const { data: bks } = await supabase
          .from("bookings")
          .select("event_id, events(title, category, city)")
          .eq("user_id", userId)
          .limit(10);
        pastBookings = bks || [];
      }
    }

    // Always pull a slim catalog snapshot for grounding
    const { data: events } = await supabase
      .from("events")
      .select("id, title, category, city, venue, date, time, price, rating, is_featured, description")
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date", { ascending: true })
      .limit(80);

    const prefSummary = pastBookings.length
      ? `Past bookings: ${pastBookings.map((b: any) => `${b.events?.title} (${b.events?.category}, ${b.events?.city})`).join("; ")}`
      : "No past bookings.";

    const systemPrompt = `You are Evento's friendly event-discovery assistant for an Indian event-booking app.
Help the user find events by category, city, date, mood, or budget. Be concise (2-4 short sentences max), warm, and use light emojis.

When recommending events, ALWAYS call the recommend_events tool with the matching event IDs from the catalog below — do not invent events.
If the user asks something unrelated (e.g. weather), politely steer back to events.
Ask one clarifying question only if you truly cannot match any events.

${prefSummary}

CATALOG (${events?.length || 0} upcoming events):
${(events || []).map((e: any) => `- ${e.id} | ${e.title} | ${e.category} | ${e.city} | ${e.date} | ₹${e.price} | ⭐${e.rating ?? 0}`).join("\n")}`;

    const tools = [{
      type: "function",
      function: {
        name: "recommend_events",
        description: "Surface a list of events to the user as cards. Use whenever you mention specific events.",
        parameters: {
          type: "object",
          properties: {
            event_ids: { type: "array", items: { type: "string" }, description: "Event UUIDs from the catalog (max 6)" },
          },
          required: ["event_ids"],
          additionalProperties: false,
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached, please retry shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const msg = data.choices?.[0]?.message;
    const reply = msg?.content || "Let me know what kind of event you're in the mood for! 🎟️";

    let recommendedEvents: any[] = [];
    const toolCall = msg?.tool_calls?.[0];
    if (toolCall?.function?.name === "recommend_events") {
      try {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        const ids: string[] = (args.event_ids || []).slice(0, 6);
        recommendedEvents = (events || []).filter((e: any) => ids.includes(e.id));
      } catch (e) { console.error("tool parse", e); }
    }

    return new Response(
      JSON.stringify({ reply, events: recommendedEvents }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("event-chat", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});