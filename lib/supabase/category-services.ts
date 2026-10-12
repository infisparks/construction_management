import { supabase } from './client';

export const DEFAULT_DOCUMENT_CATEGORIES: string[] = [
  'Site photographs and reports',
  'Architectural drawings',
  'Structural and RCC drawings',
  'MEP drawings',
  'BOQs and cost estimates',
  'Contracts and agreements',
  'Bills, invoices and payment records',
  'Quotations and purchase orders',
  'Legal and statutory documents',
  'Meeting minutes and correspondence',
  'Quality, safety and handover documents',
  'Project information',
];

/**
 * Fetch dropdown category values from Supabase `category` table.
 * If the category does not exist, optionally seeds it with `defaultFallback`.
 */
export async function fetchDropdownCategory(
  categoryName: string,
  defaultFallback: string[] = []
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('category')
      .select('name, value')
      .eq('name', categoryName)
      .maybeSingle();

    if (error) {
      console.warn(`[category-services] Error fetching category "${categoryName}":`, error.message);
      return defaultFallback;
    }

    if (data && Array.isArray(data.value) && data.value.length > 0) {
      return data.value as string[];
    }

    // If row doesn't exist or is empty, seed it with defaultFallback
    if (defaultFallback.length > 0) {
      const { error: insertError } = await supabase
        .from('category')
        .upsert({ name: categoryName, value: defaultFallback });

      if (insertError) {
        console.warn(`[category-services] Could not seed category "${categoryName}":`, insertError.message);
      }
      return defaultFallback;
    }

    return [];
  } catch (err) {
    console.error(`[category-services] Exception fetching category "${categoryName}":`, err);
    return defaultFallback;
  }
}

/**
 * Add a custom category entry to the Supabase `category` table JSONB value.
 */
export async function addCustomCategory(
  categoryName: string,
  newLabel: string,
  currentList: string[] = []
): Promise<{ success: boolean; categories: string[]; error?: string }> {
  const cleanLabel = newLabel.trim();
  if (!cleanLabel) {
    return { success: false, categories: currentList, error: 'Category name cannot be empty.' };
  }

  // Check for duplicate (case-insensitive)
  const existing = currentList.find(
    (item) => item.toLowerCase() === cleanLabel.toLowerCase()
  );
  if (existing) {
    return { success: true, categories: currentList };
  }

  const updatedCategories = [...currentList, cleanLabel];

  try {
    const { error } = await supabase
      .from('category')
      .upsert({
        name: categoryName,
        value: updatedCategories,
      });

    if (error) {
      console.error(`[category-services] Error upserting category "${categoryName}":`, error.message);
      return { success: false, categories: currentList, error: error.message };
    }

    return { success: true, categories: updatedCategories };
  } catch (err: any) {
    console.error(`[category-services] Exception adding custom category "${categoryName}":`, err);
    return { success: false, categories: currentList, error: err?.message || 'Failed to save custom category.' };
  }
}

export interface BillItemTemplate {
  name: string;
  rate: number;
  unit: string;
}

/**
 * Fetch saved subcontractor bill work items from the category table
 */
export async function fetchBillItemCatalog(): Promise<BillItemTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('category')
      .select('name, value')
      .eq('name', 'subcontractor_bill_items')
      .maybeSingle();

    if (error || !data) return [];
    if (Array.isArray(data.value)) {
      return data.value as BillItemTemplate[];
    }
    return [];
  } catch (err) {
    console.error('[category-services] Failed to fetchBillItemCatalog:', err);
    return [];
  }
}

/**
 * Save or update a subcontractor bill item in the category table with name, rate, and unit
 */
export async function saveBillItemToCatalog(
  item: { name: string; rate?: number; unit?: string }
): Promise<BillItemTemplate[]> {
  const cleanName = item.name.trim();
  if (!cleanName) return [];

  try {
    const current = await fetchBillItemCatalog();
    const existingIndex = current.findIndex(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );

    const updated = [...current];
    const newItem: BillItemTemplate = {
      name: cleanName,
      rate: Number(item.rate) || 0,
      unit: (item.unit || 'nos').trim(),
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newItem;
    } else {
      updated.push(newItem);
    }

    await supabase.from('category').upsert({
      name: 'subcontractor_bill_items',
      value: updated,
    });

    return updated;
  } catch (err) {
    console.error('[category-services] Failed to saveBillItemToCatalog:', err);
    return [];
  }
}
