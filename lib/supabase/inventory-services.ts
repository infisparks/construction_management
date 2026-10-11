import { supabase } from './client';
import { ProfileProduct } from './profile-services';

export type InventoryTxType =
  | 'in'
  | 'out'
  | 'defect'
  | 'return'
  | 'check_in'
  | 'check_out'
  | 'damage';

export interface InventoryTransactionRecord {
  id: string;
  voucher_no: string;
  type: InventoryTxType;
  product_id?: string;
  product_name: string;
  product_code?: string;
  category?: string;
  quantity: number;
  unit: string;
  stock_after?: number;
  unit_rate?: number;
  total_amount?: number;
  vendor_id?: string;
  vendor_name?: string;
  reference_no?: string;
  location?: string;
  reason?: string;
  person_name?: string;
  notes?: string;
  transaction_date: string;
  transaction_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryQuickSummary {
  total_products: number;
  total_current_stock: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_in_count: number;
  total_out_count: number;
  total_defect_count: number;
  total_return_count: number;
  total_in_quantity: number;
  total_out_quantity: number;
  total_defect_quantity: number;
  total_return_quantity: number;
}

/**
 * Fetch all inventory transactions using B-Tree index (created_at DESC).
 * Returns latest transactions first with fast indexed load.
 */
export async function fetchInventoryTransactions(options?: {
  type?: string;
  productId?: string;
  limit?: number;
}): Promise<InventoryTransactionRecord[]> {
  try {
    let query = supabase
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.type && options.type !== 'all') {
      const t = options.type.toLowerCase();
      if (t === 'in' || t === 'check_in') {
        query = query.in('type', ['in', 'check_in']);
      } else if (t === 'out' || t === 'check_out') {
        query = query.in('type', ['out', 'check_out']);
      } else if (t === 'defect' || t === 'damage') {
        query = query.in('type', ['defect', 'damage']);
      } else if (t === 'return') {
        query = query.in('type', ['return', 'vendor_return']);
      } else {
        query = query.eq('type', options.type);
      }
    }

    if (options?.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching inventory transactions:', error);
      return [];
    }

    return (data || []) as InventoryTransactionRecord[];
  } catch (err) {
    console.error('Failed to fetch inventory transactions:', err);
    return [];
  }
}

/**
 * Insert a unified transaction (in, out, defect, return) and update current stock
 * directly using indexed primary key on profile_product (zero custom database functions).
 */
export async function createInventoryTransaction(
  tx: Omit<InventoryTransactionRecord, 'id' | 'created_at' | 'updated_at' | 'stock_after'>
): Promise<{ data: InventoryTransactionRecord | null; error: any }> {
  try {
    const isAddition = tx.type === 'in' || tx.type === 'check_in';
    const delta = isAddition ? Number(tx.quantity) : -Number(tx.quantity);

    let calculatedStockAfter = 0;

    // Fetch existing product stock and update directly using indexed PK
    if (tx.product_id) {
      const { data: prod } = await supabase
        .from('profile_product')
        .select('current_stock')
        .eq('id', tx.product_id)
        .single();

      const currentStock = Number(prod?.current_stock ?? 0);
      calculatedStockAfter = Math.max(0, currentStock + delta);

      await supabase
        .from('profile_product')
        .update({
          current_stock: calculatedStockAfter,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.product_id);
    }

    const { data, error } = await supabase
      .from('inventory_transactions')
      .insert([
        {
          voucher_no: tx.voucher_no,
          type: tx.type,
          product_id: tx.product_id || null,
          product_name: tx.product_name,
          product_code: tx.product_code || null,
          category: tx.category || null,
          quantity: tx.quantity,
          unit: tx.unit,
          stock_after: calculatedStockAfter,
          unit_rate: tx.unit_rate ?? null,
          total_amount: tx.total_amount ?? null,
          vendor_id: tx.vendor_id || null,
          vendor_name: tx.vendor_name || null,
          reference_no: tx.reference_no || null,
          location: tx.location || null,
          reason: tx.reason || null,
          person_name: tx.person_name || null,
          notes: tx.notes || null,
          transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
          transaction_time:
            tx.transaction_time ||
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ])
      .select()
      .single();

    return { data: data as InventoryTransactionRecord, error };
  } catch (err) {
    console.error('Failed to create inventory transaction:', err);
    return { data: null, error: err };
  }
}

/**
 * Quick load low stock alerts using index idx_profile_prod_alert.
 * Instantly filters products where current_stock <= minimum_alert_stock.
 */
export async function fetchQuickStockAlerts(): Promise<ProfileProduct[]> {
  try {
    const { data, error } = await supabase
      .from('profile_product')
      .select('*')
      .eq('is_deleted', false)
      .gt('minimum_alert_stock', 0)
      .order('current_stock', { ascending: true });

    if (error) {
      console.error('Error fetching quick stock alerts:', error);
      return [];
    }

    return (data || []).filter(
      (p: ProfileProduct) => Number(p.current_stock ?? 0) <= Number(p.minimum_alert_stock ?? 0)
    ) as ProfileProduct[];
  } catch (err) {
    console.error('Failed to fetch quick stock alerts:', err);
    return [];
  }
}

/**
 * Quick load inventory KPI summary using indexed table queries (zero SQL functions/RPCs).
 * - profile_product uses index idx_profile_prod_alert
 * - inventory_transactions uses index idx_inv_tx_type_qty
 */
export async function fetchQuickStockSummary(): Promise<InventoryQuickSummary | null> {
  try {
    // 1. Indexed query on profile_product
    const { data: products, error: prodErr } = await supabase
      .from('profile_product')
      .select('id, current_stock, minimum_alert_stock')
      .eq('is_deleted', false);

    if (prodErr) {
      console.error('Error querying profile_product for stock summary:', prodErr);
      return null;
    }

    const prodList = products || [];
    const totalProducts = prodList.length;
    let totalCurrentStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of prodList) {
      const stock = Number(p.current_stock ?? 0);
      const alert = Number(p.minimum_alert_stock ?? 0);
      totalCurrentStock += stock;
      if (alert > 0 && stock <= alert) {
        lowStockCount++;
      }
      if (stock <= 0) {
        outOfStockCount++;
      }
    }

    // 2. Indexed query on inventory_transactions
    const { data: txs, error: txErr } = await supabase
      .from('inventory_transactions')
      .select('type, quantity');

    if (txErr) {
      console.error('Error querying inventory_transactions for stock summary:', txErr);
    }

    const txList = txs || [];
    let totalInCount = 0;
    let totalOutCount = 0;
    let totalDefectCount = 0;
    let totalReturnCount = 0;
    let totalInQty = 0;
    let totalOutQty = 0;
    let totalDefectQty = 0;
    let totalReturnQty = 0;

    for (const t of txList) {
      const type = (t.type || '').toLowerCase();
      const qty = Number(t.quantity ?? 0);
      if (type === 'in' || type === 'check_in') {
        totalInCount++;
        totalInQty += qty;
      } else if (type === 'out' || type === 'check_out') {
        totalOutCount++;
        totalOutQty += qty;
      } else if (type === 'defect' || type === 'damage') {
        totalDefectCount++;
        totalDefectQty += qty;
      } else if (type === 'return' || type === 'vendor_return') {
        totalReturnCount++;
        totalReturnQty += qty;
      }
    }

    return {
      total_products: totalProducts,
      total_current_stock: totalCurrentStock,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      total_in_count: totalInCount,
      total_out_count: totalOutCount,
      total_defect_count: totalDefectCount,
      total_return_count: totalReturnCount,
      total_in_quantity: totalInQty,
      total_out_quantity: totalOutQty,
      total_defect_quantity: totalDefectQty,
      total_return_quantity: totalReturnQty,
    };
  } catch (err) {
    console.error('Failed to calculate quick stock summary from indexed tables:', err);
    return null;
  }
}

/**
 * Quickly calculate total stock for a specific product using composite index (product_id, type, quantity)
 */
export async function fetchProductTotalStock(productId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('type, quantity')
      .eq('product_id', productId);

    if (error || !data) return 0;

    let balance = 0;
    for (const row of data) {
      const t = (row.type || '').toLowerCase();
      const qty = Number(row.quantity) || 0;
      if (t === 'in' || t === 'check_in') {
        balance += qty;
      } else {
        balance = Math.max(0, balance - qty);
      }
    }
    return balance;
  } catch (err) {
    console.error('Failed to calculate product stock:', err);
    return 0;
  }
}

/**
 * Mapping helper from DB row to application InventoryTransaction model.
 */
export function mapDbToInventoryTransaction(row: InventoryTransactionRecord) {
  const normType =
    row.type === 'in' || row.type === 'check_in'
      ? 'check_in'
      : row.type === 'out' || row.type === 'check_out'
      ? 'check_out'
      : row.type === 'defect' || row.type === 'damage'
      ? 'damage'
      : 'return';

  return {
    id: row.id,
    voucherNumber: row.voucher_no,
    type: normType as 'check_in' | 'check_out' | 'return' | 'damage',
    materialId: row.product_id || '',
    materialName: row.product_name,
    category: row.category || 'General',
    quantity: Number(row.quantity),
    unit: row.unit,
    unitRate: row.unit_rate !== null && row.unit_rate !== undefined ? Number(row.unit_rate) : undefined,
    totalAmount: row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : undefined,
    date: row.transaction_date,
    time: row.transaction_time || '',
    runningStockBalance: Number(row.stock_after ?? 0),
    returnReason: normType === 'return' ? row.reason : undefined,
    damageReason: normType === 'damage' ? row.reason : undefined,
    supplierName: row.vendor_name,
    supplierId: row.vendor_id,
    challanNumber: row.reference_no,
    storageLocation: row.location,
    receivedOrIssuedBy: row.person_name || 'Storekeeper',
    remarks: row.notes,
  };
}
