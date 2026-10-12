'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function InventoryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    const tabQuery = tab ? `&tab=${tab}` : '';
    router.replace(`/planstructino?view=materials${tabQuery}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center text-xs text-slate-500 font-sans">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span>Redirecting to Inventory & Materials...</span>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryRedirect />
    </Suspense>
  );
}
