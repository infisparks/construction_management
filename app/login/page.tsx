'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import { LoginPage } from '@/components/auth/LoginPage';

function LoginContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/planstructino');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center text-xs text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span>Verifying security session...</span>
        </div>
      </div>
    );
  }

  return <LoginPage onSuccess={() => router.replace('/planstructino')} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
