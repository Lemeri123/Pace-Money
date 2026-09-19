/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const apiKey = Deno.env.get("GROQ_API_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userMessage = "";

    if (body.action === "categorize_transaction" && body.transaction) {
      systemPrompt = "Categorize into: food, transport, entertainment, education, shopping, health, snacks, other. JSON only: {\"category\": \"...\", \"is_unnecessary\": true/false}";
      userMessage = `"${body.transaction.description}" ${body.transaction.amount}`;
    } else if (body.action === "roast_spending" && body.transactions) {
      systemPrompt = "Roast bad spending in 1-2 funny sentences.";
      const totals: Record<string, number> = {};
      for (const t of body.transactions) totals[t.category] = (totals[t.category] || 0) + t.amount;
      userMessage = `${JSON.stringify(totals)}`;
    } else if (body.action === "can_i_afford" && body.item && body.profile) {
      systemPrompt = "Give SHORT affordability advice in 2-3 sentences. Be friendly and direct. Plain text only - NO asterisks, NO formatting.";
      userMessage = `Can I afford ${body.item.name} for ${body.item.cost}? I earn ${body.profile.monthly_income} monthly. ${body.question || ""}`;
    } else if (body.action === "analyze_spending" && body.transactions && body.profile) {
      systemPrompt = "Analyze spending and give 2-3 SHORT actionable tips. Be encouraging. Write naturally in plain text - NO asterisks, NO bullets, NO formatting.";
      const totals: Record<string, number> = {};
      let total = 0;
      for (const t of body.transactions) {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
        total += t.amount;
      }
      userMessage = `I earn ${body.profile.monthly_income} and spent ${total} this month: ${JSON.stringify(totals)}. Give me advice.`;
    } else if (body.action === "get_budget_advice" && body.profile) {
      systemPrompt = "You're a friendly financial coach. Give SHORT, practical budget advice in 2-3 natural sentences. Be conversational like texting a friend. NO asterisks, NO markdown, NO numbered lists, NO formatting - just plain text.";
      userMessage = `I earn ${body.profile.monthly_income} monthly. ${body.question || "Give me budget tips."}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "groq/compound",
        max_tokens: 150,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "AI error", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    if (body.action === "categorize_transaction") {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ category: "other", is_unnecessary: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ message: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error", message: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
