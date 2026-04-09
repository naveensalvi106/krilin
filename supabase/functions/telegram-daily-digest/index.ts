import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

Deno.serve(async () => {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'Telegram not configured' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  // Use IST date for today
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + istOffset);
  const today = istNow.toISOString().split('T')[0];

  // Get all linked users
  const { data: links } = await supabase.from('telegram_user_links').select('user_id, chat_id');
  if (!links || links.length === 0) {
    return new Response(JSON.stringify({ message: 'No linked users' }));
  }

  let sent = 0;

  for (const link of links) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, completed, reminder_time, section_id')
      .eq('user_id', link.user_id)
      .eq('task_date', today)
      .order('sort_order');

    if (!tasks || tasks.length === 0) continue;

    // Get section names
    const sectionIds = [...new Set(tasks.map(t => t.section_id))];
    const { data: sections } = await supabase.from('sections').select('id, name').in('id', sectionIds);
    const sectionMap = new Map((sections || []).map((s: any) => [s.id, s.name]));

    const completed = tasks.filter((t: any) => t.completed).length;
    const pct = Math.round((completed / tasks.length) * 100);

    let msg = `☀️ <b>Good Morning! Here's your day</b>\n\n`;
    msg += `📊 ${completed}/${tasks.length} tasks done (${pct}%)\n\n`;

    // Group by section
    const bySection = new Map<string, any[]>();
    for (const t of tasks) {
      const name = sectionMap.get(t.section_id) || 'Other';
      if (!bySection.has(name)) bySection.set(name, []);
      bySection.get(name)!.push(t);
    }

    for (const [section, sectionTasks] of bySection) {
      msg += `📂 <b>${section}</b>\n`;
      sectionTasks.forEach((t: any) => {
        const icon = t.completed ? '✅' : '⬜';
        const time = t.reminder_time ? ` ⏰${t.reminder_time}` : '';
        msg += `  ${icon} ${t.title}${time}\n`;
      });
      msg += '\n';
    }

    msg += `💪 Let's crush it today!`;

    await sendTelegram(link.chat_id, msg, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }));
});

async function sendTelegram(chatId: number, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}
