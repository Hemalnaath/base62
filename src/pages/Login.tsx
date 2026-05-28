import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '../utils/validators';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Link2 } from 'lucide-react';

// Zod schemas matching user instructions:
// signup: email format + min 8 chars, 1 uppercase letter, 1 number
const signupSchema = z.string()
  .min(8, 'Password must contain at least 8 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter (A-Z).')
  .regex(/[0-9]/, 'Password must contain at least one number (0-9).');

const authSchema = z.object({
  email: z.string().email('Please write a valid email address.').min(1, 'Email is required.'),
  password: signupSchema
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Login() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset
  } = useForm<AuthFormData>({
    resolver: zodResolver(
      activeTab === 'login'
        ? z.object({
            email: z.string().email('Valid email is required.').min(1),
            password: z.string().min(1, 'Password is required.')
          })
        : authSchema
    ),
    mode: 'onBlur' // Enforces validation messages on blur!
  });

  const onSubmit = async (data: AuthFormData) => {
    setSubmitErr(null);
    try {
      if (activeTab === 'login') {
        await login(data.email, data.password);
      } else {
        await signup(data.email, data.password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Authentication sequence failed. Check credentials.';
      setSubmitErr(msg);
    }
  };

  const switchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setSubmitErr(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-gray-200 flex flex-col justify-center items-center p-4 selection:bg-[#6ee7b7] selection:text-[#0d0d0f]">
      {/* Branding Header */}
      <div className="mb-8 flex items-center animate-fade-in select-none">
        <div className="w-8 h-8 bg-[#6ee7b7] flex items-center justify-center font-bold text-[#0d0d0f] rounded-sm mr-2 select-none text-sm font-sans tracking-tighter">
          B.
        </div>
        <span className="text-lg font-semibold tracking-tight uppercase text-gray-100 font-sans">
          BASE<span className="text-[#6ee7b7]/50 font-light">62</span>
        </span>
      </div>

      {/* Main Form Centerpiece */}
      <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-sm p-6 md:p-8 relative">
        {/* Flat Minimal Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 pb-3 text-xs uppercase tracking-widest font-sans font-bold border-b transition-colors cursor-pointer ${
              activeTab === 'login'
                ? 'border-[#6ee7b7] text-[#6ee7b7]'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchTab('signup')}
            className={`flex-1 pb-3 text-xs uppercase tracking-widest font-sans font-bold border-b transition-colors cursor-pointer ${
              activeTab === 'signup'
                ? 'border-[#6ee7b7] text-[#6ee7b7]'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Local Error feedback */}
        {submitErr && (
          <div className="mb-4 p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs font-mono rounded-sm">
            {submitErr}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#6ee7b7] font-bold font-sans">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="e.g. dev-ops@katomaran.com"
              className="w-full bg-[#0d0d0f] border border-white/10 focus:border-[#6ee7b7] rounded-sm px-4 py-3 text-sm font-mono text-gray-100 placeholder:text-gray-650 outline-none transition-colors"
            />
            {errors.email?.message && (
              <p className="text-red-400 text-xs font-mono mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#6ee7b7] font-bold font-sans">
              Password
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full bg-[#0d0d0f] border border-white/10 focus:border-[#6ee7b7] rounded-sm px-4 py-3 pr-10 text-sm font-mono text-gray-100 placeholder:text-gray-650 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-550 hover:text-gray-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password?.message && (
              <p className="text-red-400 text-xs font-mono mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Guidelines parameters for safe signups */}
          {activeTab === 'signup' && (
            <div className="p-4 bg-[#0d0d0f] border border-white/10 rounded-sm space-y-1.5 font-mono text-[10px] text-gray-500">
              <span className="block font-sans font-bold text-gray-450 text-[10px] uppercase tracking-wider mb-1">
                Requirements Checklist:
              </span>
              <p className={errors.password ? 'text-gray-500' : 'text-[#6ee7b7]/80'}>
                ✓ Minimum length of 8 characters
              </p>
              <p className={errors.password ? 'text-gray-500' : 'text-[#6ee7b7]/80'}>
                ✓ At least 1 uppercase character (A-Z)
              </p>
              <p className={errors.password ? 'text-gray-500' : 'text-[#6ee7b7]/80'}>
                ✓ At least 1 numeric element (0-9)
              </p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 bg-[#6ee7b7] hover:bg-[#5cd6a5] disabled:opacity-50 text-[#0d0d0f] font-sans font-bold py-3.5 rounded-sm transition-colors text-xs uppercase tracking-widest flex items-center justify-center space-x-2 cursor-pointer border border-transparent"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Identity...</span>
              </>
            ) : (
              <span>{activeTab === 'login' ? 'Proceed' : 'Create Stack Account'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
