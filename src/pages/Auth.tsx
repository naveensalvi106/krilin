import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

const PUBLISHED_AUTH_URL = 'https://krilin.lovable.app/auth?oauth=google';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const autoOauthStartedRef = useRef(false);

  const isPreviewHost =
    window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com');

  const startGoogleSignIn = async () => {
    if (loading) return;
    if (isPreviewHost) { window.location.href = PUBLISHED_AUTH_URL; return; }
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (error) throw error;
    } catch (err: any) {
      const message = err?.message || 'Google sign-in failed';
      if (message.toLowerCase().includes('state verification failed')) {
        toast.error('Google sign-in failed in this browser session. Please open the published app and try again.');
      } else {
        toast.error(message);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') !== 'google' || autoOauthStartedRef.current || isPreviewHost) return;
    autoOauthStartedRef.current = true;
    void startGoogleSignIn();
  }, [isPreviewHost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back! ✨');
        if (data.session) { window.location.replace('/'); return; }
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="app-bg" />
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="glass-panel-accent bevel p-8 w-full max-w-sm space-y-6 relative z-10"
      >
        <div className="text-center space-y-3">
          <img src="/logo.jpg" alt="Krilin" className="w-16 h-16 mx-auto rounded-2xl object-cover" style={{ boxShadow: '0 0 30px rgba(100,180,255,0.2)', border: '1px solid rgba(255,255,255,0.15)' }} />
          <h1 className="text-2xl font-display text-gradient-fire">Krilin</h1>
          <p className="text-sm text-muted-foreground">Your premium task system</p>
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required minLength={6}
            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button type="submit" disabled={loading} className="btn-premium text-white w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <div className="relative flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <button
          type="button" onClick={startGoogleSignIn} disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {isPreviewHost ? 'Continue with Google on live app' : 'Continue with Google'}
        </button>

        <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span className="text-gradient-fire font-medium">{isLogin ? 'Sign Up' : 'Sign In'}</span>
        </button>
      </motion.form>
    </div>
  );
};

export default Auth;
