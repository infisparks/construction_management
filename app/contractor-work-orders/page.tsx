'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ContractorWorkOrdersView } from '@/components/contractor-work-orders/ContractorWorkOrdersView';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function ContractorWorkOrdersPage() {
  const router = useRouter();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center text-xs text-slate-500 font-sans">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading Contractor Work Orders...</span>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-[#F5F6F8] font-sans p-3 sm:p-6 space-y-4">
        {/* Top Breadcrumb Bar */}
        <div className="max-w-7xl mx-auto flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => router.push('/planstructino')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-purple-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:border-purple-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Project Workspace</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Armee Enterprises PMS</span>
          </div>
        </div>

        {/* Main View */}
        <main className="max-w-7xl mx-auto">
          <ContractorWorkOrdersView />
        </main>
      </div>
    </Suspense>
  );
}
