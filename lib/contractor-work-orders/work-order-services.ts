import { supabase } from '@/lib/supabase/client';
import {
  ContractorWorkOrder,
  WorkOrderRevision,
  WorkOrderPayment,
} from './types';

const STORAGE_KEY_PREFIX = 'pms_contractor_work_orders_';

// Generate sequential work order number
export function generateWorkOrderNumber(existingCount: number = 0): string {
  const currentYear = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(3, '0');
  return `WO-${currentYear}-${seq}`;
}

// Generate payment voucher number
export function generatePaymentVoucherNumber(existingCount: number = 0): string {
  const currentYear = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(4, '0');
  return `PV-${currentYear}-${seq}`;
}

// Local storage fallback helpers
function getLocalKey(projectId: string): string {
  return `${STORAGE_KEY_PREFIX}${projectId}`;
}

function readLocalOrders(projectId: string): ContractorWorkOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getLocalKey(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read local work orders:', err);
    return [];
  }
}

function saveLocalOrders(projectId: string, orders: ContractorWorkOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getLocalKey(projectId), JSON.stringify(orders));
  } catch (err) {
    console.warn('Failed to save local work orders:', err);
  }
}

// Map Database row to UI object
export function mapDbWorkOrderToUi(
  db: any,
  revisions: WorkOrderRevision[] = [],
  payments: WorkOrderPayment[] = []
): ContractorWorkOrder {
  const initialAmount = Number(db.initial_amount) || 0;
  const extraAmount = Number(db.extra_amount) || 0;
  const totalRevisedAmount = Number(db.total_revised_amount) || (initialAmount + extraAmount);
  const totalPaid = Number(db.total_paid) || 0;
  const balanceRemaining = Number(db.balance_remaining) ?? (totalRevisedAmount - totalPaid);

  return {
    id: db.id,
    projectId: db.project_id,
    workOrderNumber: db.work_order_number,
    title: db.title,
    tradeCategory: db.trade_category || 'General Construction',
    scopeDescription: db.scope_description || '',
    vendorName: db.vendor_name,
    vendorPhone: db.vendor_phone || '',
    vendorAddress: db.vendor_address || '',
    vendorGstin: db.vendor_gstin || '',
    vendorPan: db.vendor_pan || '',
    vendorBankUpi: db.vendor_bank_upi || '',
    startDate: db.start_date || new Date().toISOString().split('T')[0],
    expectedCompletionDate: db.expected_completion_date || '',
    status: db.status || 'in_progress',
    initialAmount,
    extraAmount,
    totalRevisedAmount,
    totalPaid,
    balanceRemaining,
    notes: db.notes || '',
    revisions,
    payments,
    createdAt: db.created_at || new Date().toISOString(),
    updatedAt: db.updated_at || new Date().toISOString(),
  };
}

// Map UI to DB payload
export function mapUiWorkOrderToDb(order: Partial<ContractorWorkOrder>, projectId: string): any {
  return {
    project_id: projectId,
    work_order_number: order.workOrderNumber,
    title: order.title,
    trade_category: order.tradeCategory || 'General Construction',
    scope_description: order.scopeDescription || null,
    vendor_name: order.vendorName,
    vendor_phone: order.vendorPhone || null,
    vendor_address: order.vendorAddress || null,
    vendor_gstin: order.vendorGstin || null,
    vendor_pan: order.vendorPan || null,
    vendor_bank_upi: order.vendorBankUpi || null,
    start_date: order.startDate || new Date().toISOString().split('T')[0],
    expected_completion_date: order.expectedCompletionDate || null,
    status: order.status || 'in_progress',
    initial_amount: Number(order.initialAmount) || 0,
    extra_amount: Number(order.extraAmount) || 0,
    total_revised_amount: Number(order.totalRevisedAmount) || 0,
    total_paid: Number(order.totalPaid) || 0,
    balance_remaining: Number(order.balanceRemaining) || 0,
    notes: order.notes || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch all work orders for a project with their revisions & payments
 */
export async function fetchProjectWorkOrders(projectId: string): Promise<ContractorWorkOrder[]> {
  const localList = readLocalOrders(projectId);

  try {
    const { data: orders, error: ordersError } = await supabase
      .from('contractor_work_orders')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (ordersError || !orders) {
      console.warn('Supabase work orders fetch warning (using local fallback if available):', ordersError?.message);
      return localList;
    }

    // Fetch related revisions & payments for all fetched orders
    const orderIds = orders.map((o) => o.id);
    let revisionsMap: Record<string, WorkOrderRevision[]> = {};
    let paymentsMap: Record<string, WorkOrderPayment[]> = {};

    if (orderIds.length > 0) {
      const [{ data: revisionsData }, { data: paymentsData }] = await Promise.all([
        supabase
          .from('work_order_revisions')
          .select('*')
          .in('work_order_id', orderIds)
          .order('revision_date', { ascending: true }),
        supabase
          .from('work_order_payments')
          .select('*')
          .in('work_order_id', orderIds)
          .order('payment_date', { ascending: true }),
      ]);

      if (revisionsData) {
        for (const rev of revisionsData) {
          if (!revisionsMap[rev.work_order_id]) revisionsMap[rev.work_order_id] = [];
          revisionsMap[rev.work_order_id].push({
            id: rev.id,
            workOrderId: rev.work_order_id,
            projectId: rev.project_id,
            revisionType: rev.revision_type,
            previousAmount: Number(rev.previous_amount) || 0,
            additionalAmount: Number(rev.additional_amount) || 0,
            newTotalAmount: Number(rev.new_total_amount) || 0,
            reason: rev.reason,
            notes: rev.notes || undefined,
            addedBy: rev.added_by || undefined,
            revisionDate: rev.revision_date,
            createdAt: rev.created_at,
          });
        }
      }

      if (paymentsData) {
        for (const pay of paymentsData) {
          if (!paymentsMap[pay.work_order_id]) paymentsMap[pay.work_order_id] = [];
          paymentsMap[pay.work_order_id].push({
            id: pay.id,
            workOrderId: pay.work_order_id,
            projectId: pay.project_id,
            paymentVoucherNo: pay.payment_voucher_no,
            paymentDate: pay.payment_date,
            amountPaid: Number(pay.amount_paid) || 0,
            paymentMode: pay.payment_mode,
            referenceNumber: pay.reference_number || undefined,
            paidTo: pay.paid_to,
            paidBy: pay.paid_by || undefined,
            notes: pay.notes || undefined,
            createdAt: pay.created_at,
          });
        }
      }
    }

    const merged = orders.map((dbOrder) =>
      mapDbWorkOrderToUi(
        dbOrder,
        revisionsMap[dbOrder.id] || [],
        paymentsMap[dbOrder.id] || []
      )
    );

    // Save to local storage for fast cached startup
    saveLocalOrders(projectId, merged);
    return merged;
  } catch (err) {
    console.error('Error fetching work orders:', err);
    return localList;
  }
}

/**
 * Create a new Contractor Work Order
 */
export async function createWorkOrder(
  order: Omit<ContractorWorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'extraAmount' | 'totalRevisedAmount' | 'totalPaid' | 'balanceRemaining'>,
  projectId: string
): Promise<ContractorWorkOrder> {
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const initialAmt = Number(order.initialAmount) || 0;

  const fullOrder: ContractorWorkOrder = {
    ...order,
    id: newId,
    projectId,
    initialAmount: initialAmt,
    extraAmount: 0,
    totalRevisedAmount: initialAmt,
    totalPaid: 0,
    balanceRemaining: initialAmt,
    revisions: [],
    payments: [],
    createdAt: now,
    updatedAt: now,
  };

  // Add initial agreement revision log
  const initialRevision: WorkOrderRevision = {
    id: crypto.randomUUID(),
    workOrderId: newId,
    projectId,
    revisionType: 'initial_agreement',
    previousAmount: 0,
    additionalAmount: initialAmt,
    newTotalAmount: initialAmt,
    reason: 'Initial Work Contract Agreed Amount',
    notes: order.scopeDescription || 'Base contract scope agreed',
    revisionDate: order.startDate || now.split('T')[0],
    createdAt: now,
  };
  fullOrder.revisions = [initialRevision];

  // 1. Try Supabase
  try {
    const payload = {
      id: newId,
      ...mapUiWorkOrderToDb(fullOrder, projectId),
      created_at: now,
    };

    const { error: insertError } = await supabase
      .from('contractor_work_orders')
      .insert([payload]);

    if (!insertError) {
      // Also insert initial revision record
      await supabase.from('work_order_revisions').insert([
        {
          id: initialRevision.id,
          work_order_id: newId,
          project_id: projectId,
          revision_type: initialRevision.revisionType,
          previous_amount: 0,
          additional_amount: initialAmt,
          new_total_amount: initialAmt,
          reason: initialRevision.reason,
          notes: initialRevision.notes || null,
          revision_date: initialRevision.revisionDate,
          created_at: now,
        },
      ]);
    } else {
      console.warn('Supabase work order insert failed, using local storage:', insertError.message);
    }
  } catch (err) {
    console.warn('Supabase work order insert exception, fallback to local:', err);
  }

  // Update local storage
  const current = readLocalOrders(projectId);
  const updated = [fullOrder, ...current.filter((o) => o.id !== newId)];
  saveLocalOrders(projectId, updated);

  return fullOrder;
}

/**
 * Add an Extra Work Revision / Amendment (e.g., Plastering 1000 area extra -> +20,000)
 */
export async function addExtraWorkRevision(
  workOrderId: string,
  projectId: string,
  data: {
    additionalAmount: number;
    reason: string; // e.g. "Plaster work 1000 area extra requested"
    notes?: string;
    revisionDate?: string;
    addedBy?: string;
    revisionType?: WorkOrderRevision['revisionType'];
  }
): Promise<{ order: ContractorWorkOrder; revision: WorkOrderRevision }> {
  const currentOrders = readLocalOrders(projectId);
  const orderIndex = currentOrders.findIndex((o) => o.id === workOrderId);
  const existingOrder = currentOrders[orderIndex];

  const now = new Date().toISOString();
  const revDate = data.revisionDate || now.split('T')[0];
  const prevAmount = existingOrder ? existingOrder.totalRevisedAmount : 0;
  const addAmt = Number(data.additionalAmount) || 0;
  const newTotal = prevAmount + addAmt;

  const revision: WorkOrderRevision = {
    id: crypto.randomUUID(),
    workOrderId,
    projectId,
    revisionType: data.revisionType || 'extra_work',
    previousAmount: prevAmount,
    additionalAmount: addAmt,
    newTotalAmount: newTotal,
    reason: data.reason,
    notes: data.notes || '',
    addedBy: data.addedBy || 'Site Project Manager',
    revisionDate: revDate,
    createdAt: now,
  };

  // Try DB insert
  try {
    const { error: revError } = await supabase.from('work_order_revisions').insert([
      {
        id: revision.id,
        work_order_id: workOrderId,
        project_id: projectId,
        revision_type: revision.revisionType,
        previous_amount: prevAmount,
        additional_amount: addAmt,
        new_total_amount: newTotal,
        reason: revision.reason,
        notes: revision.notes || null,
        added_by: revision.addedBy || null,
        revision_date: revDate,
        created_at: now,
      },
    ]);

    if (!revError) {
      // Update parent order in DB directly (trigger also handles this)
      await supabase
        .from('contractor_work_orders')
        .update({
          extra_amount: (existingOrder?.extraAmount || 0) + addAmt,
          total_revised_amount: newTotal,
          balance_remaining: newTotal - (existingOrder?.totalPaid || 0),
          updated_at: now,
        })
        .eq('id', workOrderId);
    }
  } catch (err) {
    console.warn('Supabase revision insert exception, updating local:', err);
  }

  // Update local memory & storage
  let updatedOrder: ContractorWorkOrder;
  if (existingOrder) {
    const newExtra = existingOrder.extraAmount + addAmt;
    const newRevised = existingOrder.initialAmount + newExtra;
    const newRemaining = newRevised - existingOrder.totalPaid;
    updatedOrder = {
      ...existingOrder,
      extraAmount: newExtra,
      totalRevisedAmount: newRevised,
      balanceRemaining: newRemaining,
      revisions: [...(existingOrder.revisions || []), revision],
      updatedAt: now,
    };
    currentOrders[orderIndex] = updatedOrder;
    saveLocalOrders(projectId, currentOrders);
  } else {
    updatedOrder = {
      id: workOrderId,
      projectId,
      workOrderNumber: 'WO-REVISED',
      title: 'Work Order',
      tradeCategory: 'General Construction',
      vendorName: 'Contractor',
      startDate: revDate,
      status: 'in_progress',
      initialAmount: prevAmount,
      extraAmount: addAmt,
      totalRevisedAmount: newTotal,
      totalPaid: 0,
      balanceRemaining: newTotal,
      revisions: [revision],
      payments: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  return { order: updatedOrder, revision };
}

/**
 * Record a Payment / Disbursal to Contractor
 */
export async function recordWorkOrderPayment(
  workOrderId: string,
  projectId: string,
  data: {
    amountPaid: number;
    paymentDate?: string;
    paymentMode: WorkOrderPayment['paymentMode'];
    paidTo: string;
    referenceNumber?: string;
    paidBy?: string;
    notes?: string;
    paymentVoucherNo?: string;
  }
): Promise<{ order: ContractorWorkOrder; payment: WorkOrderPayment }> {
  const currentOrders = readLocalOrders(projectId);
  const orderIndex = currentOrders.findIndex((o) => o.id === workOrderId);
  const existingOrder = currentOrders[orderIndex];

  const now = new Date().toISOString();
  const payDate = data.paymentDate || now.split('T')[0];
  const paidAmt = Number(data.amountPaid) || 0;
  const voucherNo = data.paymentVoucherNo || generatePaymentVoucherNumber(existingOrder?.payments?.length || 0);

  const payment: WorkOrderPayment = {
    id: crypto.randomUUID(),
    workOrderId,
    projectId,
    paymentVoucherNo: voucherNo,
    paymentDate: payDate,
    amountPaid: paidAmt,
    paymentMode: data.paymentMode,
    referenceNumber: data.referenceNumber || '',
    paidTo: data.paidTo,
    paidBy: data.paidBy || 'Site Accounts Officer',
    notes: data.notes || '',
    createdAt: now,
  };

  // Try DB insert
  try {
    const { error: payError } = await supabase.from('work_order_payments').insert([
      {
        id: payment.id,
        work_order_id: workOrderId,
        project_id: projectId,
        payment_voucher_no: voucherNo,
        payment_date: payDate,
        amount_paid: paidAmt,
        payment_mode: payment.paymentMode,
        reference_number: payment.referenceNumber || null,
        paid_to: payment.paidTo,
        paid_by: payment.paidBy || null,
        notes: payment.notes || null,
        created_at: now,
      },
    ]);

    if (!payError && existingOrder) {
      const newPaid = existingOrder.totalPaid + paidAmt;
      const newBalance = existingOrder.totalRevisedAmount - newPaid;
      await supabase
        .from('contractor_work_orders')
        .update({
          total_paid: newPaid,
          balance_remaining: newBalance,
          updated_at: now,
        })
        .eq('id', workOrderId);
    }
  } catch (err) {
    console.warn('Supabase payment insert exception, updating local:', err);
  }

  // Update local
  let updatedOrder: ContractorWorkOrder;
  if (existingOrder) {
    const newPaid = existingOrder.totalPaid + paidAmt;
    const newBalance = existingOrder.totalRevisedAmount - newPaid;
    updatedOrder = {
      ...existingOrder,
      totalPaid: newPaid,
      balanceRemaining: newBalance,
      payments: [...(existingOrder.payments || []), payment],
      updatedAt: now,
    };
    currentOrders[orderIndex] = updatedOrder;
    saveLocalOrders(projectId, currentOrders);
  } else {
    updatedOrder = {
      id: workOrderId,
      projectId,
      workOrderNumber: 'WO-PAY',
      title: 'Work Order',
      tradeCategory: 'General Construction',
      vendorName: data.paidTo,
      startDate: payDate,
      status: 'in_progress',
      initialAmount: 0,
      extraAmount: 0,
      totalRevisedAmount: 0,
      totalPaid: paidAmt,
      balanceRemaining: -paidAmt,
      revisions: [],
      payments: [payment],
      createdAt: now,
      updatedAt: now,
    };
  }

  return { order: updatedOrder, payment };
}

/**
 * Delete a Work Order (soft delete)
 */
export async function deleteWorkOrder(workOrderId: string, projectId: string): Promise<boolean> {
  try {
    await supabase
      .from('contractor_work_orders')
      .update({ is_deleted: true })
      .eq('id', workOrderId);
  } catch (err) {
    console.warn('Supabase delete error:', err);
  }

  const current = readLocalOrders(projectId);
  const updated = current.filter((o) => o.id !== workOrderId);
  saveLocalOrders(projectId, updated);
  return true;
}
