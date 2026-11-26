/**
 * Client-side image compression utility before uploading to Supabase Storage.
 * - Compresses JPEG, PNG, WebP, BMP (and browser-decodable HEIC/HEIF) to max 1600px JPEG (quality 0.78).
 * - Preserves PDFs and non-image files untouched.
 * - Falls back safely to the original file if compression isn't smaller or decoding isn't supported.
 */

const IMAGE_EXT_REGEX = /\.(jpe?g|png|webp|bmp|heic|heif)$/i;

export function isCompressibleImage(file: File): boolean {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return false;
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return false;
  }
  return file.type.startsWith('image/') || IMAGE_EXT_REGEX.test(file.name);
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

export async function compressFileBeforeUpload(
  file: File,
  options: { maxDimension?: number; quality?: number; minSizeBytes?: number } = {}
): Promise<File> {
  if (typeof window === 'undefined' || !isCompressibleImage(file)) {
    return file;
  }

  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.78;
  const minSizeBytes = options.minSizeBytes ?? 120 * 1024; // Skip tiny files < 120 KB

  if (file.size <= minSizeBytes) {
    return file;
  }

  try {
    let source: ImageBitmap | HTMLImageElement;
    let width = 0;
    let height = 0;

    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
      } catch {
        const img = await loadImageElement(file);
        source = img;
        width = img.naturalWidth || img.width;
        height = img.naturalHeight || img.height;
      }
    } else {
      const img = await loadImageElement(file);
      source = img;
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
    }

    if (!width || !height) {
      return file;
    }

    let targetWidth = width;
    let targetHeight = height;
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      targetWidth = Math.round(width * ratio);
      targetHeight = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }

    // Fill white background so transparent PNGs convert cleanly to JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    if ('close' in source && typeof source.close === 'function') {
      source.close();
    }

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const compressedName = `${baseName}.jpg`;

    return new File([blob], compressedName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
