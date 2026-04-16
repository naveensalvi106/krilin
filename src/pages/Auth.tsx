import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent! Check your email.');
        setMode('login');
      } else if (mode === 'login') {
        if (!password) return;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back! 🔥');
        if (data.session) {
          window.location.replace('/');
          return;
        }
      } else {
        if (!password) return;
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created! You can now sign in.');
        setMode('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="glass-panel-accent bevel p-8 w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-3">
          <img src="/logo.png" alt="Easy Flow" className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-lg" style={{ boxShadow: '0 0 30px #FF6B3540' }} />
          <h1 className="text-2xl font-display text-gradient-fire">Easy Flow</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'forgot' ? 'Reset your password' : 'Your premium task system'}
          </p>
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 20%, 18%)' }}
          />
        </div>

        {mode !== 'forgot' && (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              style={{ background: 'hsl(15, 10%, 10%)', border: '1px solid hsl(15, 20%, 18%)' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-premium text-primary-foreground w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Please wait...' : mode === 'forgot' ? 'Send Reset Link' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        {mode === 'login' && (
          <button type="button" onClick={() => setMode('forgot')} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
            Forgot password?
          </button>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
        >
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span className="text-gradient-fire font-medium">
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </span>
        </button>
      </motion.form>
    </div>
  );
};

export default Auth;
