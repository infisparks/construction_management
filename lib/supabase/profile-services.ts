import { supabase } from './client';

export interface ProfileProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  brand?: string;
  hsn_code?: string;
  storage_location?: string;
  minimum_alert_stock?: number;
  current_stock?: number;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileVendor {
  id: string;
  name: string;
  type: 'vendor' | 'contractor' | 'client' | 'other';
  phone?: string;
  email?: string;
  contact_person?: string;
  trade?: string;
  gstin?: string;
  pan?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_details?: string;
  address?: string;
  city?: string;
  location?: string;
  notes?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// Product Profiles Service (profile_product)
// ==========================================

export async function fetchProfileProducts(): Promise<ProfileProduct[]> {
  try {
    const { data, error } = await supabase
      .from('profile_product')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profile_product from Supabase:', error);
      return [];
    }
    return (data || []) as ProfileProduct[];
  } catch (err) {
    console.error('Failed to fetch profile_product:', err);
    return [];
  }
}

export async function createProfileProduct(
  product: Omit<ProfileProduct, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>
): Promise<{ data: ProfileProduct | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profile_product')
      .insert([
        {
          code: product.code,
          name: product.name,
          category: product.category,
          unit: product.unit,
          description: product.description || null,
          brand: product.brand || null,
          hsn_code: product.hsn_code || null,
          storage_location: product.storage_location || null,
          minimum_alert_stock: product.minimum_alert_stock ?? 0,
          is_active: product.is_active ?? true,
          is_deleted: false,
        },
      ])
      .select()
      .single();

    return { data: data as ProfileProduct, error };
  } catch (err) {
    console.error('Failed to create profile_product:', err);
    return { data: null, error: err };
  }
}

export async function updateProfileProduct(
  id: string,
  updates: Partial<Omit<ProfileProduct, 'id' | 'created_at'>>
): Promise<{ data: ProfileProduct | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profile_product')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return { data: data as ProfileProduct, error };
  } catch (err) {
    console.error('Failed to update profile_product:', err);
    return { data: null, error: err };
  }
}

export async function deleteProfileProduct(id: string): Promise<{ error: any }> {
  try {
    // Soft delete
    const { error } = await supabase
      .from('profile_product')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    return { error };
  } catch (err) {
    console.error('Failed to delete profile_product:', err);
    return { error: err };
  }
}

// ==========================================
// Vendor Profiles Service (profile_vendor)
// ==========================================

export async function fetchProfileVendors(): Promise<ProfileVendor[]> {
  try {
    const { data, error } = await supabase
      .from('profile_vendor')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profile_vendor from Supabase:', error);
      return [];
    }
    return (data || []) as ProfileVendor[];
  } catch (err) {
    console.error('Failed to fetch profile_vendor:', err);
    return [];
  }
}

export async function createProfileVendor(
  vendor: Omit<ProfileVendor, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>
): Promise<{ data: ProfileVendor | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profile_vendor')
      .insert([
        {
          name: vendor.name,
          type: vendor.type || 'vendor',
          phone: vendor.phone || null,
          email: vendor.email || null,
          contact_person: vendor.contact_person || null,
          trade: vendor.trade || null,
          gstin: vendor.gstin || null,
          pan: vendor.pan || null,
          bank_name: vendor.bank_name || null,
          bank_account: vendor.bank_account || null,
          bank_ifsc: vendor.bank_ifsc || null,
          bank_details: vendor.bank_details || (
            vendor.bank_name || vendor.bank_account || vendor.bank_ifsc
              ? `${vendor.bank_name || 'Bank'} A/C: ${vendor.bank_account || '—'} / IFSC: ${vendor.bank_ifsc || '—'}`
              : null
          ),
          address: vendor.address || null,
          city: vendor.city || null,
          location: vendor.location || null,
          notes: vendor.notes || null,
          is_active: vendor.is_active ?? true,
          is_deleted: false,
        },
      ])
      .select()
      .single();

    return { data: data as ProfileVendor, error };
  } catch (err) {
    console.error('Failed to create profile_vendor:', err);
    return { data: null, error: err };
  }
}

export async function updateProfileVendor(
  id: string,
  updates: Partial<Omit<ProfileVendor, 'id' | 'created_at'>>
): Promise<{ data: ProfileVendor | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profile_vendor')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return { data: data as ProfileVendor, error };
  } catch (err) {
    console.error('Failed to update profile_vendor:', err);
    return { data: null, error: err };
  }
}

export async function deleteProfileVendor(id: string): Promise<{ error: any }> {
  try {
    // Soft delete
    const { error } = await supabase
      .from('profile_vendor')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    return { error };
  } catch (err) {
    console.error('Failed to delete profile_vendor:', err);
    return { error: err };
  }
}
