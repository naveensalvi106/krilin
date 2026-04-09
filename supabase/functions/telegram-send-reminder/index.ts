import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return new Response(JSON.stringify({ error: 'Telegram not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

    console.log('Checking telegram reminders for:', currentTime);

    const { data: dueTasks } = await supabase
      .from('tasks')
      .select('id, title, user_id, reminder_time, section_id, bandaids, problems')
      .eq('completed', false)
      .eq('reminder_time', currentTime)
      .eq('task_date', today);

    if (!dueTasks || dueTasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders due', time: currentTime }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;

    // Group tasks by user
    const tasksByUser = new Map<string, any[]>();
    for (const task of dueTasks) {
      if (!tasksByUser.has(task.user_id)) tasksByUser.set(task.user_id, []);
      tasksByUser.get(task.user_id)!.push(task);
    }

    for (const [userId, tasks] of tasksByUser) {
      // Check if user has telegram linked
      const { data: link } = await supabase.from('telegram_user_links').select('chat_id').eq('user_id', userId).single();
      if (!link) continue;

      for (const task of tasks) {
        // Get section name
        const { data: section } = await supabase.from('sections').select('name').eq('id', task.section_id).single();
        const sectionName = section?.name || 'Task';

        let msg = `⏰ <b>REMINDER: ${task.title}</b>\n\n`;
        msg += `📂 Section: ${sectionName}\n`;

        if (task.bandaids && task.bandaids.length > 0) {
          msg += `\n🩹 <b>Bandaids:</b>\n`;
          task.bandaids.forEach((b: string) => { msg += `  • ${b}\n`; });
        }

        if (task.problems && Array.isArray(task.problems) && task.problems.length > 0) {
          msg += `\n⚠️ <b>Problems:</b>\n`;
          task.problems.forEach((p: any) => {
            msg += `  • ${p.problem || p}\n`;
            if (p.solution) msg += `    💡 ${p.solution}\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Mark Done', callback_data: `done_${task.id}` },
              { text: '⏰ Snooze 15m', callback_data: `snooze_${task.id}` },
            ],
          ],
        };

        await sendTelegram(link.chat_id, msg, LOVABLE_API_KEY, TELEGRAM_API_KEY, keyboard);
        sent++;
      }
    }

    return new Response(JSON.stringify({ sent, time: currentTime }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendTelegram(chatId: number, text: string, lovableKey: string, telegramKey: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const resp = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error(`Telegram send failed [${resp.status}]:`, err);
  }
}
