import { supabase } from './client';

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string | null;
  is_favorite: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Standardize phone number for WhatsApp Evolution API
 * Evolution API requires numbers in international format without symbols, e.g. 919958399157
 */
export function cleanWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If user entered 0 at start for 11 digits (e.g. 09958399157), remove 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If 10 digits (standard Indian mobile number without country code), prepend 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Format phone number for user-friendly display (e.g. +91 99583 99157)
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = cleanWhatsAppNumber(phone);
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.length > 4) {
    return `+${cleaned}`;
  }
  return phone;
}

/**
 * Fetch all WhatsApp contacts from Supabase
 */
export async function fetchWhatsAppContacts(): Promise<WhatsAppContact[]> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error fetching whatsapp_contacts:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching whatsapp_contacts:', err);
    return [];
  }
}

/**
 * Create a new WhatsApp contact in Supabase
 */
export async function createWhatsAppContact(contact: {
  name: string;
  phone: string;
  role?: string;
  email?: string;
  is_favorite?: boolean;
}): Promise<WhatsAppContact | null> {
  const sanitizedPhone = cleanWhatsAppNumber(contact.phone);
  if (!sanitizedPhone) {
    throw new Error('Valid phone number is required');
  }

  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .insert([
      {
        name: contact.name.trim(),
        phone: sanitizedPhone,
        role: contact.role?.trim() || 'Other',
        email: contact.email?.trim() || null,
        is_favorite: Boolean(contact.is_favorite),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error inserting whatsapp_contact:', error);
    throw error;
  }
  return data;
}

/**
 * Update an existing WhatsApp contact
 */
export async function updateWhatsAppContact(
  id: string,
  updates: Partial<WhatsAppContact>
): Promise<WhatsAppContact | null> {
  const payload: any = { ...updates, updated_at: new Date().toISOString() };
  if (payload.phone) {
    payload.phone = cleanWhatsAppNumber(payload.phone);
  }

  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating whatsapp_contact:', error);
    throw error;
  }
  return data;
}

/**
 * Delete a WhatsApp contact
 */
export async function deleteWhatsAppContact(id: string): Promise<boolean> {
  const { error } = await supabase.from('whatsapp_contacts').delete().eq('id', id);
  if (error) {
    console.error('Error deleting whatsapp_contact:', error);
    return false;
  }
  return true;
}
