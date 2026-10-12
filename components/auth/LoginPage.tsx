'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  HardHat, 
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { signIn, signUp, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password.trim());
        if (error) {
          setErrorMessage(error.message || 'Invalid email or password.');
        } else {
          setSuccessMessage('Authentication successful! Loading software...');
          onSuccess?.();
        }
      } else {
        const { error } = await signUp(email.trim(), password.trim());
        if (error) {
          setErrorMessage(error.message || 'Unable to register account.');
        } else {
          setSuccessMessage('Account created! Please check your email or sign in.');
          setMode('signin');
        }
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdmin = () => {
    setEmail('admin@gmail.com');
    setPassword('Admin@123456');
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col justify-center items-center p-4 selection:bg-purple-100 selection:text-purple-900">
      
      {/* Centered Auth Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-6 sm:p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white mx-auto flex items-center justify-center shadow-md shadow-purple-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Armee Enterprises PMS
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Enterprise Construction & Site Planning Software
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-semibold text-purple-700">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Supabase RLS Protected</span>
          </div>
        </div>

        {/* Tab Switcher (Sign In vs Sign Up) */}
        <div className="flex bg-[#F5F6F8] p-1 rounded-xl border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#111827] block">
              Work Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="Enter email (e.g. admin@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#111827] bg-[#F5F6F8] hover:bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#111827] block">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm text-[#111827] bg-[#F5F6F8] hover:bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-colors placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button (Primary Purple / Indigo) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to Dashboard' : 'Register New Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Credentials Assistant */}
          <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
            <button
              type="button"
              onClick={() => {
                loginAsDemo();
                onSuccess?.();
              }}
              className="w-full py-2 px-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Explore Static App (Demo Mode)</span>
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleQuickAdmin}
                className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <KeyRound className="w-3 h-3" />
                <span>Fill Admin Email (`admin@gmail.com`)</span>
              </button>
            </div>
          </div>

        </form>

        {/* Footer info */}
        <div className="text-center text-[11px] text-[#6B7280]">
          Protected by Row Level Security (RLS) & Auth Tokens.
        </div>

      </div>

    </div>
  );
};
