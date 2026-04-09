import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Check, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from './ConfirmDialog';
import { playOpen, playClose, playClick, playDelete } from '@/lib/sounds';

const TelegramLink = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    checkLink();
  }, [user, open]);

  const checkLink = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('telegram_user_links' as any)
      .select('id')
      .eq('user_id', user.id)
      .single();
    setLinked(!!data);
  };

  const handleLink = async () => {
    if (!linkCode.trim() || !user) return;
    setLoading(true);
    setError('');

    // Find the link code in telegram_messages
    const { data: msgs } = await supabase
      .from('telegram_messages' as any)
      .select('*')
      .like('text', `LINK_CODE:${linkCode.trim()}`);

    if (!msgs || msgs.length === 0) {
      setError('Invalid code. Send /start to the bot first.');
      setLoading(false);
      return;
    }

    const msg = (msgs as any[])[0];
    const chatId = msg.raw_update?.chat_id || msg.chat_id;
    const username = msg.raw_update?.username || '';

    const { error: insertErr } = await supabase
      .from('telegram_user_links' as any)
      .insert({ user_id: user.id, chat_id: chatId, username } as any);

    if (insertErr) {
      if (insertErr.message.includes('duplicate')) {
        setError('This Telegram account is already linked.');
      } else {
        setError('Failed to link. Try again.');
      }
      setLoading(false);
      return;
    }

    setLinked(true);
    setLinkCode('');
    playClick();
    setLoading(false);
  };

  const handleUnlink = async () => {
    if (!user) return;
    await supabase.from('telegram_user_links' as any).delete().eq('user_id', user.id);
    setLinked(false);
    setConfirmUnlink(false);
    playDelete();
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); playOpen(); }}
        className="w-9 h-9 solid-circle hover:scale-110 transition-transform relative"
        title="Telegram"
      >
        <Send className="w-4.5 h-4.5" />
        {linked && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-black" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center" style={{ zIndex: 9999 }} onClick={() => { setOpen(false); playClose(); }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-border shadow-2xl p-5"
              style={{ background: 'hsl(15, 5%, 8%)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm text-gradient-fire font-bold flex items-center gap-2">
                  <Send className="w-4 h-4" /> Telegram Bot
                </h3>
                <button onClick={() => { setOpen(false); playClose(); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style={{ background: 'hsl(0, 60%, 40%)' }}>
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {linked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'hsl(140, 40%, 15%)', border: '1px solid hsl(140, 40%, 25%)' }}>
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">Telegram linked!</span>
                  </div>
                  <p className="text-xs text-muted-foreground">You'll receive task reminders, daily digests, and can use bot commands.</p>
                  <button
                    onClick={() => setConfirmUnlink(true)}
                    className="flex items-center gap-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    <Unlink className="w-3 h-3" /> Unlink Telegram
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    1. Open your bot on Telegram and send <code className="text-primary">/start</code><br/>
                    2. Copy the 6-digit code<br/>
                    3. Paste it below
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={linkCode}
                      onChange={e => setLinkCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLink()}
                      placeholder="Enter code..."
                      maxLength={6}
                      className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground text-center tracking-[0.3em] font-mono placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleLink}
                      disabled={loading || linkCode.length < 6}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                      style={{
                        background: 'linear-gradient(135deg, hsl(30, 100%, 55%), hsl(15, 90%, 45%))',
                        boxShadow: '0 0 12px hsl(25, 100%, 50% / 0.3)',
                      }}
                    >
                      Link
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                </div>
              )}
            </motion.div>

            <ConfirmDialog
              open={confirmUnlink}
              onConfirm={handleUnlink}
              onCancel={() => setConfirmUnlink(false)}
              title="Unlink Telegram?"
              description="You'll stop receiving reminders and digests on Telegram."
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TelegramLink;
