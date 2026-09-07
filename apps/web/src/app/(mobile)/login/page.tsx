'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#12141A]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center px-6 py-12 text-[#12141A]">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#12141A] text-white shadow-lg">
              <span className="h-3 w-3 rounded-full bg-[#FF5A1F] group-hover:scale-125 transition-transform" />
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold font-display text-[#12141A]">AtmosAI</h1>
          <p className="text-xs text-[#565b68] mt-1.5 font-mono">
            Autonomous Meteorological Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#12141A]/10 p-6 sm:p-8 shadow-sm space-y-4">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-[#12141A]/15 rounded-2xl font-semibold text-xs text-[#12141A] hover:bg-[#F7F4EC]/60 transition-all shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Official Credentials
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px bg-[#12141A]/10 flex-1" />
            <span className="text-[10px] uppercase font-mono text-[#8b8e97]">or continue as observer</span>
            <div className="h-px bg-[#12141A]/10 flex-1" />
          </div>

          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#12141A] hover:bg-[#FF5A1F] text-[#F7F4EC] rounded-2xl font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <span>Enter Live Command Dashboard</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <p className="text-[11px] text-center text-[#8b8e97] mt-6">
          Authorized for IMD, NDMA, SDMA, and Verified Ground Observers
        </p>
      </div>
    </div>
  );
}
