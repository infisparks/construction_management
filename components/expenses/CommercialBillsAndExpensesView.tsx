'use client';

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  FileSpreadsheet, 
  Building2, 
  Sparkles, 
  Layers,
  ArrowRight,
  Wrench,
  ArrowDownLeft
} from 'lucide-react';
import { ProjectInfo, Party, ConstructionTask, SubcontractorBill } from '@/lib/construction-planning/types';
import { DbProject } from '@/lib/supabase/types';
import { SiteExpensesView } from './SiteExpensesView';
import { SubcontractorBillsView } from '@/components/construction-planning/SubcontractorBillsView';
import { ContractorWorkOrdersView } from '@/components/contractor-work-orders/ContractorWorkOrdersView';
import { CustomerPurchasesView } from '@/components/customer-purchases/CustomerPurchasesView';
import { VendorProfileView } from '@/components/inventory/VendorProfileView';

export type CommercialTab = 'expenses' | 'subcontractor-bills' | 'contractor-work-orders' | 'customer-purchases' | 'vendors';

interface CommercialBillsAndExpensesViewProps {
  initialTab?: CommercialTab;
  project?: ProjectInfo;
  projectId?: string;
  allProjects?: DbProject[];
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
  onSelectProject?: (project: any) => void;
}

export const CommercialBillsAndExpensesView: React.FC<CommercialBillsAndExpensesViewProps> = ({
  initialTab = 'expenses',
  project,
  projectId = '',
  allProjects = [],
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
  onSelectProject,
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
    <div className="w-full space-y-3 animate-in fade-in duration-150">
      {/* If not on site expenses, render the commercial tabs toolbar */}
      {activeTab !== 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 w-full sm:w-auto">
            {/* Tab 1: Site Daily Bills & Expenses */}
            <button
              type="button"
              onClick={() => handleSelectTab('expenses')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            >
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
              <span>Daily Bills & Expenses</span>
            </button>

            {/* Tab 2: Contractor Work Orders (Hidden per user request) */}
            {/* <button
              type="button"
              onClick={() => handleSelectTab('contractor-work-orders')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'contractor-work-orders'
                  ? 'bg-white text-[#653ef1] shadow-2xs border border-[#653ef1]/30 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Wrench className={`w-3.5 h-3.5 ${activeTab === 'contractor-work-orders' ? 'text-[#653ef1] stroke-[2.3]' : 'text-slate-400'}`} />
              <span>Work Orders</span>
            </button> */}

            {/* Tab 3: Customer Purchases & Inflow */}
            <button
              type="button"
              onClick={() => handleSelectTab('customer-purchases')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'customer-purchases'
                  ? 'bg-white text-[#653ef1] shadow-2xs border border-[#653ef1]/30 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ArrowDownLeft className={`w-3.5 h-3.5 ${activeTab === 'customer-purchases' ? 'text-[#653ef1] stroke-[2.3]' : 'text-slate-400'}`} />
              <span>Sales & Inflow</span>
            </button>

            {/* Tab 4: Vendors & Parties Directory */}
            <button
              type="button"
              onClick={() => handleSelectTab('vendors')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vendors'
                  ? 'bg-white text-[#653ef1] shadow-2xs border border-[#653ef1]/30 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'vendors' ? 'text-[#653ef1] stroke-[2.3]' : 'text-slate-400'}`} />
              <span>Vendors & Parties</span>
            </button>
          </div>

          {/* Project Context & Meta */}
          <div className="hidden md:flex items-center gap-2 pr-2 text-xs text-slate-500">
            <Building2 className="w-3.5 h-3.5 text-[#653ef1]" />
            <span>Project Commercial:</span>
            <strong className="text-slate-800 font-semibold">{project?.name || 'Loading Site...'}</strong>
          </div>
        </div>
      )}

      {/* Tab Content Display */}
      {activeTab === 'expenses' ? (
        <SiteExpensesView
          project={project}
          projectId={projectId || project?.id}
          allProjects={allProjects}
          userEmail={userEmail}
          showToast={showToast}
          externalActionTrigger={externalActionTrigger}
          activeCommercialTab={activeTab}
          onSelectCommercialTab={handleSelectTab}
        />
      ) : activeTab === 'contractor-work-orders' ? (
        <ContractorWorkOrdersView
          project={project}
          projectId={projectId || project?.id}
          allProjects={allProjects}
          onSelectProject={onSelectProject}
          showToast={showToast}
        />
      ) : activeTab === 'customer-purchases' ? (
        <CustomerPurchasesView
          project={project}
          projectId={projectId || project?.id}
          allProjects={allProjects}
          userEmail={userEmail}
          showToast={showToast}
        />
      ) : activeTab === 'vendors' ? (
        <VendorProfileView showToast={showToast} />
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
