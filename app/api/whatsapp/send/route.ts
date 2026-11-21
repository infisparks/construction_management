import { NextResponse } from 'next/server';
import { cleanWhatsAppNumber } from '@/lib/supabase/whatsapp-contacts';
import { supabase } from '@/lib/supabase/client';

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

    // Process media URL or Base64
    let processedMedia = (media || '').trim();

    // 1. If it has data URI prefix (data:...;base64,), strip it
    if (processedMedia.startsWith('data:')) {
      const commaIdx = processedMedia.indexOf(',');
      if (commaIdx !== -1) {
        processedMedia = processedMedia.substring(commaIdx + 1).trim();
      } else {
        processedMedia = processedMedia.replace(/^data:[^;]+;base64,/, '').trim();
      }
    }

    // 2. If it's a blob: URL, attempt to convert or omit
    if (processedMedia.startsWith('blob:')) {
      console.warn('Received client blob URL on server WhatsApp route:', processedMedia);
      processedMedia = '';
    }

    // 3. If it's localhost or 127.0.0.1, convert to base64
    if (processedMedia.startsWith('http://localhost') || processedMedia.startsWith('http://127.0.0.1')) {
      try {
        const resp = await fetch(processedMedia);
        if (resp.ok) {
          const ab = await resp.arrayBuffer();
          processedMedia = Buffer.from(ab).toString('base64');
        }
      } catch (err) {
        console.warn('Failed to convert localhost media to base64:', err);
      }
    }

    // 4. If media is Base64, upload to Supabase Storage so Evolution API gets a genuine public HTTPS URL
    if (processedMedia && !processedMedia.startsWith('http://') && !processedMedia.startsWith('https://')) {
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(processedMedia.replace(/\s+/g, ''));
      if (isBase64 && processedMedia.length > 50) {
        try {
          const buffer = Buffer.from(processedMedia, 'base64');
          const cleanName = (fileName || 'document.pdf').replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `whatsapp_shares/${Date.now()}_${cleanName}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('project-documents')
            .upload(storagePath, buffer, {
              contentType: mimetype || 'application/pdf',
              upsert: true,
            });

          if (!uploadErr && uploadData) {
            const { data: urlData } = supabase.storage
              .from('project-documents')
              .getPublicUrl(uploadData.path);
            processedMedia = urlData.publicUrl;
          }
        } catch (e) {
          console.warn('Failed to upload base64 to Supabase storage:', e);
        }
      } else {
        // Relative storage path: resolve with Supabase public URL
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://construction.infispark.in';
        const cleanPath = processedMedia.replace(/^\/+/, '');
        if (cleanPath.startsWith('storage/')) {
          processedMedia = `${supabaseUrl}/${cleanPath}`;
        } else {
          processedMedia = `${supabaseUrl}/storage/v1/object/public/project-documents/${cleanPath}`;
        }
      }
    }

    if (processedMedia) {
      // Determine proper mediatype & mimetype if not set
      let finalMediaType = mediatype;
      let finalMimeType = mimetype;

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
        media: processedMedia,
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
        const rawErrMsg = Array.isArray(data?.response?.message)
          ? data.response.message.join(', ')
          : data?.response?.message || data?.error || 'Failed to send WhatsApp media.';

        console.error('Evolution API sendMedia error:', rawErrMsg, data);

        return NextResponse.json(
          {
            success: false,
            error: `Evolution API Media Error: ${rawErrMsg}`,
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

    if (media && !processedMedia) {
      console.warn('Could not attach media file (unresolvable source). Proceeding with detailed text delivery.');
    }

    // Otherwise send text message only when no media attachment was requested
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
