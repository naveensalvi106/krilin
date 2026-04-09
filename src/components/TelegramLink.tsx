import { useEffect, useState } from 'react';
import { Send, Check, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from './ConfirmDialog';
import { playClick, playDelete } from '@/lib/sounds';

const TelegramLink = () => {
  const { user } = useAuth();
  const [linkCode, setLinkCode] = useState('');
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  useEffect(() => {
    if (!user) return;
    void checkLink();
  }, [user]);

  const checkLink = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('telegram_user_links' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    setLinked(!!data);
  };

  const handleLink = async () => {
    if (!linkCode.trim() || !user) return;
    setLoading(true);
    setError('');

    const { data, error: invokeError } = await supabase.functions.invoke('telegram-link', {
      body: { code: linkCode.trim() },
    });

    if (invokeError || data?.error) {
      setError(data?.error || invokeError?.message || 'Failed to link. Try again.');
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
    setError('');
    playDelete();
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/15 text-primary border border-primary/20">
            <Send className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Telegram Bot</p>
            <p className="text-xs text-muted-foreground">Link Telegram for reminders and bot commands.</p>
          </div>
        </div>

        {linked ? (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/10 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="w-4 h-4 text-primary" />
              Telegram linked
            </div>
            <p className="text-xs text-muted-foreground">You’ll receive task reminders, daily digests, and can use bot commands.</p>
            <button
              onClick={() => setConfirmUnlink(true)}
              className="flex items-center gap-2 text-xs text-destructive hover:opacity-80 transition-opacity"
            >
              <Unlink className="w-3 h-3" /> Unlink Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              1. Open your bot on Telegram and send <code className="text-primary">/start</code><br />
              2. Copy the latest 6-digit code<br />
              3. Paste it below
            </p>
            <div className="flex gap-2">
              <input
                value={linkCode}
                onChange={e => setLinkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleLink()}
                placeholder="Enter code"
                maxLength={6}
                inputMode="numeric"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground text-center tracking-[0.3em] font-mono placeholder:text-muted-foreground placeholder:tracking-normal focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleLink}
                disabled={loading || linkCode.length < 6}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? '...' : 'Link'}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmUnlink}
        onConfirm={handleUnlink}
        onCancel={() => setConfirmUnlink(false)}
        title="Unlink Telegram?"
        description="You’ll stop receiving reminders and digests on Telegram."
      />
    </>
  );
};

export default TelegramLink;
