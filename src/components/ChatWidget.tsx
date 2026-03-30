import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertTriangle, Bot, Sparkles, CalendarDays, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Section, Task } from '@/lib/store';

type Msg = { role: 'user' | 'assistant'; content: string };

interface ToolCall {
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
  sections: Section[];
  tasks: Task[];
  onAddTask: (task: { title: string; sectionId: string; bandaids: string[]; reminderTime?: string }) => Promise<void>;
  onToggleTask: (id: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const ChatWidget = ({ open, onClose, sections, tasks, onAddTask, onToggleTask, onDeleteTask }: ChatWidgetProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history on first open
  useEffect(() => {
    if (!open || historyLoaded || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data && data.length > 0) {
        setMessages(data.map(d => ({ role: d.role as 'user' | 'assistant', content: d.content })));
      }
      setHistoryLoaded(true);
    };
    load();
  }, [open, historyLoaded, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const saveMessage = useCallback(async (role: string, content: string) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({ user_id: user.id, role, content } as any);
  }, [user]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from('chat_messages').delete().eq('user_id', user.id);
    setMessages([]);
    toast.success('Chat history cleared');
  }, [user]);

  const handleToolCalls = async (toolCalls: ToolCall[]) => {
    for (const tc of toolCalls) {
      try {
        const args = JSON.parse(tc.function.arguments);
        if (tc.function.name === 'add_tasks' && args.tasks) {
          for (const t of args.tasks) {
            await onAddTask({
              title: t.title,
              sectionId: t.section_id,
              bandaids: [],
              reminderTime: t.reminder_time || undefined,
            });
          }
          toast.success(`Added ${args.tasks.length} task(s)!`);
        } else if (tc.function.name === 'complete_tasks' && args.task_titles) {
          let completed = 0;
          for (const title of args.task_titles) {
            const match = tasks.find(t => 
              !t.completed && t.title.toLowerCase().includes(title.toLowerCase())
            );
            if (match) {
              await onToggleTask(match.id);
              completed++;
            }
          }
          if (completed > 0) toast.success(`Completed ${completed} task(s)!`);
        } else if (tc.function.name === 'delete_tasks' && args.task_titles) {
          let deleted = 0;
          for (const title of args.task_titles) {
            const match = tasks.find(t => 
              t.title.toLowerCase().includes(title.toLowerCase())
            );
            if (match) {
              await onDeleteTask(match.id);
              deleted++;
            }
          }
          if (deleted > 0) toast.success(`Deleted ${deleted} task(s)!`);
        } else if (tc.function.name === 'delete_all_tasks') {
          const scope = args.section_id;
          const toDelete = scope ? tasks.filter(t => t.sectionId === scope) : [...tasks];
          for (const t of toDelete) {
            await onDeleteTask(t.id);
          }
          toast.success(`Deleted ${toDelete.length} task(s)!`);
        }
      } catch (err) {
        console.error('Tool call error:', err);
      }
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          sections: sections.map(s => ({ id: s.id, name: s.name })),
          tasks: tasks.map(t => ({ title: t.title, section_id: t.sectionId, completed: t.completed })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Network error' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const result = await resp.json();
      const choice = result.choices?.[0];

      if (choice?.message?.tool_calls?.length > 0) {
        await handleToolCalls(choice.message.tool_calls);
        // If there's also text content, show it
        const textContent = choice.message.content;
        if (textContent) {
          setMessages(prev => [...prev, { role: 'assistant', content: textContent }]);
        } else {
          // Generate a follow-up without tool calls
          const followUp = await fetch(CHAT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              messages: [
                ...messages,
                userMsg,
                { role: 'assistant', content: 'I\'ve completed the requested actions.' },
                { role: 'user', content: 'Briefly confirm what you just did.' },
              ],
              sections: sections.map(s => ({ id: s.id, name: s.name })),
            }),
          });
          if (followUp.ok) {
            const fResult = await followUp.json();
            const fContent = fResult.choices?.[0]?.message?.content;
            if (fContent) {
              setMessages(prev => [...prev, { role: 'assistant', content: fContent }]);
            }
          }
        }
      } else if (choice?.message?.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: choice.message.content }]);
      }
    } catch (e: any) {
      toast.error(e.message || 'Chat error');
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { icon: <CalendarDays className="w-3 h-3" />, label: "Plan my day", msg: "Plan my day with productive tasks across all my sections." },
    { icon: <Sparkles className="w-3 h-3" />, label: "Motivate me", msg: "I need motivation to complete my tasks today." },
    { icon: <AlertTriangle className="w-3 h-3" />, label: "I'm struggling", msg: "I'm really struggling right now and need help getting back on track." },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg mx-4 rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col"
            style={{ background: 'hsl(15, 5%, 8%)', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ background: 'hsl(15, 5%, 6%)' }}>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="font-display text-sm text-gradient-fire">EasyFlow AI</span>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">I can add tasks, plan your day, motivate you, and more!</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickPrompts.map(q => (
                      <button
                        key={q.label}
                        onClick={() => { setInput(q.msg); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border hover:border-primary/50 transition-colors"
                        style={{ background: 'hsl(15, 10%, 12%)' }}
                      >
                        {q.icon} {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'rounded-bl-md'
                    }`}
                    style={m.role === 'assistant' ? { background: 'hsl(15, 10%, 14%)' } : undefined}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md px-3 py-2 text-sm" style={{ background: 'hsl(15, 10%, 14%)' }}>
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3" style={{ background: 'hsl(15, 5%, 6%)' }}>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Ask me to add tasks, plan your day..."
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 solid-circle shrink-0 hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ChatWidget;
