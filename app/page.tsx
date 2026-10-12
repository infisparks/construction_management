'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveActiveSite } from '@/lib/supabase/site-storage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function initNavigation() {
      try {
        const { activeProject, allProjects } = await resolveActiveSite();
        if (!activeProject || allProjects.length === 0) {
          router.replace('/sites?first=true');
        } else {
          router.replace('/planstructino');
        }
      } catch (err) {
        console.error('Error checking site in Home:', err);
        router.replace('/planstructino');
      }
    }
    initNavigation();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center text-xs text-slate-500 font-sans">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading Armee Enterprises PMS Workspace...</span>
      </div>
    </div>
  );
}
