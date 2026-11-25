'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  DollarSign,
  Receipt,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Printer,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { CustomerPurchase, CustomerPayment } from '@/lib/customer-purchases/types';
import { formatMumbaiDateTime } from '@/lib/common/date-format';
import { deleteCustomerPayment } from '@/lib/customer-purchases/purchase-services';
import {
  viewPaymentReceiptPdfInNewTab,
  downloadPaymentReceiptPdf,
  viewPurchaseStatementPdfInNewTab,
  downloadPurchaseStatementPdf,
} from '@/lib/customer-purchases/purchase-invoice-pdf';

interface PurchaseDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: CustomerPurchase | null;
  projectName?: string;
  onRecordPaymentClick: (purchase: CustomerPurchase) => void;
  onPaymentDeleted?: (paymentId: string) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const PurchaseDetailDrawer: React.FC<PurchaseDetailDrawerProps> = ({
  isOpen,
  onClose,
  purchase,
  projectName = '',
  onRecordPaymentClick,
  onPaymentDeleted,
  showToast,
}) => {
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  if (!isOpen || !purchase) return null;

  const totalAmount = Math.round((Number(purchase.total_amount ?? 0)) * 100) / 100;
  const collected = Math.round((Number(purchase.totalCollected ?? 0)) * 100) / 100;
  const balance = Math.max(0, Math.round((totalAmount - collected) * 100) / 100);
  const percentCollected = totalAmount > 0 ? Math.min(100, Math.round((collected / totalAmount) * 100)) : 0;
  const effectiveProjectName = purchase.project?.name || projectName || 'Site Office';

  const handleDeletePayment = async (payment: CustomerPayment) => {
    const payAmt = Number(payment.amount_paid ?? payment.amountPaid ?? 0);
    const ok = confirm(`Are you sure you want to delete payment receipt "${payment.receipt_voucher_no || payment.receiptVoucherNo}" for Rs. ${payAmt.toLocaleString('en-IN')}?`);
    if (!ok) return;

    try {
      await deleteCustomerPayment(payment.id);
      showToast?.(`Payment ${payment.receipt_voucher_no || payment.receiptVoucherNo} deleted`, 'info');
      onPaymentDeleted?.(payment.id);
    } catch (err: any) {
      alert(`Failed to delete payment: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white/15 text-purple-200 tracking-wider">
                  {purchase.deal_number}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  {purchase.purchase_type}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold mt-0.5 text-white">
                {purchase.customer_name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Financial KPI Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 grid grid-cols-3 gap-3 text-center shrink-0">
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Deal</span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900">
              Rs. {totalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-600 block">Collected ({percentCollected}%)</span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-700">
              Rs. {collected.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-2xl border border-amber-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-600 block">Balance Due</span>
            <span className="text-sm sm:text-base font-extrabold text-amber-700">
              Rs. {balance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section: Customer & Unit Details */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#653ef1]" />
              <span>Customer & Unit Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Construction Site / Project</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-[#653ef1]" />
                  {effectiveProjectName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Unit / Flat / Plot #</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {purchase.unit_number || 'General Unit'}
                </span>
              </div>

              {purchase.customer_phone && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone / Mobile</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {purchase.customer_phone}
                  </span>
                </div>
              )}

              {purchase.customer_email && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Email Address</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {purchase.customer_email}
                  </span>
                </div>
              )}

              {purchase.booking_date && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Booking Date</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {purchase.booking_date}
                  </span>
                </div>
              )}

              {purchase.customer_address && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Customer Address</span>
                  <span className="font-normal text-slate-700 mt-0.5 block">
                    {purchase.customer_address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Notes */}
          {purchase.notes && (
            <div className="bg-amber-50/50 rounded-2xl border border-amber-200/80 p-4 space-y-1.5">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Deal Notes & Special Conditions</span>
              </h3>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {purchase.notes}
              </p>
            </div>
          )}

          {/* Section: Attached Images & Documents */}
          {purchase.images && purchase.images.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#653ef1]" />
                <span>Attached Documents & Photos ({purchase.images.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {purchase.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video flex items-center justify-center cursor-pointer shadow-2xs hover:shadow-md transition-all"
                    onClick={() => setSelectedPreviewImage(img.url)}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="px-2 py-1 rounded bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Payment Collection History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inward Payments & Receipts ({purchase.payments?.length || 0})</span>
              </h3>
              <button
                type="button"
                onClick={() => onRecordPaymentClick(purchase)}
                className="text-xs font-bold text-[#653ef1] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Collect Money</span>
              </button>
            </div>

            {(!purchase.payments || purchase.payments.length === 0) ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No payment received yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Record advance token or installment to generate a Barcode Payment Slip.
                </p>
                <button
                  type="button"
                  onClick={() => onRecordPaymentClick(purchase)}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-[#653ef1] text-white text-xs font-bold cursor-pointer hover:bg-[#522fd1] transition-all"
                >
                  + Collect First Payment
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
                {purchase.payments.map((p) => (
                  <div key={p.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {p.receipt_voucher_no}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {p.payment_mode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>Paid: <strong className="text-slate-700">{formatMumbaiDateTime(p.created_at || p.payment_date)}</strong></span>
                        {p.reference_no && (
                          <span>Ref: <strong className="text-slate-700 font-mono">{p.reference_no}</strong></span>
                        )}
                        {p.received_by && (
                          <span>Rec: <strong className="text-slate-700">{p.received_by}</strong></span>
                        )}
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-slate-600 italic">"{p.notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right mr-1">
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-700 block">
                          +Rs. {Number(p.amount_paid ?? p.amountPaid ?? 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Print Barcode Receipt Slip */}
                      <button
                        type="button"
                        onClick={() => viewPaymentReceiptPdfInNewTab(p, purchase, effectiveProjectName)}
                        className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#653ef1] transition-all cursor-pointer"
                        title="Print / View Barcode Receipt Slip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Download Receipt PDF */}
                      <button
                        type="button"
                        onClick={() => downloadPaymentReceiptPdf(p, purchase, effectiveProjectName)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                        title="Download Receipt Slip PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p)}
                        className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition-all cursor-pointer"
                        title="Delete this payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Bottom Action Toolbar */}
        <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => viewPurchaseStatementPdfInNewTab(purchase, effectiveProjectName)}
              className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#653ef1] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              title="Open full purchase statement with scannable barcode in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Commercial Bill (with Barcode)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadPurchaseStatementPdf(purchase, effectiveProjectName)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer transition-all"
              title="Download Statement PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRecordPaymentClick(purchase)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[#653ef1] hover:from-emerald-700 hover:to-[#522fd1] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-purple-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.4]" />
            <span>+ Collect Money</span>
          </button>
        </div>

        {/* Image Fullscreen Preview Modal */}
        {selectedPreviewImage && (
          <div
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
            onClick={() => setSelectedPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-transparent">
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedPreviewImage}
                alt="Enlarged Document"
                className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
