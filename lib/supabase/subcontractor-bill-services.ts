import { supabase } from './client';
import { SubcontractorBill, SubcontractorBillItem, SubcontractorDeductionItem, SubcontractorRetentionItem } from '../construction-planning/types';

export interface DbSubcontractorBill {
  id: string;
  project_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string | null;
  vendor_id: string | null;
  vendor_name: string;
  vendor_trade: string | null;
  vendor_phone: string | null;
  vendor_gstin: string | null;
  vendor_pan: string | null;
  vendor_bank_details: string | null;
  status: string;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  total_deductions: number;
  total_retentions: number;
  net_payable: number;
  item_level_tax: boolean;
  additional_charges: number;
  additional_charges_desc: string | null;
  notes: string | null;
  items: SubcontractorBillItem[];
  deductions: SubcontractorDeductionItem[];
  retentions: SubcontractorRetentionItem[];
  attachments: any[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Map Database row to UI SubcontractorBill
export function mapDbBillToUi(db: DbSubcontractorBill): SubcontractorBill {
  return {
    id: db.id,
    projectId: db.project_id,
    billNumber: db.bill_number,
    billDate: db.bill_date,
    dueDate: db.due_date || undefined,
    vendorId: db.vendor_id || undefined,
    vendorName: db.vendor_name,
    vendorTrade: db.vendor_trade || undefined,
    vendorPhone: db.vendor_phone || undefined,
    vendorGstin: db.vendor_gstin || undefined,
    vendorPan: db.vendor_pan || undefined,
    vendorBankDetails: db.vendor_bank_details || undefined,
    status: (db.status as any) || 'pending',
    itemLevelTax: db.item_level_tax ?? false,
    itemSubtotal: Number(db.subtotal) || 0,
    preTaxDeductionTotal: Number(db.total_deductions) || 0,
    preTaxRetentionTotal: Number(db.total_retentions) || 0,
    netSubtotal: Math.max(0, (Number(db.subtotal) || 0) - (Number(db.total_deductions) || 0) - (Number(db.total_retentions) || 0)),
    gstRate: Number(db.gst_rate) || 0,
    gstAmount: Number(db.gst_amount) || 0,
    grandTotal: Number(db.net_payable) || Number(db.total_amount) || 0,
    additionalCharges: Number(db.additional_charges) || 0,
    additionalChargesDesc: db.additional_charges_desc || undefined,
    notes: db.notes || undefined,
    items: Array.isArray(db.items) ? db.items : [],
    deductions: Array.isArray(db.deductions) ? db.deductions : [],
    retentions: Array.isArray(db.retentions) ? db.retentions : [],
    attachments: Array.isArray(db.attachments) ? db.attachments : [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// Map UI SubcontractorBill to Database payload
export function mapUiBillToDb(bill: SubcontractorBill, projectId: string): Partial<DbSubcontractorBill> {
  return {
    project_id: projectId,
    bill_number: bill.billNumber,
    bill_date: bill.billDate || new Date().toISOString().split('T')[0],
    due_date: bill.dueDate || null,
    vendor_id: bill.vendorId || null,
    vendor_name: bill.vendorName,
    vendor_trade: bill.vendorTrade || null,
    vendor_phone: bill.vendorPhone || null,
    vendor_gstin: bill.vendorGstin || null,
    vendor_pan: bill.vendorPan || null,
    vendor_bank_details: bill.vendorBankDetails || null,
    status: bill.status || 'pending',
    subtotal: bill.itemSubtotal || 0,
    gst_rate: bill.gstRate || 0,
    gst_amount: bill.gstAmount || 0,
    total_amount: (bill.itemSubtotal || 0) + (bill.gstAmount || 0),
    total_deductions: bill.preTaxDeductionTotal || 0,
    total_retentions: bill.preTaxRetentionTotal || 0,
    net_payable: bill.grandTotal || 0,
    item_level_tax: bill.itemLevelTax || false,
    additional_charges: bill.additionalCharges || 0,
    additional_charges_desc: bill.additionalChargesDesc || null,
    notes: bill.notes || null,
    items: bill.items || [],
    deductions: bill.deductions || [],
    retentions: bill.retentions || [],
    attachments: (bill.attachments as any) || [],
    is_deleted: false,
  };
}

/**
 * Fetch Subcontractor Bills from Supabase for active project (or all if not filtered)
 */
export async function fetchSubcontractorBills(projectId?: string): Promise<SubcontractorBill[]> {
  try {
    let query = supabase
      .from('subcontractor_bills')
      .select('*')
      .eq('is_deleted', false)
      .order('bill_date', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching subcontractor_bills from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => mapDbBillToUi(row as DbSubcontractorBill));
  } catch (err) {
    console.error('Failed to fetch subcontractor_bills:', err);
    return [];
  }
}

/**
 * Create or save a new Subcontractor Bill to Supabase
 */
export async function createSubcontractorBill(
  bill: SubcontractorBill,
  projectId: string
): Promise<SubcontractorBill | null> {
  try {
    const payload = mapUiBillToDb(bill, projectId);
    
    // Check if ID is a valid UUID or client-generated temp ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bill.id);
    if (isUuid) {
      (payload as any).id = bill.id;
    }

    const { data, error } = await supabase
      .from('subcontractor_bills')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating subcontractor_bill in Supabase:', error);
      return null;
    }

    return mapDbBillToUi(data as DbSubcontractorBill);
  } catch (err) {
    console.error('Failed to create subcontractor_bill:', err);
    return null;
  }
}

/**
 * Update an existing Subcontractor Bill in Supabase
 */
export async function updateSubcontractorBill(
  id: string,
  bill: Partial<SubcontractorBill>,
  projectId?: string
): Promise<SubcontractorBill | null> {
  try {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (bill.billNumber !== undefined) payload.bill_number = bill.billNumber;
    if (bill.billDate !== undefined) payload.bill_date = bill.billDate;
    if (bill.dueDate !== undefined) payload.due_date = bill.dueDate || null;
    if (bill.vendorId !== undefined) payload.vendor_id = bill.vendorId || null;
    if (bill.vendorName !== undefined) payload.vendor_name = bill.vendorName;
    if (bill.vendorTrade !== undefined) payload.vendor_trade = bill.vendorTrade || null;
    if (bill.vendorPhone !== undefined) payload.vendor_phone = bill.vendorPhone || null;
    if (bill.vendorGstin !== undefined) payload.vendor_gstin = bill.vendorGstin || null;
    if (bill.vendorPan !== undefined) payload.vendor_pan = bill.vendorPan || null;
    if (bill.vendorBankDetails !== undefined) payload.vendor_bank_details = bill.vendorBankDetails || null;
    if (bill.status !== undefined) payload.status = bill.status;
    if (bill.itemSubtotal !== undefined) payload.subtotal = bill.itemSubtotal;
    if (bill.gstRate !== undefined) payload.gst_rate = bill.gstRate;
    if (bill.gstAmount !== undefined) payload.gst_amount = bill.gstAmount;
    if (bill.grandTotal !== undefined) payload.net_payable = bill.grandTotal;
    if (bill.preTaxDeductionTotal !== undefined) payload.total_deductions = bill.preTaxDeductionTotal;
    if (bill.preTaxRetentionTotal !== undefined) payload.total_retentions = bill.preTaxRetentionTotal;
    if (bill.itemLevelTax !== undefined) payload.item_level_tax = bill.itemLevelTax;
    if (bill.additionalCharges !== undefined) payload.additional_charges = bill.additionalCharges;
    if (bill.additionalChargesDesc !== undefined) payload.additional_charges_desc = bill.additionalChargesDesc || null;
    if (bill.notes !== undefined) payload.notes = bill.notes || null;
    if (bill.items !== undefined) payload.items = bill.items;
    if (bill.deductions !== undefined) payload.deductions = bill.deductions;
    if (bill.retentions !== undefined) payload.retentions = bill.retentions;
    if (bill.attachments !== undefined) payload.attachments = bill.attachments;

    const { data, error } = await supabase
      .from('subcontractor_bills')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subcontractor_bill in Supabase:', error);
      return null;
    }

    return mapDbBillToUi(data as DbSubcontractorBill);
  } catch (err) {
    console.error('Failed to update subcontractor_bill:', err);
    return null;
  }
}

/**
 * Soft delete a Subcontractor Bill
 */
export async function deleteSubcontractorBill(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subcontractor_bills')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error soft-deleting subcontractor_bill in Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete subcontractor_bill:', err);
    return false;
  }
}
