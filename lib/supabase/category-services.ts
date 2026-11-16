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

const getLocalCategories = (categoryName: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`infibuild_category_${categoryName}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return [];
};

const setLocalCategories = (categoryName: string, list: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`infibuild_category_${categoryName}`, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
};

/**
 * Fetch dropdown category values from Supabase `category` table,
 * with resilient localStorage caching & fallback.
 */
export async function fetchDropdownCategory(
  categoryName: string,
  defaultFallback: string[] = []
): Promise<string[]> {
  const localList = getLocalCategories(categoryName);

  try {
    const { data, error } = await supabase
      .from('category')
      .select('name, value')
      .eq('name', categoryName)
      .maybeSingle();

    if (error) {
      console.warn(`[category-services] Error fetching category "${categoryName}":`, error.message);
      if (localList.length > 0) {
        return localList;
      }
      setLocalCategories(categoryName, defaultFallback);
      return defaultFallback;
    }

    if (data && Array.isArray(data.value) && data.value.length > 0) {
      const remoteList = data.value as string[];
      // Merge any local additions if present
      const combined = Array.from(new Set([...remoteList, ...localList]));
      setLocalCategories(categoryName, combined);
      return combined;
    }

    // If row doesn't exist or is empty in remote
    if (localList.length > 0) {
      return localList;
    }

    if (defaultFallback.length > 0) {
      setLocalCategories(categoryName, defaultFallback);
      // Attempt seeding
      (async () => {
        try {
          await supabase.from('category').upsert({ name: categoryName, value: defaultFallback });
        } catch {
          // ignore
        }
      })();

      return defaultFallback;
    }

    return [];
  } catch (err) {
    console.error(`[category-services] Exception fetching category "${categoryName}":`, err);
    if (localList.length > 0) {
      return localList;
    }
    return defaultFallback;
  }
}

/**
 * Add a custom category entry to Supabase and localStorage.
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
  setLocalCategories(categoryName, updatedCategories);

  try {
    const { error } = await supabase
      .from('category')
      .upsert({
        name: categoryName,
        value: updatedCategories,
      });

    if (error) {
      console.warn(`[category-services] Supabase upsert note for "${categoryName}":`, error.message);
    }
  } catch (err: any) {
    console.warn(`[category-services] Exception syncing to Supabase:`, err);
  }

  return { success: true, categories: updatedCategories };
}

/**
 * Delete a category entry from the category list and persist to Supabase & localStorage.
 */
export async function deleteCustomCategory(
  categoryName: string,
  categoryToDelete: string,
  currentList: string[] = []
): Promise<{ success: boolean; categories: string[]; error?: string }> {
  const cleanTarget = categoryToDelete.trim().toLowerCase();
  if (!cleanTarget) {
    return { success: false, categories: currentList, error: 'Category name cannot be empty.' };
  }

  const updatedCategories = currentList.filter(
    (item) => item.trim().toLowerCase() !== cleanTarget
  );

  setLocalCategories(categoryName, updatedCategories);

  try {
    const { error } = await supabase
      .from('category')
      .upsert({
        name: categoryName,
        value: updatedCategories,
      });

    if (error) {
      console.warn(`[category-services] Supabase delete sync note:`, error.message);
    }
  } catch (err: any) {
    console.warn(`[category-services] Exception syncing deletion to Supabase:`, err);
  }

  return { success: true, categories: updatedCategories };
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
