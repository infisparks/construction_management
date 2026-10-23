'use client';

import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Calendar, 
  User, 
  Phone, 
  Receipt, 
  TrendingUp, 
  HandCoins, 
  Download, 
  Printer, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Barcode as BarcodeIcon,
  ChevronRight,
  Plus
} from 'lucide-react';
import { ContractorWorkOrder } from '@/lib/contractor-work-orders/types';
import { formatINR, downloadWorkOrderPdf, viewWorkOrderPdfInNewTab } from '@/lib/contractor-work-orders/work-order-invoice-pdf';

interface WorkOrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: ContractorWorkOrder | null;
  projectName: string;
  projectCode?: string;
  onOpenAddExtra: (order: ContractorWorkOrder) => void;
  onOpenRecordPayment: (order: ContractorWorkOrder) => void;
}

export const WorkOrderDetailDrawer: React.FC<WorkOrderDetailDrawerProps> = ({
  isOpen,
  onClose,
  workOrder,
  projectName,
  projectCode = 'NC-2026',
  onOpenAddExtra,
  onOpenRecordPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'revisions' | 'payments'>('overview');

  if (!isOpen || !workOrder) return null;

  const revisions = workOrder.revisions || [];
  const payments = workOrder.payments || [];
  const isPending = workOrder.balanceRemaining > 0;

  const handleDownloadPdf = () => {
    downloadWorkOrderPdf(workOrder, {
      projectName,
      projectCode,
    });
  };

  const handleViewPdf = () => {
    viewWorkOrderPdfInNewTab(workOrder, {
      projectName,
      projectCode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                  {workOrder.workOrderNumber}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  workOrder.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {workOrder.status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">{workOrder.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleViewPdf}
              title="Print / View Invoice PDF"
              className="p-2 rounded-lg text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer border border-slate-200"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              title="Download PDF"
              className="p-2 rounded-lg text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer border border-slate-200"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Commercial Highlights Bar */}
        <div className="bg-slate-900 text-white p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Initial Contract</span>
            <span className="text-sm font-bold text-slate-200">{formatINR(workOrder.initialAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider block">Extra Work (+)</span>
            <span className="text-sm font-bold text-amber-300">+{formatINR(workOrder.extraAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider block">Revised Total Deal</span>
            <span className="text-base font-extrabold text-white">{formatINR(workOrder.totalRevisedAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Balance Remaining</span>
            <span className={`text-base font-extrabold ${isPending ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatINR(workOrder.balanceRemaining)}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons Bar */}
        <div className="px-5 py-2.5 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between gap-2">
          <div className="text-xs text-purple-900 font-medium">
            Already Given: <strong className="text-emerald-700">{formatINR(workOrder.totalPaid)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAddExtra(workOrder)}
              className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Add Extra Work</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenRecordPayment(workOrder)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <HandCoins className="w-3.5 h-3.5" />
              <span>Give Payment</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-5 border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Vendor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('revisions')}
            className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'revisions'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Extra Work History</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {revisions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Payout History</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {payments.length}
            </span>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Vendor Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contractor Profile</span>
                  <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                    {workOrder.tradeCategory}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {workOrder.vendorName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{workOrder.vendorName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {workOrder.vendorPhone || 'No phone recorded'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  {workOrder.vendorBankUpi && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bank / UPI:</span>
                      <span className="font-mono font-medium text-slate-800">{workOrder.vendorBankUpi}</span>
                    </div>
                  )}
                  {workOrder.vendorGstin && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="font-mono text-slate-800">{workOrder.vendorGstin}</span>
                    </div>
                  )}
                  {workOrder.vendorPan && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">PAN:</span>
                      <span className="font-mono text-slate-800">{workOrder.vendorPan}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Scope Card */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scope & Specifications</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {workOrder.scopeDescription || 'General site contractor work according to site engineering schedule.'}
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Start: {workOrder.startDate}</span>
                  </div>
                  {workOrder.expectedCompletionDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target: {workOrder.expectedCompletionDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Barcode Preview Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Barcode Verification</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">{workOrder.workOrderNumber}</span>
                  <p className="text-[10px] text-slate-500">Printed on certified invoice & payment receipts</p>
                </div>
                <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1 text-slate-700 font-mono text-xs">
                  <BarcodeIcon className="w-5 h-5 text-purple-600" />
                  <span>Code 39</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revisions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Contract Variation Amendments</span>
                <button
                  type="button"
                  onClick={() => onOpenAddExtra(workOrder)}
                  className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Extra Work
                </button>
              </div>

              {revisions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No extra work variations added yet. Initial contract stands at {formatINR(workOrder.initialAmount)}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {revisions.map((rev, idx) => (
                    <div
                      key={rev.id || idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-purple-300 transition-colors shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800">{rev.revisionDate}</span>
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-full font-bold">
                            {rev.revisionType === 'initial_agreement' ? 'Base Agreement' : 'Extra Work (+)'}
                          </span>
                        </div>
                        <strong className="text-amber-800 font-bold">
                          {rev.additionalAmount >= 0 ? '+' : ''}{formatINR(rev.additionalAmount)}
                        </strong>
                      </div>

                      <p className="text-xs text-slate-800 font-medium">{rev.reason}</p>
                      {rev.notes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {rev.notes}
                        </p>
                      )}

                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Previous: {formatINR(rev.previousAmount)}</span>
                        <span>Revised Total: <strong className="text-purple-700">{formatINR(rev.newTotalAmount)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Disbursements & Payment Records</span>
                <button
                  type="button"
                  onClick={() => onOpenRecordPayment(workOrder)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Give Payment
                </button>
              </div>

              {payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No payment disbursements recorded yet. Full balance of {formatINR(workOrder.totalRevisedAmount)} is pending.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {payments.map((pay, idx) => (
                    <div
                      key={pay.id || idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold">
                            {pay.paymentVoucherNo}
                          </span>
                          <span className="font-semibold text-slate-800">{pay.paymentDate}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                            {pay.paymentMode}
                          </span>
                        </div>
                        <strong className="text-emerald-700 font-extrabold text-sm">
                          {formatINR(pay.amountPaid)}
                        </strong>
                      </div>

                      <div className="text-xs text-slate-700">
                        Paid to: <strong className="text-slate-900">{pay.paidTo}</strong>
                        {pay.referenceNumber && (
                          <span className="text-slate-500 font-mono ml-2">({pay.referenceNumber})</span>
                        )}
                      </div>

                      {pay.notes && (
                        <p className="text-[11px] text-slate-500 bg-emerald-50/40 p-2 rounded-lg border border-emerald-100">
                          {pay.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Created: {workOrder.startDate}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleViewPdf}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
