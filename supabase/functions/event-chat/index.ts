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

ALWAYS call the respond tool exactly once with:
  - reply: your short text answer
  - event_ids: matching event UUIDs from the catalog (max 6, empty if none fit yet)
  - follow_ups: 3-4 SHORT (max 5 words) tap-to-send refinement chips that progressively narrow the recommendations.
    Cycle through these dimensions across turns based on what's still unknown:
      • TIME — "This weekend", "Tonight", "Next week", "Weekday evenings"
      • VIBE — "Family-friendly", "Romantic date", "Party night", "Chill & cultural", "High energy"
      • SEATING — "VIP seats", "Budget seating", "Standing/GA", "Front row"
      • BUDGET — "Under ₹500", "₹500–1500", "Premium ₹2000+"
      • CITY — top Indian cities if location unknown
    Pick chips that are RELEVANT to the user's last message — never repeat dimensions they already specified.

Never invent events. If the user asks something unrelated, politely steer back to events.

${prefSummary}

CATALOG (${events?.length || 0} upcoming events):
${(events || []).map((e: any) => `- ${e.id} | ${e.title} | ${e.category} | ${e.city} | ${e.date} | ₹${e.price} | ⭐${e.rating ?? 0}`).join("\n")}`;

    const tools = [{
      type: "function",
      function: {
        name: "respond",
        description: "Reply to the user with text, recommended events, and refinement chips.",
        parameters: {
          type: "object",
          properties: {
            reply: { type: "string", description: "Short conversational reply (2-4 sentences)" },
            event_ids: { type: "array", items: { type: "string" }, description: "Event UUIDs from the catalog (max 6)" },
            follow_ups: { type: "array", items: { type: "string" }, description: "3-4 short refinement chips (max 5 words each)" },
          },
          required: ["reply", "event_ids", "follow_ups"],
          additionalProperties: false,
        },
      },
    }];
    const toolChoice = { type: "function", function: { name: "respond" } };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        tool_choice: toolChoice,
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
    let reply = msg?.content || "Let me know what kind of event you're in the mood for! 🎟️";
    let recommendedEvents: any[] = [];
    let followUps: string[] = [];
    const toolCall = msg?.tool_calls?.[0];
    if (toolCall?.function?.name === "respond") {
      try {
        const args = JSON.parse(toolCall.function.arguments || "{}");
        if (args.reply) reply = args.reply;
        const ids: string[] = (args.event_ids || []).slice(0, 6);
        recommendedEvents = (events || []).filter((e: any) => ids.includes(e.id));
        followUps = (args.follow_ups || []).slice(0, 4);
      } catch (e) { console.error("tool parse", e); }
    }

    return new Response(
      JSON.stringify({ reply, events: recommendedEvents, follow_ups: followUps }),
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