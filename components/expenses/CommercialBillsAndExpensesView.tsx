'use client';

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  FileSpreadsheet, 
  Building2, 
  Sparkles, 
  Layers,
  ArrowRight,
  Wrench
} from 'lucide-react';
import { ProjectInfo, Party, ConstructionTask, SubcontractorBill } from '@/lib/construction-planning/types';
import { SiteExpensesView } from './SiteExpensesView';
import { SubcontractorBillsView } from '@/components/construction-planning/SubcontractorBillsView';
import { ContractorWorkOrdersView } from '@/components/contractor-work-orders/ContractorWorkOrdersView';

export type CommercialTab = 'expenses' | 'subcontractor-bills' | 'contractor-work-orders';

interface CommercialBillsAndExpensesViewProps {
  initialTab?: CommercialTab;
  project?: ProjectInfo;
  projectId?: string;
  userEmail?: string;
  userRole?: string;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
  externalActionTrigger?: { action: string; timestamp: number } | null;
  // Subcontractor bill props
  subcontractorBills: SubcontractorBill[];
  parties: Party[];
  tasks: ConstructionTask[];
  onSaveSubcontractorBill: (bill: SubcontractorBill) => void;
  onDeleteSubcontractorBill: (billId: string) => void;
  onTabChange?: (tab: CommercialTab) => void;
}

export const CommercialBillsAndExpensesView: React.FC<CommercialBillsAndExpensesViewProps> = ({
  initialTab = 'expenses',
  project,
  projectId = 'f0e510da-9530-468f-bb09-59920070d55e',
  userEmail,
  userRole,
  showToast,
  externalActionTrigger,
  subcontractorBills,
  parties,
  tasks,
  onSaveSubcontractorBill,
  onDeleteSubcontractorBill,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<CommercialTab>(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSelectTab = (tab: CommercialTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-150">
      {/* Unified Top Commercial Navigation Tabs (1 Single Page for Bills & Expenses) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 w-full sm:w-auto">
          {/* Tab 1: Site Daily Bills & Expenses */}
          <button
            type="button"
            onClick={() => handleSelectTab('expenses')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-white text-purple-700 shadow-2xs border border-purple-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'expenses' ? 'text-purple-600 stroke-[2.3]' : 'text-slate-400'}`} />
            <span>Site Daily Bills & Expenses</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'expenses' 
                ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                : 'bg-slate-200/80 text-slate-600'
            }`}>
              Daily Burn & Petty Cash
            </span>
          </button>

          {/* Tab 2: Sub-Contractor Bills (RA) */}
          <button
            type="button"
            onClick={() => handleSelectTab('subcontractor-bills')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'subcontractor-bills'
                ? 'bg-white text-purple-700 shadow-2xs border border-purple-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'subcontractor-bills' ? 'text-purple-600 stroke-[2.3]' : 'text-slate-400'}`} />
            <span>Sub-Contractor Bills (RA)</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'subcontractor-bills' 
                ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                : 'bg-slate-200/80 text-slate-600'
            }`}>
              RA Invoicing
            </span>
          </button>

          {/* Tab 3: Contractor Work Orders & Khata */}
          <button
            type="button"
            onClick={() => handleSelectTab('contractor-work-orders')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'contractor-work-orders'
                ? 'bg-white text-purple-700 shadow-2xs border border-purple-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Wrench className={`w-4 h-4 ${activeTab === 'contractor-work-orders' ? 'text-purple-600 stroke-[2.3]' : 'text-slate-400'}`} />
            <span>Work Orders & Khata</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'contractor-work-orders' 
                ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                : 'bg-slate-200/80 text-slate-600'
            }`}>
              Extra Work & Payouts
            </span>
          </button>
        </div>

        {/* Project Context & Meta */}
        <div className="hidden md:flex items-center gap-2 pr-2 text-xs text-slate-500">
          <Building2 className="w-3.5 h-3.5 text-purple-600" />
          <span>Project Commercial:</span>
          <strong className="text-slate-800 font-semibold">{project?.name || 'Noori Crest Tower'}</strong>
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'expenses' ? (
        <SiteExpensesView
          project={project}
          projectId={projectId}
          userEmail={userEmail}
          showToast={showToast}
          externalActionTrigger={externalActionTrigger}
        />
      ) : activeTab === 'contractor-work-orders' ? (
        <ContractorWorkOrdersView
          project={project}
          projectId={projectId}
          showToast={showToast}
        />
      ) : (
        <SubcontractorBillsView
          bills={subcontractorBills}
          project={project || { id: projectId, name: 'Noori Crest Tower', clientName: 'Noori Developers', siteLocation: 'Sector 62', contractValue: '₹ 15,00,00,000' } as any}
          parties={parties}
          tasks={tasks}
          onSaveBill={onSaveSubcontractorBill}
          onDeleteBill={onDeleteSubcontractorBill}
          showToast={showToast}
          userEmail={userEmail}
          userRole={userRole}
        />
      )}
    </div>
  );
};
