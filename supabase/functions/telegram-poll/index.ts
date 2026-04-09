import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

Deno.serve(async () => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500 });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not configured' }), { status: 500 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;

  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  if (stateErr) return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });

  let currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message', 'callback_query'] }),
    });

    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data }), { status: 502 });

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    // Process callback queries (button presses)
    for (const update of updates) {
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
    }

    // Process /start and /commands messages
    for (const update of updates) {
      if (update.message?.text) {
        await handleCommand(update.message, supabase, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
    }

    // Store messages
    const rows = updates
      .filter((u: any) => u.message)
      .map((u: any) => ({
        update_id: u.update_id,
        chat_id: u.message.chat.id,
        text: u.message.text ?? null,
        raw_update: u,
      }));

    if (rows.length > 0) {
      await supabase.from('telegram_messages').upsert(rows, { onConflict: 'update_id' });
      totalProcessed += rows.length;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from('telegram_bot_state').update({ update_offset: newOffset, updated_at: new Date().toISOString() }).eq('id', 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed }));
});

async function sendTelegram(chatId: number, text: string, lovableKey: string, telegramKey: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;

  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string, lovableKey: string, telegramKey: string) {
  await fetch(`${GATEWAY_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function handleCallbackQuery(cq: any, supabase: any, lovableKey: string, telegramKey: string) {
  const data = cq.data;
  const chatId = cq.message?.chat?.id;

  if (data?.startsWith('done_')) {
    const taskId = data.replace('done_', '');
    await supabase.from('tasks').update({ completed: true }).eq('id', taskId);
    await answerCallbackQuery(cq.id, '✅ Task marked done!', lovableKey, telegramKey);
    await sendTelegram(chatId, '✅ Task marked as completed!', lovableKey, telegramKey);
  } else if (data?.startsWith('snooze_')) {
    const taskId = data.replace('snooze_', '');
    // Snooze by 15 minutes
    const { data: task } = await supabase.from('tasks').select('reminder_time').eq('id', taskId).single();
    if (task?.reminder_time) {
      const [h, m] = task.reminder_time.split(':').map(Number);
      const newMin = (m + 15) % 60;
      const newHour = (h + Math.floor((m + 15) / 60)) % 24;
      const newTime = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
      await supabase.from('tasks').update({ reminder_time: newTime }).eq('id', taskId);
      await answerCallbackQuery(cq.id, `⏰ Snoozed to ${newTime}`, lovableKey, telegramKey);
      await sendTelegram(chatId, `⏰ Snoozed! New reminder at <b>${newTime}</b>`, lovableKey, telegramKey);
    }
  }
}

async function handleCommand(message: any, supabase: any, lovableKey: string, telegramKey: string) {
  const text = message.text?.trim();
  const chatId = message.chat.id;
  const username = message.from?.username || message.from?.first_name || '';

  if (text === '/start') {
    // Check if already linked
    const { data: existing } = await supabase.from('telegram_user_links').select('id').eq('chat_id', chatId).single();
    if (existing) {
      await sendTelegram(chatId, '✅ You are already linked! Use /help for commands.', lovableKey, telegramKey);
      return;
    }

    // Generate a 6-digit link code and store it temporarily
    const linkCode = String(Math.floor(100000 + Math.random() * 900000));
    // Store in message for the app to read
    await supabase.from('telegram_messages').upsert({
      update_id: Date.now(),
      chat_id: chatId,
      text: `LINK_CODE:${linkCode}`,
      raw_update: { link_code: linkCode, username, chat_id: chatId },
    }, { onConflict: 'update_id' });

    await sendTelegram(chatId,
      `🔥 <b>Welcome to Easy Flows Bot!</b>\n\n` +
      `Your link code is: <code>${linkCode}</code>\n\n` +
      `Enter this code in the app to link your Telegram account.\n\n` +
      `Commands:\n/tasks - View today's tasks\n/progress - Today's progress\n/help - Show commands`,
      lovableKey, telegramKey
    );
  } else if (text === '/tasks' || text === '/today') {
    const { data: link } = await supabase.from('telegram_user_links').select('user_id').eq('chat_id', chatId).single();
    if (!link) {
      await sendTelegram(chatId, '❌ Not linked. Use /start first.', lovableKey, telegramKey);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: tasks } = await supabase.from('tasks').select('title, completed, reminder_time, section_id').eq('user_id', link.user_id).eq('task_date', today).order('sort_order');

    if (!tasks || tasks.length === 0) {
      await sendTelegram(chatId, '📋 No tasks for today!', lovableKey, telegramKey);
      return;
    }

    const completed = tasks.filter((t: any) => t.completed).length;
    let msg = `📋 <b>Today's Tasks</b> (${completed}/${tasks.length} done)\n\n`;
    tasks.forEach((t: any, i: number) => {
      const icon = t.completed ? '✅' : '⬜';
      const time = t.reminder_time ? ` ⏰${t.reminder_time}` : '';
      msg += `${icon} ${t.title}${time}\n`;
    });

    await sendTelegram(chatId, msg, lovableKey, telegramKey);
  } else if (text === '/progress') {
    const { data: link } = await supabase.from('telegram_user_links').select('user_id').eq('chat_id', chatId).single();
    if (!link) { await sendTelegram(chatId, '❌ Not linked. Use /start first.', lovableKey, telegramKey); return; }

    const today = new Date().toISOString().split('T')[0];
    const { data: tasks } = await supabase.from('tasks').select('completed').eq('user_id', link.user_id).eq('task_date', today);

    const total = tasks?.length || 0;
    const done = tasks?.filter((t: any) => t.completed).length || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));

    await sendTelegram(chatId,
      `📊 <b>Today's Progress</b>\n\n${bar} ${pct}%\n${done}/${total} tasks completed`,
      lovableKey, telegramKey
    );
  } else if (text === '/help') {
    await sendTelegram(chatId,
      `🔥 <b>Easy Flows Bot Commands</b>\n\n` +
      `/tasks - View today's tasks\n` +
      `/progress - See completion progress\n` +
      `/help - Show this help`,
      lovableKey, telegramKey
    );
  }
}
