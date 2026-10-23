'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  CheckCircle2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { SubcontractorBill, ProjectInfo } from '@/lib/construction-planning/types';
import { downloadSubcontractorBillPdf } from '@/lib/construction-planning/subcontractor-bill-pdf';

interface PdfViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blobUrl: string | null;
  bill: SubcontractorBill | null;
  project?: Partial<ProjectInfo>;
}

export const PdfViewerDialog: React.FC<PdfViewerDialogProps> = ({
  isOpen,
  onClose,
  blobUrl,
  bill,
  project,
}) => {
  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const dragStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const touchStartRef = useRef<{ dist: number; midX: number; midY: number; startZoom: number; startPanX: number; startPanY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset viewport when opening new bill
  useEffect(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, [bill?.id, isOpen]);

  // Non-passive wheel handler for laptop trackpad 2-finger pinch & mouse wheel zoom
  const onWheelHandler = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey) {
      // Trackpad 2-finger pinch gesture
      const factor = -e.deltaY * 0.015;
      setZoomLevel(prev => {
        const next = Math.min(Math.max(0.25, prev + factor), 5.0);
        return Math.round(next * 100) / 100;
      });
    } else {
      // Mouse wheel or trackpad 2-finger vertical scroll
      const step = 0.12 * Math.max(0.6, zoomLevelRef.current);
      const delta = e.deltaY < 0 ? step : -step;
      setZoomLevel(prev => {
        const next = Math.min(Math.max(0.25, prev + delta), 5.0);
        return Math.round(next * 100) / 100;
      });
    }
  }, []);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('wheel', onWheelHandler);
    }
    containerRef.current = node;
    if (node) {
      node.addEventListener('wheel', onWheelHandler, { passive: false });
    }
  }, [onWheelHandler]);

  // Drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  // Window drag listeners
  useEffect(() => {
    if (!isDragging) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: Math.round(dragStartRef.current.startPanX + dx),
        y: Math.round(dragStartRef.current.startPanY + dy),
      });
    };

    const onWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isDragging]);

  // Touch gestures for tablet / trackpad touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(true);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      touchStartRef.current = {
        dist,
        midX,
        midY,
        startZoom: zoomLevel,
        startPanX: pan.x,
        startPanY: pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan({
        x: Math.round(dragStartRef.current.startPanX + dx),
        y: Math.round(dragStartRef.current.startPanY + dy),
      });
    } else if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleFactor = newDist / (touchStartRef.current.dist || 1);
      const newZoom = Math.min(Math.max(0.25, touchStartRef.current.startZoom * scaleFactor), 5.0);
      setZoomLevel(Math.round(newZoom * 100) / 100);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - touchStartRef.current.midX;
      const dy = midY - touchStartRef.current.midY;
      setPan({
        x: Math.round(touchStartRef.current.startPanX + dx),
        y: Math.round(touchStartRef.current.startPanY + dy),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
  };

  const handleDoubleClick = () => {
    if (zoomLevel === 1) {
      setZoomLevel(1.75);
    } else {
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(5.0, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100));
  };

  if (!isOpen || !bill) return null;

  const handleDownload = () => {
    downloadSubcontractorBillPdf(bill, project);
  };

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-3xl lg:max-w-4xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between bg-slate-50 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {bill.billNumber || 'Bill Preview'} — {bill.vendorName}
                </h3>
                <span className="text-[10px] font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                  PDF Blob View
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Net Payable: Rs. {Number(bill.grandTotal || 0).toLocaleString('en-IN')} &bull; Date: {bill.billDate}
              </p>
            </div>
          </div>

          {/* Action & Zoom Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-200/80 rounded-lg p-0.5 border border-slate-300">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-slate-600 hover:text-purple-700 hover:bg-white rounded transition-colors cursor-pointer"
                title="Zoom Out (Scroll Down / Pinch In)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              
              <button
                type="button"
                onClick={handleResetView}
                className="px-2 py-0.5 text-[11px] font-mono font-bold text-purple-700 hover:bg-white rounded transition-colors cursor-pointer"
                title="Click to Reset to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 text-slate-600 hover:text-purple-700 hover:bg-white rounded transition-colors cursor-pointer"
                title="Zoom In (Scroll Up / Pinch Out)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetView}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-purple-700 hover:bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Reset View to 100% and Center"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-purple-700 hover:bg-purple-50 text-xs font-semibold shadow-xs transition-colors"
              title="Open blob URL in a new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
              title="Download PDF to computer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Interactive Canvas Frame */}
        <div 
          ref={setContainerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
          className="flex-1 bg-slate-900/90 overflow-hidden flex items-center justify-center p-3 relative select-none"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          {blobUrl ? (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                width: '100%',
                height: '100%',
                maxWidth: '1100px',
                maxHeight: '800px',
              }}
              className="rounded-xl shadow-2xl bg-white overflow-hidden relative border border-slate-700/50"
            >
              {isDragging && (
                <div className="absolute inset-0 z-30 bg-transparent" />
              )}
              <iframe
                src={blobUrl}
                className="w-full h-full rounded-xl border-none"
                title="Subcontractor Bill PDF Preview"
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <FileText className="w-12 h-12 text-slate-300 animate-pulse" />
              <p className="text-xs">Generating PDF Preview...</p>
            </div>
          )}

          {/* Floating Bottom HUD Pill */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-2xl text-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 hover:text-purple-400 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold px-1.5 min-w-[42px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 hover:text-purple-400 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-3.5 bg-slate-700" />
            <button
              type="button"
              onClick={handleResetView}
              className="px-2 py-0.5 text-[11px] font-bold hover:text-purple-400 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer info banner */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ready for printing, digital submission, and audit compliance.</span>
          </div>
          <span className="font-mono text-slate-400">IS 1200 / CPWD Format</span>
        </div>

      </div>
    </div>
  );
};
