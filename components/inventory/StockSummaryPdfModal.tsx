'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Printer,
  Package,
  Layers,
  FileText,
  MessageCircle
} from 'lucide-react';
import { ConstructionMaterial } from '@/lib/inventory/inventory-types';
import {
  getInventoryStockSummaryPdfBlobUrl,
  downloadInventoryStockSummaryPdf,
} from '@/lib/inventory/inventory-stock-pdf';

interface StockSummaryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: ConstructionMaterial[];
  projectName?: string;
  onShareWhatsApp?: () => void;
}

export const StockSummaryPdfModal: React.FC<StockSummaryPdfModalProps> = ({
  isOpen,
  onClose,
  materials,
  projectName = 'Noori Crest Tower',
  onShareWhatsApp,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && materials.length > 0) {
      try {
        const { blobUrl: url } = getInventoryStockSummaryPdfBlobUrl(materials, projectName);
        setBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Failed to generate stock PDF blob:', err);
      }
    } else {
      setBlobUrl(null);
    }
  }, [isOpen, materials, projectName]);

  if (!isOpen) return null;

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const handleDownload = () => {
    downloadInventoryStockSummaryPdf(materials, projectName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-6xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Site Stock Balance & Inventory Statement
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                  Blob PDF
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {projectName} • Live Audited Balance for {materials.length} Materials
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="h-8 px-3 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Open full PDF in a new browser tab via Blob URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in New Tab</span>
              <span className="sm:hidden">New Tab</span>
            </button>

            {onShareWhatsApp && (
              <button
                type="button"
                onClick={onShareWhatsApp}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Send inventory stock report on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Download PDF to your computer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Close PDF Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer */}
        <div className="flex-1 w-full bg-slate-800 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              title="Inventory Stock Statement PDF"
              className="w-full h-full rounded-xl shadow-lg border border-slate-700 bg-white"
            />
          ) : (
            <div className="text-center text-slate-400 py-12">
              <div className="w-10 h-10 rounded-full border-2 border-purple-400 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs">Generating stock balance PDF blob...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
