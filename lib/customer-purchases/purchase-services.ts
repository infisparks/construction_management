import { supabase } from '@/lib/supabase/client';
import { CustomerPurchase, CustomerPayment, PurchaseImageAttachment } from './types';
import { fetchDropdownCategory, addCustomCategory } from '@/lib/supabase/category-services';

const STORAGE_PURCHASES_KEY = 'pms_local_customer_purchases';
const STORAGE_PAYMENTS_KEY = 'pms_local_customer_payments';

export function isValidUUID(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

export async function resolveAuthUserId(candidate?: string | null): Promise<string | null> {
  if (isValidUUID(candidate)) {
    return candidate!.trim();
  }
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id && isValidUUID(authData.user.id)) {
      return authData.user.id;
    }
  } catch {
    // ignore
  }
  return null;
}

// Read from LocalStorage fallback
function getLocalPurchases(): CustomerPurchase[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PURCHASES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalPurchases(list: CustomerPurchase[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PURCHASES_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save customer purchases locally:', err);
  }
}

// Map payment row to dual-casing CustomerPayment
function mapPaymentRow(pay: any): CustomerPayment {
  const amt = Number(pay.amount_paid ?? pay.amountPaid ?? 0);
  const vNo = pay.receipt_voucher_no || pay.receiptVoucherNo || '';
  const pId = pay.purchase_id || pay.purchaseId || '';
  const projId = pay.project_id || pay.projectId || null;
  const pDate = pay.payment_date || pay.paymentDate || '';
  const pMode = pay.payment_mode || pay.paymentMode || 'Cash';
  const refNo = pay.reference_no ?? pay.referenceNo ?? null;
  const recBy = pay.received_by ?? pay.receivedBy ?? null;
  const notes = pay.notes ?? null;
  const rUrl = pay.receipt_url ?? pay.receiptUrl ?? null;
  const cUser = pay.created_by_user_id ?? pay.createdByUserId ?? null;
  const cAt = pay.created_at || pay.createdAt || new Date().toISOString();
  const uAt = pay.updated_at || pay.updatedAt || cAt;
  const isDel = Boolean(pay.is_deleted ?? pay.isDeleted ?? false);

  return {
    id: pay.id,
    purchaseId: pId,
    purchase_id: pId,
    projectId: projId,
    project_id: projId,
    receiptVoucherNo: vNo,
    receipt_voucher_no: vNo,
    amountPaid: amt,
    amount_paid: amt,
    paymentDate: pDate,
    payment_date: pDate,
    paymentMode: pMode,
    payment_mode: pMode,
    referenceNo: refNo,
    reference_no: refNo,
    receivedBy: recBy,
    received_by: recBy,
    notes,
    receiptUrl: rUrl,
    receipt_url: rUrl,
    createdByUserId: cUser,
    created_by_user_id: cUser,
    createdAt: cAt,
    created_at: cAt,
    updatedAt: uAt,
    updated_at: uAt,
    isDeleted: isDel,
    is_deleted: isDel,
  };
}

// Map purchase row to dual-casing CustomerPurchase
function mapPurchaseRow(row: any, payments: CustomerPayment[] = []): CustomerPurchase {
  const totalAmount = Math.round((Number(row.total_amount ?? row.totalAmount ?? 0)) * 100) / 100;
  const totalCollected = Math.round(
    payments.reduce((sum, p) => sum + (Number(p.amount_paid ?? p.amountPaid ?? 0) || 0), 0) * 100
  ) / 100;
  const balanceRemaining = Math.max(0, Math.round((totalAmount - totalCollected) * 100) / 100);
  const dealNo = row.deal_number || row.dealNumber || '';
  const custName = row.customer_name || row.customerName || '';
  const projId = row.project_id || row.projectId || '';
  const pType = row.purchase_type || row.purchaseType || 'Room';
  const uNum = row.unit_number ?? row.unitNumber ?? null;
  const cAt = row.created_at || row.createdAt || new Date().toISOString();
  const uAt = row.updated_at || row.updatedAt || cAt;
  const bDate = row.booking_date || row.bookingDate || cAt.slice(0, 10);
  const cUser = row.created_by_user_id ?? row.createdByUserId ?? null;
  const isDel = Boolean(row.is_deleted ?? row.isDeleted ?? false);
  const images = Array.isArray(row.images) ? row.images : [];

  return {
    id: row.id,
    projectId: projId,
    project_id: projId,
    dealNumber: dealNo,
    deal_number: dealNo,
    customerName: custName,
    customer_name: custName,
    customerPhone: row.customer_phone ?? row.customerPhone ?? null,
    customer_phone: row.customer_phone ?? row.customerPhone ?? null,
    customerEmail: row.customer_email ?? row.customerEmail ?? null,
    customer_email: row.customer_email ?? row.customerEmail ?? null,
    customerAddress: row.customer_address ?? row.customerAddress ?? null,
    customer_address: row.customer_address ?? row.customerAddress ?? null,
    purchaseType: pType,
    purchase_type: pType,
    unitNumber: uNum,
    unit_number: uNum,
    totalAmount,
    total_amount: totalAmount,
    totalCollected,
    balanceRemaining,
    notes: row.notes ?? null,
    images,
    bookingDate: bDate,
    booking_date: bDate,
    status: row.status || (balanceRemaining <= 0 ? 'completed' : 'active'),
    createdByUserId: cUser,
    created_by_user_id: cUser,
    createdAt: cAt,
    created_at: cAt,
    updatedAt: uAt,
    updated_at: uAt,
    isDeleted: isDel,
    is_deleted: isDel,
    payments,
    project: row.project,
  };
}

// Generate sequential Deal Number (Code-39 compatible uppercase alphanumeric and dashes)
export async function getNextDealNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DEAL-${currentYear}-`;
  try {
    const { data } = await supabase
      .from('customer_purchases')
      .select('deal_number');

    let maxSeq = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        if (row.deal_number && row.deal_number.startsWith(prefix)) {
          const numPart = parseInt(row.deal_number.slice(prefix.length), 10);
          if (!isNaN(numPart) && numPart > maxSeq) {
            maxSeq = numPart;
          }
        }
      }
    }
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  } catch {
    const local = getLocalPurchases();
    const count = local.length + 1;
    return `${prefix}${String(count).padStart(3, '0')}`;
  }
}

// Generate sequential Payment Receipt Voucher Number (Code-39 compatible)
export async function getNextReceiptNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `REC-${currentYear}-`;
  try {
    const { data } = await supabase
      .from('customer_payments')
      .select('receipt_voucher_no');

    let maxSeq = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        if (row.receipt_voucher_no && row.receipt_voucher_no.startsWith(prefix)) {
          const numPart = parseInt(row.receipt_voucher_no.slice(prefix.length), 10);
          if (!isNaN(numPart) && numPart > maxSeq) {
            maxSeq = numPart;
          }
        }
      }
    }
    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  } catch {
    return `${prefix}0001`;
  }
}

// Upload image file to Supabase storage 'project-documents' (with base64 fallback)
export async function uploadPurchaseImage(file: File): Promise<{ url: string; name: string; size: number }> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `customer-deals/${Date.now()}_${cleanName}`;

  try {
    const { data, error } = await supabase.storage
      .from('project-documents')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (!error && data?.path) {
      const { data: pubData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(data.path);
      return { url: pubData.publicUrl, name: file.name, size: file.size };
    }
  } catch (err) {
    console.warn('Storage upload exception, falling back to Data URL:', err);
  }

  // Fallback: Read as base64 Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ url: reader.result as string, name: file.name, size: file.size });
    };
    reader.onerror = () => {
      resolve({ url: '', name: file.name, size: file.size });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch dynamic category options from 'category' table (with fallback to default array)
 */
export async function fetchCategoryOptions(categoryName: string, defaultOptions: readonly string[] | string[]): Promise<string[]> {
  return fetchDropdownCategory(categoryName, Array.from(defaultOptions));
}

/**
 * Save new dynamic category option into 'category' table
 */
export async function saveCategoryOption(categoryName: string, name: string): Promise<boolean> {
  const current = await fetchDropdownCategory(categoryName, []);
  const res = await addCustomCategory(categoryName, name, current);
  return res.success;
}

/**
 * Fetch customer purchases with optional site filter ('all' for all sites)
 */
export async function fetchCustomerPurchases(projectId: string = 'all'): Promise<CustomerPurchase[]> {
  const localList = getLocalPurchases();

  try {
    let query = supabase
      .from('customer_purchases')
      .select(`
        *,
        project:projects(id, name, code, serial_no)
      `)
      .eq('is_deleted', false)
      .order('booking_date', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data: purchasesData, error: pError } = await query;
    if (pError || !purchasesData) {
      console.warn('[purchase-services] Supabase fetch error, fallback to local storage:', pError?.message);
      return localList.filter((p) => !p.is_deleted && (projectId === 'all' || p.project_id === projectId || p.projectId === projectId));
    }

    const purchaseIds = purchasesData.map((p) => p.id);
    const paymentsMap: Record<string, CustomerPayment[]> = {};

    if (purchaseIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('customer_payments')
        .select('*')
        .in('purchase_id', purchaseIds)
        .eq('is_deleted', false)
        .order('payment_date', { ascending: true });

      if (paymentsData) {
        for (const pay of paymentsData) {
          const mapped = mapPaymentRow(pay);
          if (!paymentsMap[mapped.purchase_id!]) paymentsMap[mapped.purchase_id!] = [];
          paymentsMap[mapped.purchase_id!].push(mapped);
        }
      }
    }

    const merged: CustomerPurchase[] = purchasesData.map((row) => {
      const payments = paymentsMap[row.id] || [];
      return mapPurchaseRow(row, payments);
    });

    setLocalPurchases(merged);
    return merged;
  } catch (err) {
    console.error('[purchase-services] Error fetching purchases:', err);
    return localList.filter((p) => !p.is_deleted);
  }
}

/**
 * Create a new Customer Purchase / Deal
 */
export async function createCustomerPurchase(
  payload: Partial<CustomerPurchase> & { customerName?: string; customer_name?: string; totalAmount?: number; total_amount?: number; projectId?: string; project_id?: string },
  userId?: string
): Promise<CustomerPurchase> {
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const dealNo = payload.dealNumber || payload.deal_number || (await getNextDealNumber());
  const custName = (payload.customerName || payload.customer_name || '').trim();
  const pId = payload.projectId || payload.project_id || '';
  const totAmt = Number(payload.totalAmount ?? payload.total_amount ?? 0);
  const pType = payload.purchaseType || payload.purchase_type || 'Room';
  const uNum = payload.unitNumber ?? payload.unit_number ?? null;
  const bDate = payload.bookingDate || payload.booking_date || now.slice(0, 10);

  const resolvedUserId = await resolveAuthUserId(userId);
  const resolvedProjectId = isValidUUID(pId) ? pId : null;

  const fullRecord = mapPurchaseRow(
    {
      id: newId,
      project_id: resolvedProjectId,
      deal_number: dealNo,
      customer_name: custName,
      customer_phone: payload.customerPhone ?? payload.customer_phone ?? null,
      customer_email: payload.customerEmail ?? payload.customer_email ?? null,
      customer_address: payload.customerAddress ?? payload.customer_address ?? null,
      purchase_type: pType,
      unit_number: uNum,
      total_amount: totAmt,
      notes: payload.notes ?? null,
      images: payload.images || [],
      booking_date: bDate,
      status: payload.status || 'active',
      created_by_user_id: resolvedUserId,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      project: payload.project,
    },
    []
  );

  try {
    const { error } = await supabase.from('customer_purchases').insert({
      id: newId,
      project_id: resolvedProjectId,
      deal_number: dealNo,
      customer_name: custName,
      customer_phone: payload.customerPhone ?? payload.customer_phone ?? null,
      customer_email: payload.customerEmail ?? payload.customer_email ?? null,
      customer_address: payload.customerAddress ?? payload.customer_address ?? null,
      purchase_type: pType,
      unit_number: uNum,
      total_amount: totAmt,
      notes: payload.notes ?? null,
      images: payload.images || [],
      booking_date: bDate,
      status: payload.status || 'active',
      created_by_user_id: resolvedUserId,
      is_deleted: false,
    });

    if (error) {
      console.warn('[purchase-services] Insert to Supabase error, stored in local cache:', error.message);
    }
  } catch (err) {
    console.error('[purchase-services] Failed to insert customer purchase:', err);
  }

  const existing = getLocalPurchases();
  setLocalPurchases([fullRecord, ...existing]);
  return fullRecord;
}

/**
 * Record a Payment Inflow / Collection against a Purchase
 * Flexible signatures supported.
 */
export async function recordCustomerPayment(
  arg1:
    | string
    | {
        purchase_id?: string;
        purchaseId?: string;
        project_id?: string | null;
        projectId?: string | null;
        receipt_voucher_no?: string;
        amount_paid?: number;
        amountPaid?: number;
        payment_date?: string;
        paymentDate?: string;
        payment_mode?: string;
        paymentMode?: string;
        reference_no?: string | null;
        referenceNo?: string | null;
        received_by?: string | null;
        receivedBy?: string | null;
        notes?: string | null;
        receipt_url?: string | null;
        receiptUrl?: string | null;
        created_by_user_id?: string | null;
      },
  arg2?: {
    amountPaid?: number;
    paymentMode?: string;
    paymentDate?: string;
    referenceNo?: string | null;
    receivedBy?: string | null;
    notes?: string | null;
    receiptUrl?: string | null;
    projectId?: string | null;
  },
  userId?: string
): Promise<CustomerPayment> {
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();

  let purchaseId = '';
  let projectId: string | null = null;
  let receiptNo = '';
  let amount = 0;
  let paymentDate = now.slice(0, 10);
  let paymentMode = 'Cash';
  let referenceNo: string | null = null;
  let receivedBy: string | null = null;
  let notes: string | null = null;
  let receiptUrl: string | null = null;
  let createdByUserId = userId || null;

  if (typeof arg1 === 'string') {
    purchaseId = arg1;
    if (arg2) {
      amount = Number(arg2.amountPaid) || 0;
      paymentMode = arg2.paymentMode || 'Cash';
      paymentDate = arg2.paymentDate || now.slice(0, 10);
      referenceNo = arg2.referenceNo || null;
      receivedBy = arg2.receivedBy || null;
      notes = arg2.notes || null;
      receiptUrl = arg2.receiptUrl || null;
      projectId = arg2.projectId || null;
    }
  } else if (typeof arg1 === 'object') {
    purchaseId = arg1.purchase_id || arg1.purchaseId || '';
    projectId = arg1.project_id || arg1.projectId || null;
    receiptNo = arg1.receipt_voucher_no || '';
    amount = Number(arg1.amount_paid ?? arg1.amountPaid ?? 0);
    paymentDate = arg1.payment_date || arg1.paymentDate || now.slice(0, 10);
    paymentMode = arg1.payment_mode || arg1.paymentMode || 'Cash';
    referenceNo = arg1.reference_no ?? arg1.referenceNo ?? null;
    receivedBy = arg1.received_by ?? arg1.receivedBy ?? null;
    notes = arg1.notes ?? null;
    receiptUrl = arg1.receipt_url ?? arg1.receiptUrl ?? null;
    createdByUserId = arg1.created_by_user_id || userId || null;
  }

  if (!receiptNo) {
    receiptNo = await getNextReceiptNumber();
  }

  const resolvedUserId = await resolveAuthUserId(createdByUserId);
  const resolvedProjectId = isValidUUID(projectId) ? projectId : null;

  const fullPayment = mapPaymentRow({
    id: newId,
    purchase_id: purchaseId,
    project_id: resolvedProjectId,
    receipt_voucher_no: receiptNo,
    amount_paid: amount,
    payment_date: paymentDate,
    payment_mode: paymentMode,
    reference_no: referenceNo,
    received_by: receivedBy,
    notes,
    receipt_url: receiptUrl,
    created_by_user_id: resolvedUserId,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  });

  try {
    const { error } = await supabase.from('customer_payments').insert({
      id: newId,
      purchase_id: purchaseId,
      project_id: resolvedProjectId,
      receipt_voucher_no: receiptNo,
      amount_paid: amount,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      reference_no: referenceNo,
      received_by: receivedBy,
      notes,
      receipt_url: receiptUrl,
      created_by_user_id: resolvedUserId,
      is_deleted: false,
    });

    if (error) {
      console.warn('[purchase-services] Insert payment error:', error.message);
      throw new Error(error.message || 'Failed to save payment in Supabase');
    }
  } catch (err: any) {
    console.error('[purchase-services] Error recording payment:', err);
    throw err;
  }

  // Update local cache
  const local = getLocalPurchases();
  const updated = local.map((p) => {
    if (p.id === purchaseId) {
      const pays = [...(p.payments || []), fullPayment];
      const collected = pays.reduce((sum, item) => sum + (Number(item.amount_paid ?? item.amountPaid ?? 0) || 0), 0);
      const tot = Number(p.total_amount ?? p.totalAmount ?? 0);
      return {
        ...p,
        totalCollected: collected,
        balanceRemaining: Math.max(0, tot - collected),
        payments: pays,
      };
    }
    return p;
  });
  setLocalPurchases(updated);

  return fullPayment;
}

/**
 * Soft Delete Customer Purchase
 */
export async function deleteCustomerPurchase(purchaseId: string): Promise<boolean> {
  try {
    await supabase
      .from('customer_purchases')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', purchaseId);
  } catch (err) {
    console.error('[purchase-services] Error deleting purchase:', err);
  }

  const local = getLocalPurchases();
  setLocalPurchases(local.filter((p) => p.id !== purchaseId));
  return true;
}

/**
 * Soft Delete a Payment Voucher
 */
export async function deleteCustomerPayment(paymentId: string, purchaseId?: string): Promise<boolean> {
  try {
    await supabase
      .from('customer_payments')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', paymentId);
  } catch (err) {
    console.error('[purchase-services] Error deleting payment:', err);
  }

  const local = getLocalPurchases();
  const updated = local.map((p) => {
    if (!purchaseId || p.id === purchaseId || p.payments?.some((item) => item.id === paymentId)) {
      const pays = (p.payments || []).filter((item) => item.id !== paymentId);
      const collected = pays.reduce((sum, item) => sum + (Number(item.amount_paid ?? item.amountPaid ?? 0) || 0), 0);
      const tot = Number(p.total_amount ?? p.totalAmount ?? 0);
      return {
        ...p,
        totalCollected: collected,
        balanceRemaining: Math.max(0, tot - collected),
        payments: pays,
      };
    }
    return p;
  });
  setLocalPurchases(updated);
  return true;
}
