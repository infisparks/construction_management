'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  Paperclip,
  CheckCircle2,
  Camera,
  Smartphone
} from 'lucide-react';

export interface BillUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export const BillDocumentUploader: React.FC<BillUploaderProps> = ({
  file,
  onFileChange,
  label = 'Attach Bill / Receipt / Voucher Copy (Optional)',
  hint = 'Supports all images (PNG, JPG, iOS HEIC/HEIF) and PDF up to 25MB',
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isHeic = file
    ? /\.(heic|heif)$/i.test(file.name) ||
      file.type === 'image/heic' ||
      file.type === 'image/heif'
    : false;

  const isPdf = file
    ? file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    : false;

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    // Generate local preview if it's a standard web-decodable image (non-HEIC)
    if (file.type.startsWith('image/') && !isHeic) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file, isHeic]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const isImageFile =
      selectedFile.type.startsWith('image/') ||
      /\.(heic|heif|png|jpe?g|webp|gif|svg|bmp|tiff?|jfif)$/i.test(selectedFile.name);
    const isPdfFile =
      selectedFile.type === 'application/pdf' || /\.pdf$/i.test(selectedFile.name);

    if (!isImageFile && !isPdfFile) {
      alert(
        'Please upload a valid document or image (PDF, PNG, JPG, or iOS HEIC/HEIF).'
      );
      return;
    }

    // Limit to 25MB
    if (selectedFile.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit. Please select a smaller file.');
      return;
    }

    onFileChange(selectedFile);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
        <span className="text-[11px] text-slate-400 font-normal">Optional</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.HEIC,.HEIF,application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={handleFileSelect}
      />

      {!file ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-purple-600 bg-purple-50/60'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 hover:border-purple-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-purple-600">
              <UploadCloud className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div className="text-xs text-slate-700 font-semibold">
              <span className="text-purple-600 hover:underline">Click to browse</span> or drag and drop
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {hint}
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/40 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Bill Preview"
                className="w-12 h-12 rounded-lg object-cover border border-purple-200 shadow-2xs shrink-0 bg-white"
              />
            ) : isHeic ? (
              <div className="w-12 h-12 rounded-lg bg-purple-100 border border-purple-200 shadow-2xs flex items-center justify-center text-purple-700 shrink-0">
                <Smartphone className="w-6 h-6 text-purple-700" />
              </div>
            ) : isPdf ? (
              <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 shadow-2xs flex items-center justify-center text-rose-600 shrink-0">
                <FileText className="w-6 h-6 text-rose-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white border border-purple-200 shadow-2xs flex items-center justify-center text-purple-700 shrink-0">
                <ImageIcon className="w-6 h-6 text-purple-600" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                  {file.name}
                </p>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="uppercase font-mono text-[10px] font-semibold text-purple-700">
                  {isHeic ? 'iOS Photo (HEIC)' : isPdf ? 'PDF Bill' : 'Image Bill'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => !disabled && fileInputRef.current?.click()}
              className="text-[11px] font-medium text-purple-700 hover:text-purple-900 hover:underline px-2 py-1 rounded cursor-pointer"
              disabled={disabled}
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
              title="Remove file"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Aliases for compatibility across modules
export const InventoryBillUploader = BillDocumentUploader;
export const ExpenseBillUploader = BillDocumentUploader;
