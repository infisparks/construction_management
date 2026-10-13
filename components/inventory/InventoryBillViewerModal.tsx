'use client';

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Download,
  FileText,
  Image as ImageIcon,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface BillViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string | null;
  voucherNumber?: string;
  title?: string;
}

export const BillDocumentViewerModal: React.FC<BillViewerModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  voucherNumber,
  title = 'Uploaded Bill Document',
}) => {
  const [imageError, setImageError] = useState(false);

  if (!isOpen || !fileUrl) return null;

  const isPdf =
    fileUrl.toLowerCase().includes('.pdf') ||
    (fileName && fileName.toLowerCase().endsWith('.pdf'));

  const isHeic =
    fileUrl.toLowerCase().includes('.heic') ||
    fileUrl.toLowerCase().includes('.heif') ||
    (fileName && /\.(heic|heif)$/i.test(fileName));

  const displayName = fileName || title || 'Uploaded Bill Document';

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = displayName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
              {isPdf ? (
                <FileText className="w-5 h-5 text-rose-600" />
              ) : isHeic ? (
                <Smartphone className="w-5 h-5 text-purple-700" />
              ) : (
                <ImageIcon className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {displayName}
                </span>
                {voucherNumber && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 shrink-0">
                    {voucherNumber}
                  </span>
                )}
                {isHeic && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 shrink-0">
                    iOS HEIC Photo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Uploaded physical invoice / bill verification copy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Open full document in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-900/5 min-h-[380px] max-h-[78vh] overflow-auto flex items-center justify-center p-4">
          {isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              title={displayName}
              className="w-full h-[70vh] rounded-lg border border-slate-200 shadow-sm bg-white"
            />
          ) : isHeic && imageError ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Apple / iOS Photo (HEIC Format)
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This image was captured in Apple High-Efficiency format. You can download or open it in your device photos viewer.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Photo</span>
                </button>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={fileUrl}
                alt={displayName}
                onError={() => setImageError(true)}
                className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-md border border-slate-200 bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Aliases for compatibility
export const InventoryBillViewerModal = BillDocumentViewerModal;
export const ExpenseBillViewerModal = BillDocumentViewerModal;
