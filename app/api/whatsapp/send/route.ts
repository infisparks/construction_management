import { NextResponse } from 'next/server';
import { cleanWhatsAppNumber } from '@/lib/supabase/whatsapp-contacts';

const EVOLUTION_API_BASE = 'https://evo.infispark.in';
const EVOLUTION_INSTANCE = 'mudassir';
const EVOLUTION_API_KEY = 'vR39h6avY69g7kAU3YQbS6V6XEvudson';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      number,
      mediatype = 'document',
      mimetype = 'application/pdf',
      caption = '',
      media,
      fileName = 'document.pdf',
      text,
    } = body;

    const sanitizedNumber = cleanWhatsAppNumber(number);
    if (!sanitizedNumber) {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number is required.' },
        { status: 400 }
      );
    }

    // If media URL is provided, call sendMedia
    if (media) {
      // Determine proper mediatype & mimetype if not set
      let finalMediaType = mediatype;
      let finalMimeType = mimetype;

      const lowerMedia = (media || '').toLowerCase();
      const lowerFile = (fileName || '').toLowerCase();

      if (lowerFile.endsWith('.png')) {
        finalMediaType = 'image';
        finalMimeType = 'image/png';
      } else if (lowerFile.endsWith('.jpg') || lowerFile.endsWith('.jpeg')) {
        finalMediaType = 'image';
        finalMimeType = 'image/jpeg';
      } else if (lowerFile.endsWith('.webp')) {
        finalMediaType = 'image';
        finalMimeType = 'image/webp';
      } else if (lowerFile.endsWith('.mp4')) {
        finalMediaType = 'video';
        finalMimeType = 'video/mp4';
      } else if (lowerFile.endsWith('.pdf')) {
        finalMediaType = 'document';
        finalMimeType = 'application/pdf';
      } else if (lowerFile.endsWith('.xlsx') || lowerFile.endsWith('.xls')) {
        finalMediaType = 'document';
        finalMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (lowerFile.endsWith('.dwg') || lowerFile.endsWith('.dxf')) {
        finalMediaType = 'document';
        finalMimeType = 'application/acad';
      }

      const payload = {
        number: sanitizedNumber,
        mediatype: finalMediaType,
        mimetype: finalMimeType,
        caption: caption || '',
        media: media,
        fileName: fileName || 'document.pdf',
      };

      const response = await fetch(
        `${EVOLUTION_API_BASE}/message/sendMedia/${EVOLUTION_INSTANCE}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('Evolution API sendMedia error:', data);
        return NextResponse.json(
          {
            success: false,
            error: data?.response?.message || data?.error || 'Failed to send WhatsApp media.',
            details: data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'WhatsApp media sent successfully!',
        data,
      });
    }

    // Otherwise send text message
    if (text || caption) {
      const payload = {
        number: sanitizedNumber,
        text: text || caption,
      };

      const response = await fetch(
        `${EVOLUTION_API_BASE}/message/sendText/${EVOLUTION_INSTANCE}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error('Evolution API sendText error:', data);
        return NextResponse.json(
          {
            success: false,
            error: data?.response?.message || data?.error || 'Failed to send WhatsApp message.',
            details: data,
          },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'WhatsApp text message sent successfully!',
        data,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Neither media URL nor text was provided.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('WhatsApp API route handler error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error while sending WhatsApp message' },
      { status: 500 }
    );
  }
}
