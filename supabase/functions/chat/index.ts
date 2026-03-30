import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, sections } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sectionList = (sections || []).map((s: any) => `- "${s.name}" (id: ${s.id})`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant inside EasyFlow, a personal task & habit tracker app. You can help users by:

1. **Adding tasks**: When asked to add tasks or plan a day, use the add_tasks tool. Always pick the most relevant section from available sections.
2. **Motivation & coaching**: Be calm, empathetic, direct. Use short sentences. Celebrate small wins.
3. **Day planning**: When asked to plan a day, create a structured set of tasks across relevant sections.
4. **Emergency support**: If someone is struggling, be grounding. Offer breathing exercises, 5-4-3-2-1 technique.

Available sections:
${sectionList}

Rules:
- When adding tasks, ALWAYS use the add_tasks tool - never just describe tasks in text.
- Pick the best matching section_id for each task.
- If no section fits well, use the first available section.
- Keep task titles short and actionable (2-6 words).
- After adding tasks, briefly confirm what you added.
- You are NOT a therapist. For serious crises, recommend 988 Suicide & Crisis Lifeline.
- Max 3-4 sentences unless asked for more.`
          },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "add_tasks",
              description: "Add one or more tasks to the user's task list in the app",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short, actionable task title" },
                        section_id: { type: "string", description: "ID of the section to add the task to" },
                        reminder_time: { type: "string", description: "Optional reminder time in HH:MM format (24h)" },
                      },
                      required: ["title", "section_id"],
                    },
                  },
                },
                required: ["tasks"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "complete_tasks",
              description: "Mark tasks as completed by their titles (fuzzy match)",
              parameters: {
                type: "object",
                properties: {
                  task_titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Titles of tasks to mark as complete",
                  },
                },
                required: ["task_titles"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "delete_tasks",
              description: "Delete tasks by their titles (fuzzy match)",
              parameters: {
                type: "object",
                properties: {
                  task_titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Titles of tasks to delete",
                  },
                },
                required: ["task_titles"],
              },
            },
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
