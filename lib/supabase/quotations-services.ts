import { supabase } from './client';

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface QuotationRecord {
  id: string;
  quotation_number: string;
  title: string;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  client_address?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  quotation_date: string;
  valid_until?: string | null;
  status: QuotationStatus;
  total_amount: number;
  content_html: string;
  letterhead_enabled: boolean;
  letterhead_image_url: string;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  created_by_email?: string | null;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

const STORAGE_KEY = 'construction_erp_quotations_v1';

/**
 * Default sample quotation HTML template for 1-click loading in Word-like editor
 */
export function getDefaultQuotationTemplate(params: {
  quotationNumber?: string;
  date?: string;
  clientName?: string;
  clientPhone?: string;
  projectName?: string;
  title?: string;
}): string {
  const qNo = params.quotationNumber || 'QTN-2026-001';
  const qDate = params.date || new Date().toISOString().slice(0, 10);
  const client = params.clientName || 'M/S Armee Infra & Associates';
  const phone = params.clientPhone || '+91 99583 99157';
  const site = params.projectName || 'Noori Horizon';
  const title = params.title || 'Quotation for Structural RCC, Masonry & Plastering Works';

  return `
<div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #111827;">
  <!-- Title / Ref Bar -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #653ef1; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <div style="font-size: 18px; font-weight: bold; color: #653ef1; text-transform: uppercase; letter-spacing: 0.5px;">COMMERCIAL QUOTATION</div>
      <div style="font-size: 13px; font-weight: 600; color: #374151; margin-top: 2px;">Ref: <b>${qNo}</b></div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #4b5563;">
      <div><b>Date:</b> ${qDate}</div>
      <div><b>Valid For:</b> 30 Days</div>
      <div><b>Site / Project:</b> ${site}</div>
    </div>
  </div>

  <!-- 2 Columns: Client Details & Commercial Summary -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">TO / CLIENT DETAILS:</div>
      <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${client}</div>
      <div style="font-size: 12px; color: #475569; margin-top: 2px;"><b>Contact:</b> ${phone}</div>
      <div style="font-size: 12px; color: #475569;"><b>Subject:</b> ${title}</div>
    </div>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">COMMERCIAL SUMMARY:</div>
      <div style="font-size: 12px; color: #334155;"><b>Project Location:</b> ${site}</div>
      <div style="font-size: 12px; color: #334155; margin-top: 2px;"><b>Payment Terms:</b> Progressive running bills</div>
      <div style="font-size: 13px; font-weight: bold; color: #653ef1; margin-top: 6px;">Total Quoted: Rs. 5,92,950</div>
    </div>
  </div>

  <p style="margin: 12px 0;">
    Dear Sir/Madam,<br/>
    We thank you for the opportunity to present our commercial proposal for the works at <b>${site}</b>. 
    Below are our proposed scope of works, specifications, and commercial schedule:
  </p>

  <!-- Itemized Work Scope Cards (Written one above another) -->
  <div style="margin: 16px 0;">
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-weight: bold; font-size: 13px; color: #0f172a;">1. RCC Column & Slab Casting (M25 Grade)</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Supply and pour of ready mix concrete including formwork, shuttering & vibrator curing.</div>
        </div>
        <div style="text-align: right; min-width: 140px;">
          <div style="font-size: 13px; font-weight: bold; color: #0f172a;">Rs. 3,25,000</div>
          <div style="font-size: 11px; color: #64748b;">50 Cu.M @ Rs. 6,500/Cu.M</div>
        </div>
      </div>
    </div>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-weight: bold; font-size: 13px; color: #0f172a;">2. AAC Block Masonry Work (6" thick)</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Laying AAC blocks with high-bond polymer adhesive mortar, proper alignment & joint filling.</div>
        </div>
        <div style="text-align: right; min-width: 140px;">
          <div style="font-size: 13px; font-weight: bold; color: #0f172a;">Rs. 90,000</div>
          <div style="font-size: 11px; color: #64748b;">1,200 Sq.Ft @ Rs. 75/Sq.Ft</div>
        </div>
      </div>
    </div>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-weight: bold; font-size: 13px; color: #0f172a;">3. Internal Sand Face Plastering (12mm)</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Smooth trowel finished cement mortar (1:4) including line, level & curing.</div>
        </div>
        <div style="text-align: right; min-width: 140px;">
          <div style="font-size: 13px; font-weight: bold; color: #0f172a;">Rs. 87,500</div>
          <div style="font-size: 11px; color: #64748b;">2,500 Sq.Ft @ Rs. 35/Sq.Ft</div>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: bold;">
      <div>GRAND TOTAL (INCL. TAXES):</div>
      <div style="color: #653ef1; font-size: 15px;">Rs. 5,92,950</div>
    </div>
  </div>

  <!-- Terms & Conditions -->
  <div style="margin: 16px 0; font-size: 12px;">
    <div style="font-weight: bold; color: #334155; margin-bottom: 6px; text-transform: uppercase; font-size: 11px;">Commercial Terms & Conditions:</div>
    <ul style="margin: 0; padding-left: 18px; color: #475569; line-height: 1.6;">
      <li><b>Payment Schedule:</b> 40% Mobilization Advance, 50% progressive running bills, 10% on completion.</li>
      <li><b>Water & Power:</b> To be provided by client free of cost at the site work location.</li>
      <li><b>Taxes:</b> GST 18% as applicable by statutory regulations.</li>
      <li><b>Validity:</b> Rates remain valid for 30 calendar days from the quotation date.</li>
    </ul>
  </div>

  <!-- Signatures 2-Column Side-by-Side -->
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
    <div style="font-size: 11px; color: #64748b;">
      <div>Client Acceptance / Sign & Stamp:</div>
      <div style="margin-top: 32px; font-weight: 600; border-top: 1px solid #94a3b8; width: 170px; padding-top: 4px;">Authorized Signatory</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #334155;">
      <div>For <b>Armee Enterprises Construction ERP</b></div>
      <div style="margin-top: 32px; font-weight: bold; color: #653ef1; border-top: 1px solid #653ef1; width: 170px; padding-top: 4px;">Managing Director</div>
    </div>
  </div>
</div>
  `.trim();
}

/**
 * Read cached local storage quotations
 */
function getLocalQuotations(): QuotationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save cached local storage quotations
 */
function setLocalQuotations(list: QuotationRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('LocalStorage quota exceeded for quotations:', err);
  }
}

/**
 * Generate next quotation number (e.g. QTN-2026-001)
 */
export function generateNextQuotationNumber(existingQuotes: QuotationRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `QTN-${year}-`;
  let maxSeq = 0;

  existingQuotes.forEach((q) => {
    if (q.quotation_number && q.quotation_number.startsWith(prefix)) {
      const numPart = parseInt(q.quotation_number.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

/**
 * Fetch all quotations with site filter, search, and local cache sync
 */
export async function fetchQuotations(projectId?: string, search?: string): Promise<QuotationRecord[]> {
  let localList = getLocalQuotations();

  try {
    let query = supabase
      .from('quotations')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (!error && data) {
      const mergedMap = new Map<string, QuotationRecord>();
      // Put local list first
      localList.forEach((q) => mergedMap.set(q.id, q));
      // Overwrite with fresh remote data
      data.forEach((q: any) => mergedMap.set(q.id, q as QuotationRecord));

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLocalQuotations(mergedList);
      localList = mergedList;
    }
  } catch (err) {
    console.warn('Supabase fetchQuotations fallback to localStorage:', err);
  }

  // Filter local list by site if applicable
  let filtered = localList.filter((q) => !q.is_deleted);
  if (projectId && projectId !== 'all') {
    filtered = filtered.filter((q) => q.project_id === projectId);
  }

  // Search filter
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      return (
        item.quotation_number?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.client_name?.toLowerCase().includes(q) ||
        item.client_phone?.includes(q) ||
        item.project_name?.toLowerCase().includes(q) ||
        item.created_by_email?.toLowerCase().includes(q)
      );
    });
  }

  return filtered;
}

/**
 * Create a new quotation record
 */
export async function createQuotation(data: Partial<QuotationRecord>): Promise<QuotationRecord> {
  const localList = getLocalQuotations();
  const nextNumber = data.quotation_number || generateNextQuotationNumber(localList);
  const now = new Date().toISOString();

  const newRecord: QuotationRecord = {
    id: data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `qtn_${Date.now()}`),
    quotation_number: nextNumber,
    title: data.title || 'Quotation',
    client_name: data.client_name || null,
    client_phone: data.client_phone || null,
    client_email: data.client_email || null,
    client_address: data.client_address || null,
    project_id: data.project_id || null,
    project_name: data.project_name || null,
    quotation_date: data.quotation_date || now.slice(0, 10),
    valid_until: data.valid_until || null,
    status: data.status || 'draft',
    total_amount: Number(data.total_amount) || 0,
    content_html: data.content_html || getDefaultQuotationTemplate({
      quotationNumber: nextNumber,
      date: data.quotation_date || now.slice(0, 10),
      clientName: data.client_name || undefined,
      clientPhone: data.client_phone || undefined,
      projectName: data.project_name || undefined,
      title: data.title || undefined,
    }),
    letterhead_enabled: data.letterhead_enabled ?? Boolean(data.letterhead_image_url),
    letterhead_image_url: data.letterhead_image_url || '',
    margin_top: data.margin_top ?? (data.letterhead_image_url ? 185 : 40),
    margin_bottom: data.margin_bottom ?? 110,
    margin_left: data.margin_left ?? 48,
    margin_right: data.margin_right ?? 48,
    created_by_email: data.created_by_email || 'admin@gmail.com',
    created_by_user_id: data.created_by_user_id || null,
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };

  // 1. Immediately save to localStorage
  const updatedLocal = [newRecord, ...localList.filter((q) => q.id !== newRecord.id)];
  setLocalQuotations(updatedLocal);

  // 2. Try inserting into Supabase
  try {
    const { data: dbData, error } = await supabase
      .from('quotations')
      .insert([newRecord])
      .select()
      .single();

    if (!error && dbData) {
      const finalRec = dbData as QuotationRecord;
      const synced = updatedLocal.map((q) => (q.id === newRecord.id ? finalRec : q));
      setLocalQuotations(synced);
      return finalRec;
    }
  } catch (err) {
    console.warn('Supabase insert failed, retained locally:', err);
  }

  return newRecord;
}

/**
 * Update an existing quotation
 */
export async function updateQuotation(id: string, updates: Partial<QuotationRecord>): Promise<QuotationRecord | null> {
  const localList = getLocalQuotations();
  const existing = localList.find((q) => q.id === id);
  const now = new Date().toISOString();

  const updatedRecord: QuotationRecord = {
    ...(existing || ({} as QuotationRecord)),
    ...updates,
    id,
    updated_at: now,
  };

  // 1. Update in local storage
  const updatedLocal = localList.map((q) => (q.id === id ? updatedRecord : q));
  setLocalQuotations(updatedLocal);

  // 2. Update in Supabase
  try {
    const { data: dbData, error } = await supabase
      .from('quotations')
      .update({
        ...updates,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && dbData) {
      return dbData as QuotationRecord;
    }
  } catch (err) {
    console.warn('Supabase update failed, persisted locally:', err);
  }

  return updatedRecord;
}

/**
 * Soft delete a quotation
 */
export async function deleteQuotation(id: string): Promise<boolean> {
  const localList = getLocalQuotations();
  const updatedLocal = localList.map((q) => (q.id === id ? { ...q, is_deleted: true } : q));
  setLocalQuotations(updatedLocal);

  try {
    await supabase.from('quotations').update({ is_deleted: true }).eq('id', id);
  } catch (err) {
    console.warn('Supabase delete failed:', err);
  }

  return true;
}

/**
 * Duplicate an existing quotation
 */
export async function duplicateQuotation(id: string, userEmail?: string): Promise<QuotationRecord | null> {
  const localList = getLocalQuotations();
  const source = localList.find((q) => q.id === id);
  if (!source) return null;

  const nextNumber = generateNextQuotationNumber(localList);
  const title = `${source.title} (Copy)`;

  return await createQuotation({
    ...source,
    id: undefined,
    quotation_number: nextNumber,
    title,
    status: 'draft',
    created_by_email: userEmail || source.created_by_email,
  });
}
