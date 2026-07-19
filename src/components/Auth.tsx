import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2, KeyRound, Mail, Sparkles } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (session: any) => void;
  onEnterDemoMode: () => void;
}

export default function Auth({ onAuthSuccess, onEnterDemoMode }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user && !data.session) {
          setMessage('Check your email inbox for a verification link to confirm your account!');
        } else if (data.session) {
          onAuthSuccess(data.session);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onAuthSuccess(data.session);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-4">
            <Sparkles size={14} />
            TRADING JOURNAL v1.0
          </div>
          <h1 className="text-3xl font-sans font-bold tracking-tight text-white mb-2">
            bgmarif Journal
          </h1>
          <p className="text-sm text-zinc-400">
            Professional Multi-Account Trading Intelligence Suite
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-850 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-medium text-white mb-6">
            {isSignUp ? 'Create new account' : 'Sign in to your journal'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  id="auth-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  id="auth-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  id="auth-toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3 text-xs text-rose-400">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3 text-xs text-emerald-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-medium py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 disabled:opacity-50"
              id="auth-submit-btn"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
              id="auth-toggle-mode-btn"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>

            <div className="flex items-center my-2">
              <div className="h-[1px] flex-1 bg-zinc-850" />
              <span className="px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">OR</span>
              <div className="h-[1px] flex-1 bg-zinc-850" />
            </div>

            <button
              type="button"
              onClick={onEnterDemoMode}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 hover:text-white font-mono text-xs py-2 rounded-lg border border-zinc-700/50 transition-all"
              id="auth-demo-mode-btn"
            >
              🚀 Enter Demo Sandbox Mode
            </button>
            <p className="text-[10px] text-zinc-500 font-mono">
              Demo Mode runs fully local to let you explore the full feature set instantly without signing in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
