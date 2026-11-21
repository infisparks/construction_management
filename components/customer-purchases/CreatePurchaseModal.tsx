'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  DollarSign,
  FileText,
  Upload,
  Plus,
  Trash2,
  Check,
  ImageIcon,
  Sparkles,
  Home,
  Tag,
} from 'lucide-react';
import { CustomerPurchase, PurchaseImageAttachment, DEFAULT_PURCHASE_TYPES, DEFAULT_PAYMENT_MODES } from '@/lib/customer-purchases/types';
import { createCustomerPurchase, uploadPurchaseImage, recordCustomerPayment, getNextReceiptNumber } from '@/lib/customer-purchases/purchase-services';
import { viewPaymentReceiptPdfInNewTab } from '@/lib/customer-purchases/purchase-invoice-pdf';
import { fetchDropdownCategory, addCustomCategory } from '@/lib/supabase/category-services';
import { DbProject } from '@/lib/supabase/types';

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableProjects: DbProject[];
  defaultProjectId?: string;
  userEmail?: string;
  onPurchaseCreated: (purchase: CustomerPurchase) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const CreatePurchaseModal: React.FC<CreatePurchaseModalProps> = ({
  isOpen,
  onClose,
  availableProjects,
  defaultProjectId,
  userEmail,
  onPurchaseCreated,
  showToast,
}) => {
  const [projectId, setProjectId] = useState<string>(
    defaultProjectId && defaultProjectId !== 'all' ? defaultProjectId : (availableProjects[0]?.id || '')
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Purchase Type & Extensible Categories
  const [purchaseTypes, setPurchaseTypes] = useState<string[]>([...DEFAULT_PURCHASE_TYPES]);
  const [selectedType, setSelectedType] = useState<string>('Room');
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  const [unitNumber, setUnitNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));

  // Optional Initial Advance / Token Payment collected at booking
  const [recordInitialPayment, setRecordInitialPayment] = useState(false);
  const [initialAmountPaid, setInitialAmountPaid] = useState('');
  const [initialPaymentMode, setInitialPaymentMode] = useState<string>('Online / Bank Transfer');
  const [initialReferenceNo, setInitialReferenceNo] = useState('');

  // Multiple Image Attachments
  const [attachments, setAttachments] = useState<PurchaseImageAttachment[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultProjectId && defaultProjectId !== 'all') {
      setProjectId(defaultProjectId);
    } else if (availableProjects.length > 0 && !projectId) {
      setProjectId(availableProjects[0].id);
    }
  }, [defaultProjectId, availableProjects]);

  useEffect(() => {
    async function loadCategories() {
      const cats = await fetchDropdownCategory('customer_purchase_types', [...DEFAULT_PURCHASE_TYPES]);
      if (cats && cats.length > 0) {
        setPurchaseTypes(cats);
      }
    }
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const handleAddNewType = async () => {
    const trimmed = newTypeInput.trim();
    if (!trimmed) return;
    const res = await addCustomCategory('customer_purchase_types', trimmed, purchaseTypes);
    if (res.success) {
      setPurchaseTypes(res.categories);
      setSelectedType(trimmed);
      setNewTypeInput('');
      setIsAddingNewType(false);
      showToast?.(`Category "${trimmed}" added!`, 'success');
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map((file) => uploadPurchaseImage(file));
      const uploaded = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploaded]);
      showToast?.(`${uploaded.length} image(s) attached successfully!`, 'info');
    } catch (err) {
      console.error('Image upload failed:', err);
      showToast?.('Could not upload all images, saved locally', 'error');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    const numAmount = parseFloat(totalAmount.replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid total deal amount.');
      return;
    }
    if (!projectId) {
      setErrorMsg('Please select a construction site/project.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const targetProj = availableProjects.find((p) => p.id === projectId);
      const created = await createCustomerPurchase({
        projectId,
        dealNumber: '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        customerEmail: customerEmail.trim() || null,
        customerAddress: customerAddress.trim() || null,
        purchaseType: selectedType,
        unitNumber: unitNumber.trim() || null,
        totalAmount: numAmount,
        notes: notes.trim() || null,
        images: attachments,
        bookingDate,
        status: 'active',
        project: targetProj
          ? {
            id: targetProj.id,
            name: targetProj.name,
            code: targetProj.code || `SITE-${targetProj.serial_no}`,
            serial_no: targetProj.serial_no,
          }
          : undefined,
      });

      let finalPurchase = created;
      const parsedInitAmt = parseFloat(initialAmountPaid.replace(/,/g, ''));

      // If user opted to record an advance token or full payment right now
      if (recordInitialPayment && parsedInitAmt > 0) {
        try {
          const receiptNo = await getNextReceiptNumber();
          const newPayment = await recordCustomerPayment({
            purchase_id: created.id,
            project_id: created.project_id || projectId,
            receipt_voucher_no: receiptNo,
            amount_paid: parsedInitAmt,
            payment_date: bookingDate,
            payment_mode: initialPaymentMode,
            reference_no: initialReferenceNo.trim() || null,
            received_by: userEmail || 'Site Office',
            notes: 'Advance token received at time of deal booking',
            created_by_user_id: null,
          });

          finalPurchase = {
            ...created,
            totalCollected: parsedInitAmt,
            balanceRemaining: Math.max(0, numAmount - parsedInitAmt),
            payments: [newPayment],
          };

          const openPdf = confirm(`Purchase deal registered and initial payment of Rs. ${parsedInitAmt.toLocaleString('en-IN')} recorded!\n\nWould you like to open the Barcode Payment Slip now?`);
          if (openPdf) {
            viewPaymentReceiptPdfInNewTab(newPayment, finalPurchase, targetProj?.name || 'Site Office');
          }
        } catch (payErr) {
          console.error('Failed to record initial payment:', payErr);
        }
      }

      showToast?.(`Purchase deal registered for ${created.customer_name || created.customerName}!`, 'success');
      onPurchaseCreated(finalPurchase);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to register customer purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#653ef1]/10 text-[#653ef1] border border-[#653ef1]/20 flex items-center justify-center font-bold shadow-2xs">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                New Customer Purchase / Deal
              </h2>
              <p className="text-xs text-slate-500">
                Register a unit purchase (Room, 1 BHK, 2 BHK), deal amount, notes, and photos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* 1. Project / Construction Site Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Construction Site / Building <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-[#653ef1] focus:ring-1 focus:ring-[#653ef1]/20 cursor-pointer"
              >
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Customer Basic Info (2-Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer / Buyer Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Meraj Zariwala"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1] focus:ring-1 focus:ring-[#653ef1]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Phone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98200 44102"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1] focus:ring-1 focus:ring-[#653ef1]/20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@gmail.com"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1] focus:ring-1 focus:ring-[#653ef1]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Booking Date
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1] focus:ring-1 focus:ring-[#653ef1]/20 cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Purchase Category & Unit Number */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#653ef1]" />
                <span>Purchase Category / Unit Type</span>
                <span className="text-rose-500">*</span>
              </label>
              {!isAddingNewType && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewType(true)}
                  className="text-[11px] font-bold text-[#653ef1] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add New Category</span>
                </button>
              )}
            </div>

            {isAddingNewType ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value)}
                  placeholder="e.g. Duplex, Row House, 5 BHK"
                  className="flex-1 h-9 px-3 rounded-xl border border-purple-300 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1] bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddNewType}
                  className="px-3 h-9 bg-[#653ef1] text-white text-xs font-bold rounded-xl hover:bg-[#592be8] transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingNewType(false)}
                  className="px-2.5 h-9 bg-slate-200 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:border-[#653ef1] cursor-pointer"
                >
                  {purchaseTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="Unit / Flat # (e.g. Flat 302, Shop 5)"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1] bg-white"
                />
              </div>
            )}
          </div>

          {/* 4. Total Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Total Deal Amount (INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-[#653ef1] text-xs select-none">Rs.</span>
              <input
                type="text"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="e.g. 25,00,000 or 50,000"
                className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:border-[#653ef1] focus:ring-1 focus:ring-[#653ef1]/20 font-numeric"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Total agreed purchase value. Payments and collections can be recorded later in installments.
            </p>
          </div>

          {/* Optional Advance / Initial Token Payment Received at Booking */}
          <div className="p-3.5 rounded-xl border border-emerald-200/90 bg-emerald-50/40 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordInitialPayment}
                onChange={(e) => {
                  setRecordInitialPayment(e.target.checked);
                  if (e.target.checked && !initialAmountPaid && totalAmount) {
                    setInitialAmountPaid(totalAmount);
                  }
                }}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-emerald-950">
                Collect Payment / Advance Token Now (Updates &ldquo;Collected&rdquo; immediately)
              </span>
            </label>

            {recordInitialPayment && (
              <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Amount Received Now (Rs.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="0.00"
                    value={initialAmountPaid}
                    onChange={(e) => setInitialAmountPaid(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={initialPaymentMode}
                    onChange={(e) => setInitialPaymentMode(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {DEFAULT_PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ref / Cheque / UTR #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-98213 or Cash"
                    value={initialReferenceNo}
                    onChange={(e) => setInitialReferenceNo(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Freeform Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deal Notes / Specifications
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write any specifications, payment installment terms, parking allotment, key handover dates, etc."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#653ef1] focus:ring-1 focus:ring-[#653ef1]/20 resize-none"
            />
          </div>

          {/* 6. Multiple Image Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#653ef1]" />
                <span>Attach Images / Documents (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {attachments.length} attached
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-purple-50/20 rounded-xl p-4 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFilesSelected}
              />
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-bold text-slate-700">
                  {isUploadingImages ? 'Uploading images...' : 'Click or drop multiple images / documents here'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Floor plans, KYC copies, agreement photos, unit snapshots
                </span>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video flex items-center justify-center"
                  >
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded truncate">
                      {att.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6e46f2] via-[#653ef1] to-[#592be8] hover:from-[#764ff5] hover:to-[#5022e3] rounded-xl transition-all shadow-md shadow-[#653ef1]/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving Deal...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Customer Purchase</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
