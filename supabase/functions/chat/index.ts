import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, sections, tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sectionList = (sections || []).map((s: any) => `- "${s.name}" (id: ${s.id})`).join("\n");

    const taskList = (tasks || []).length > 0
      ? (tasks || []).map((t: any) => `- "${t.title}" [section: ${t.section_id}] ${t.completed ? '✅' : '⬜'}`).join("\n")
      : "No tasks yet.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are EasyFlow AI — a smart, efficient personal productivity assistant built into the EasyFlow task tracker app. You think like a real AI assistant (like Gemini or ChatGPT). You are sharp, context-aware, and proactive.

## Your capabilities:
1. **Task management**: Add, complete, delete tasks. You can delete ALL tasks at once — no need to ask for titles.
2. **Day planning**: Create structured daily plans with tasks across sections.
3. **Motivation**: Be direct, warm, and encouraging. Celebrate wins. No fluff.
4. **Smart context**: You can SEE all current tasks below. Use this to answer questions like "how many tasks do I have?", "what's left?", "remove all tasks", etc.

## Available sections:
${sectionList}

## Current tasks:
${taskList}

## Rules:
- You have FULL CONTEXT of the user's tasks. Never ask "which tasks?" or "what are their titles?" — you can see them.
- When user says "remove all tasks" or "delete everything" → use delete_all_tasks tool immediately. Don't ask for confirmation.
- When user says "remove/delete [specific task]" → use delete_tasks with the matching title from the list above.
- When user says "complete [task]" → use complete_tasks with the matching title.
- When adding tasks, ALWAYS use add_tasks tool. Pick the best section. Keep titles short (2-6 words).
- Be concise: 1-3 sentences max unless asked for detail.
- Be smart: infer intent. If user says "clear my list", that means delete all. If they say "I finished meditation", complete it.
- You are NOT a therapist. For serious crises, recommend 988 Suicide & Crisis Lifeline.
- Sound natural and intelligent. No robotic responses.`
          },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "add_tasks",
              description: "Add one or more tasks to the user's task list",
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
              description: "Mark tasks as completed by their titles (fuzzy match). Use when user says they finished specific tasks.",
              parameters: {
                type: "object",
                properties: {
                  task_titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Titles of tasks to mark as complete (from the current tasks list)",
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
              description: "Delete specific tasks by their titles (fuzzy match)",
              parameters: {
                type: "object",
                properties: {
                  task_titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Titles of tasks to delete (from the current tasks list)",
                  },
                },
                required: ["task_titles"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "delete_all_tasks",
              description: "Delete ALL tasks at once, or all tasks in a specific section. Use when user says 'remove all', 'clear everything', 'delete all tasks', etc.",
              parameters: {
                type: "object",
                properties: {
                  section_id: {
                    type: "string",
                    description: "Optional: section ID to delete tasks from. If omitted, deletes ALL tasks across all sections.",
                  },
                },
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
