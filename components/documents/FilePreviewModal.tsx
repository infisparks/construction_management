'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Building, 
  User, 
  Calendar, 
  Tag, 
  ShieldCheck, 
  Clock,
  Star,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Maximize2,
  Table as TableIcon,
  Trash2,
  RotateCcw,
  AlertCircle,
  Move,
  Hand,
  Loader2,
  Database,
  Copy,
  Check,
  MessageCircle
} from 'lucide-react';
import { ProjectFile } from '@/lib/construction-planning/types';
import { getProjectDocumentPdfUrl } from '@/lib/construction-planning/project-document-pdf';
import { resolveFileUrl, extractStoragePath } from '@/lib/supabase/project-files';
import * as XLSX from 'xlsx';

interface FilePreviewModalProps {
  file: ProjectFile | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStar?: (id: string, isStarred: boolean) => void;
  onDeleteFile?: (file: ProjectFile) => void;
  onRestoreFile?: (file: ProjectFile) => void;
  onShareWhatsApp?: (file: ProjectFile) => void;
}

// Sample BOQ items for spreadsheet in-app view
const SAMPLE_BOQ_ITEMS = [
  { item: '1.01', desc: 'Earthwork excavation in all kinds of soil for foundation including shoring & dewatering', unit: 'Cum', qty: 1250, rate: 380, total: 475000, spec: 'IS: 1200 Part 1' },
  { item: '1.02', desc: 'Plain Cement Concrete (PCC 1:4:8) with 40mm graded stone aggregate in foundation base', unit: 'Cum', qty: 180, rate: 4850, total: 873000, spec: 'IS: 456-2000' },
  { item: '1.03', desc: 'Reinforced Cement Concrete (RCC M35 design mix) in raft foundation slab & retaining walls', unit: 'Cum', qty: 520, rate: 7600, total: 3952000, spec: 'IS: 456 / Design Mix' },
  { item: '1.04', desc: 'High yield strength deformed TMT steel reinforcement bars (Fe 550D) cut, bent & tied', unit: 'MT', qty: 62.5, rate: 68500, total: 4281250, spec: 'IS: 1786 Fe 550D' },
  { item: '1.05', desc: 'Pre-applied HDPE waterproofing membrane with self-adhesive laps under raft foundation', unit: 'Sqm', qty: 850, rate: 850, total: 722500, spec: 'ASTM D5385 / Waterproof' },
  { item: '1.06', desc: 'M35 grade RCC in columns, shear walls, and core lift walls up to ground level', unit: 'Cum', qty: 240, rate: 8200, total: 1968000, spec: 'IS: 13920 Ductile' },
  { item: '1.07', desc: 'AAC lightweight block masonry 200mm thick with polymer modified thin bed adhesive', unit: 'Cum', qty: 310, rate: 4600, total: 1426000, spec: 'IS: 2185 Part 3' },
  { item: '1.08', desc: 'Internal gypsum plaster 12mm thick over block masonry with smooth punning finish', unit: 'Sqm', qty: 1850, rate: 280, total: 518000, spec: 'IS: 2547 Part 2' },
  { item: '1.09', desc: 'External cement sand plaster 20mm thick in two coats with integral water proofer', unit: 'Sqm', qty: 920, rate: 390, total: 358800, spec: 'IS: 1661 / Waterproof' },
  { item: '1.10', desc: 'Structural steel embed plates, hold-down bolts, and cast-in inserts grade E250', unit: 'Kg', qty: 3400, rate: 110, total: 374000, spec: 'IS: 2062 Grade E250' },
];

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onToggleStar,
  onDeleteFile,
  onRestoreFile,
  onShareWhatsApp,
}) => {
  const [activeTab, setActiveTab] = useState<'viewer' | 'details'>('viewer');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Zoom, Pan & Rotation Engine
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs for zero-latency gesture & drag tracking
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const dragStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const touchStartRef = useRef<{ dist: number; midX: number; midY: number; startZoom: number; startPanX: number; startPanY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset viewport when new document is opened
  useEffect(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setIsDragging(false);
  }, [file?.id, isOpen]);

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

  // Attach non-passive wheel listener via callback ref
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('wheel', onWheelHandler);
    }
    containerRef.current = node;
    if (node) {
      node.addEventListener('wheel', onWheelHandler, { passive: false });
    }
  }, [onWheelHandler]);

  // Mouse drag handler: move smoothly with mouse click-and-drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left mouse button only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  // Window listeners during drag for seamless 60fps tracking
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

  // Touch handlers for touchscreen laptops, tablets, and pads
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

  // Double click toggles between 1.75x zoom and 1x reset
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
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(5.0, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Dynamic Spreadsheet State (CSV / Excel parsing via XLSX)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<(string | number)[][]>([]);
  const [isSheetLoading, setIsSheetLoading] = useState<boolean>(false);
  const [sheetLoadError, setSheetLoadError] = useState<string | null>(null);
  const [sheetSearch, setSheetSearch] = useState('');
  const [activeCell, setActiveCell] = useState<{ row: number; col: string; value: string }>({
    row: 1,
    col: 'A',
    value: '',
  });

  const isSpreadsheet = Boolean(
    file && (
      file.file_type === 'spreadsheet' ||
      /\.(xlsx|xls|csv)$/i.test(file.file_name || '') ||
      /\.(xlsx|xls|csv)$/i.test(file.file_url || '')
    )
  );

  const isDwg = Boolean(
    file && (
      file.file_type === 'dwg' ||
      /\.(dwg|dxf|cad)$/i.test(file.file_name || '') ||
      /\.(dwg|dxf|cad)$/i.test(file.file_url || '')
    )
  );

  // Generate or obtain PDF URL when opening a PDF
  useEffect(() => {
    if (!file || !isOpen) {
      setPdfBlobUrl(null);
      setZoomLevel(1);
      setRotation(0);
      return;
    }

    if (file.file_type === 'pdf') {
      try {
        const url = getProjectDocumentPdfUrl(file);
        setPdfBlobUrl(url);
      } catch (err) {
        console.error('Failed to get PDF URL:', err);
      }
    }
  }, [file, isOpen]);

  // Load and parse real spreadsheet / CSV from storage or fallback to sample
  useEffect(() => {
    if (!isOpen || !file || !isSpreadsheet) {
      setWorkbook(null);
      setSheetNames([]);
      setActiveSheetName('');
      setSheetHeaders([]);
      setSheetRows([]);
      setSheetLoadError(null);
      setIsSheetLoading(false);
      return;
    }

    // Reset search on document switch
    setSheetSearch('');

    if (!file.file_url) {
      // Fallback sample data if no uploaded file URL
      const sampleHeaders = ['Item Code', 'Description of Work / Material', 'Unit', 'Quantity', 'Rate (₹)', 'Total (₹)', 'Specification / IS Code'];
      const sampleRows = SAMPLE_BOQ_ITEMS.map(i => [i.item, i.desc, i.unit, i.qty, i.rate, i.total, i.spec]);
      setSheetNames(['Sheet 1 (Sample)']);
      setActiveSheetName('Sheet 1 (Sample)');
      setSheetHeaders(sampleHeaders);
      setSheetRows(sampleRows);
      setActiveCell({ row: 1, col: 'A', value: String(sampleRows[0][0]) });
      setIsSheetLoading(false);
      return;
    }

    let isMounted = true;
    setIsSheetLoading(true);
    setSheetLoadError(null);

    const targetFetchUrl = resolveFileUrl(file.file_url);

    fetch(targetFetchUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to download file from cloud storage`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!isMounted) return;
        try {
          const wb = XLSX.read(buffer, { type: 'array' });
          setWorkbook(wb);
          const sheets = wb.SheetNames || [];
          setSheetNames(sheets);

          if (sheets.length > 0) {
            const firstSheet = sheets[0];
            setActiveSheetName(firstSheet);
            const ws = wb.Sheets[firstSheet];
            const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

            if (rawData.length > 0) {
              const headerRow = rawData[0] || [];
              const headers = headerRow.map((h: any, i: number) =>
                h !== undefined && h !== null && String(h).trim() !== ''
                  ? String(h).trim()
                  : `Col ${i + 1}`
              );
              const rows = rawData.slice(1).map(row =>
                headers.map((_, i) => (row[i] !== undefined && row[i] !== null ? row[i] : ''))
              );
              setSheetHeaders(headers);
              setSheetRows(rows);
              if (rows.length > 0 && rows[0].length > 0) {
                setActiveCell({ row: 1, col: 'A', value: String(rows[0][0] ?? '') });
              } else if (headers.length > 0) {
                setActiveCell({ row: 0, col: 'A', value: headers[0] });
              }
            } else {
              setSheetHeaders([]);
              setSheetRows([]);
            }
          }
          setIsSheetLoading(false);
        } catch (err: any) {
          console.error('Failed to parse spreadsheet file:', err);
          if (isMounted) {
            setSheetLoadError(err.message || 'Failed to parse spreadsheet file');
            setIsSheetLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch file:', err);
        if (isMounted) {
          setSheetLoadError(err.message || 'Network error fetching file');
          setIsSheetLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [file?.file_url, file?.id, isSpreadsheet, isOpen]);

  // Sheet switch handler
  const handleSelectSheet = (sheetName: string) => {
    if (!workbook || !sheetName) return;
    setActiveSheetName(sheetName);
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;
    try {
      const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rawData.length > 0) {
        const headerRow = rawData[0] || [];
        const headers = headerRow.map((h: any, i: number) =>
          h !== undefined && h !== null && String(h).trim() !== '' ? String(h).trim() : `Col ${i + 1}`
        );
        const rows = rawData.slice(1).map(row =>
          headers.map((_, i) => (row[i] !== undefined && row[i] !== null ? row[i] : ''))
        );
        setSheetHeaders(headers);
        setSheetRows(rows);
        if (rows.length > 0 && rows[0].length > 0) {
          setActiveCell({ row: 1, col: 'A', value: String(rows[0][0] ?? '') });
        }
      } else {
        setSheetHeaders([]);
        setSheetRows([]);
      }
    } catch (e) {
      console.error('Error switching sheet:', e);
    }
  };

  const getColLetter = (colIndex: number): string => {
    let letter = '';
    let temp = colIndex;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Filter dynamic spreadsheet rows based on search
  const filteredRows = useMemo(() => {
    if (!sheetSearch.trim()) return sheetRows;
    const q = sheetSearch.toLowerCase().trim();
    return sheetRows.filter(row =>
      row.some(cell => String(cell ?? '').toLowerCase().includes(q))
    );
  }, [sheetRows, sheetSearch]);

  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleDownload = () => {
    const downloadUrl = pdfBlobUrl || resolveFileUrl(file.file_url);
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const blob = new Blob([`Document No: ${file.document_no}\nTitle: ${file.title}\nCategory: ${file.category}\nVersion: ${file.version}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.file_name || file.document_no}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
              {file.document_no}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate" title={file.title}>
                {file.title}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>{file.project?.name || 'Noori Crust Site'}</span>
                <span>•</span>
                <span>{file.category}</span>
                <span>•</span>
                <span className="uppercase text-purple-700 font-bold">{file.file_type}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            
            {/* View Mode Tabs */}
            <div className="hidden sm:flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100/70 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('viewer')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeTab === 'viewer' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In-App Viewer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeTab === 'details' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Metadata & Links
              </button>
            </div>

            {onToggleStar && (
              <button
                type="button"
                onClick={() => onToggleStar(file.id, !file.is_starred)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  file.is_starred 
                    ? 'bg-amber-50 text-amber-500 border-amber-200' 
                    : 'text-slate-400 hover:text-slate-700 border-slate-200'
                }`}
                title={file.is_starred ? 'Remove Star' : 'Star Document'}
              >
                <Star className={`w-4 h-4 ${file.is_starred ? 'fill-amber-400' : ''}`} />
              </button>
            )}

            {file.is_deleted ? (
              onRestoreFile && (
                <button
                  type="button"
                  onClick={() => onRestoreFile(file)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
                  title="Restore back to project"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore File</span>
                </button>
              )
            ) : (
              onDeleteFile && (
                <button
                  type="button"
                  onClick={() => onDeleteFile(file)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Move to Recycle Bin"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}

            {onShareWhatsApp && (
              <button
                type="button"
                onClick={() => onShareWhatsApp(file)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                title="Send document via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
              title={`Download ${isDwg ? 'DWG File' : 'File'}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDwg ? 'Download DWG' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recycle Bin Warning Banner if file is deleted */}
        {file.is_deleted && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 flex items-center justify-between text-xs text-rose-800 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                This file is in the <strong>Recycle Bin</strong> (deleted{file.deleted_at ? ` on ${new Date(file.deleted_at).toLocaleDateString()}` : ''}). You can restore it anytime to make it available to the project team.
              </span>
            </div>
            {onRestoreFile && (
              <button
                type="button"
                onClick={() => onRestoreFile(file)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer ml-3 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Now</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-100/50">
          
          {/* TAB 1: IN-APP DIRECT VIEWER */}
          {activeTab === 'viewer' && (
            <div className="flex-1 w-full h-full overflow-hidden flex flex-col">
              
              {/* 1. PDF DIRECT EMBEDDED VIEWER (WITH ZOOM & PAN ENGINE) */}
              {file.file_type === 'pdf' && (
                <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-slate-900/90 relative">
                  
                  {/* PDF Top Controls Bar */}
                  <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-20 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-800 truncate">{file.file_name}</span>
                      <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                        PDF Document / Drawing
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <span>🖱️ Mouse wheel / 2-finger pinch to zoom &bull; Click &amp; drag to move</span>
                      </div>

                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
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
                          title="Click to Reset (100%)"
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
                        onClick={handleRotate}
                        className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleResetView}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-purple-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Reset View to 100% and Center"
                      >
                        Reset View
                      </button>

                      {pdfBlobUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(pdfBlobUrl, '_blank')}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                          title="Open PDF in Full Browser Window"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open Tab</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Interactive PDF Pan & Zoom Canvas */}
                  <div 
                    ref={setContainerRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={handleDoubleClick}
                    className="flex-1 w-full h-full overflow-hidden flex items-center justify-center p-3 relative select-none"
                    style={{
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                  >
                    {pdfBlobUrl ? (
                      <div
                        style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                          transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                          width: '100%',
                          height: '100%',
                          maxWidth: '1200px',
                          maxHeight: '850px',
                        }}
                        className="rounded-xl shadow-2xl bg-white overflow-hidden relative border border-slate-700/50"
                      >
                        {/* Drag shield: intercepts pointer events while dragging so iframe doesn't steal mouse */}
                        {isDragging && (
                          <div className="absolute inset-0 z-30 bg-transparent" />
                        )}
                        <iframe
                          src={`${pdfBlobUrl}#toolbar=1`}
                          className="w-full h-full rounded-xl border-none"
                          title={file.title}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 shadow-lg">
                        <div className="w-8 h-8 border-3 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mb-3" />
                        <p className="text-xs font-semibold text-slate-500">Rendering document in viewer...</p>
                      </div>
                    )}

                    {/* Floating HUD Pill at Bottom */}
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
                        onClick={handleRotate}
                        className="p-1 hover:text-purple-400 transition-colors cursor-pointer"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
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

                </div>
              )}

              {/* 2. SPREADSHEET (EXCEL / CSV / BOQ) DIRECT INTERACTIVE VIEWER */}
              {isSpreadsheet && (
                <div className="flex-1 w-full h-full flex flex-col bg-white overflow-hidden p-3">
                  
                  {/* Excel / CSV Style Toolbar */}
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-t-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] tracking-wider">
                        {file.file_name.split('.').pop()?.toUpperCase() || 'XLS'}
                      </div>
                      <span className="font-bold text-slate-800 font-mono truncate max-w-xs">{file.file_name}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        {activeSheetName || 'Active Sheet'}
                      </span>
                      {sheetRows.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {filteredRows.length} rows &bull; {sheetHeaders.length} cols
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={sheetSearch}
                          onChange={(e) => setSheetSearch(e.target.value)}
                          placeholder="Search in sheet..."
                          className="text-[11px] pl-7 pr-6 py-1 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 w-48"
                        />
                        {sheetSearch && (
                          <button
                            type="button"
                            onClick={() => setSheetSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                        title="Download spreadsheet"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  {/* Excel Formula Bar */}
                  <div className="bg-slate-50 border-x border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 text-xs text-slate-600 shrink-0">
                    <span className="font-mono font-bold text-slate-500 text-[11px] w-12 shrink-0">
                      {activeCell.col}{activeCell.row}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono text-[11px] font-bold text-purple-700 shrink-0">fx</span>
                    <input
                      type="text"
                      readOnly
                      value={activeCell.value}
                      title={activeCell.value}
                      className="flex-1 bg-transparent text-[11px] font-mono text-slate-800 focus:outline-none select-all truncate"
                    />
                  </div>

                  {/* Spreadsheet Grid Body */}
                  {isSheetLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 border-x border-b border-slate-200 rounded-b-xl bg-white">
                      <Loader2 className="w-7 h-7 text-purple-600 animate-spin mb-2" />
                      <p className="text-xs font-semibold text-slate-700">Loading spreadsheet data...</p>
                      <p className="text-[11px] text-slate-400 mt-1">Reading actual content from file</p>
                    </div>
                  ) : sheetLoadError ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 border-x border-b border-slate-200 rounded-b-xl bg-white text-center">
                      <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                      <p className="text-xs font-bold text-slate-800">Failed to render preview</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mt-1">{sheetLoadError}</p>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download file instead</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto border-x border-b border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                          <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase font-mono">
                            <th className="py-2 px-2.5 w-10 text-center bg-slate-200/70 border-r border-slate-300 select-none">
                              #
                            </th>
                            {sheetHeaders.map((header, colIdx) => (
                              <th 
                                key={colIdx} 
                                className="py-2 px-3 border-r border-slate-200 whitespace-nowrap bg-slate-100 font-semibold"
                              >
                                <span className="text-purple-700 font-mono font-bold mr-1.5">{getColLetter(colIdx)}:</span>
                                <span className="text-slate-700 normal-case">{header}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {filteredRows.map((row, rowIdx) => {
                            const isRowSelected = activeCell.row === rowIdx + 1;
                            return (
                              <tr
                                key={rowIdx}
                                className={`hover:bg-purple-50/40 transition-colors cursor-pointer ${
                                  isRowSelected ? 'bg-purple-50/70' : ''
                                }`}
                              >
                                <td className="py-2 px-2 text-center text-[10px] font-mono bg-slate-100/50 text-slate-400 border-r border-slate-200 select-none">
                                  {rowIdx + 1}
                                </td>
                                {sheetHeaders.map((_, colIdx) => {
                                  const cellVal = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : '';
                                  const isCellSelected = isRowSelected && activeCell.col === getColLetter(colIdx);
                                  return (
                                    <td
                                      key={colIdx}
                                      onClick={() => setActiveCell({
                                        row: rowIdx + 1,
                                        col: getColLetter(colIdx),
                                        value: cellVal,
                                      })}
                                      className={`py-2 px-3 border-r border-slate-100 whitespace-nowrap text-xs max-w-xs truncate ${
                                        isCellSelected 
                                          ? 'bg-purple-100/70 ring-1 ring-inset ring-purple-400 font-medium text-slate-900' 
                                          : 'text-slate-700'
                                      }`}
                                      title={cellVal}
                                    >
                                      {cellVal !== '' ? cellVal : <span className="text-slate-300 italic">-</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {filteredRows.length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-xs">
                          {sheetSearch ? `No rows matching "${sheetSearch}"` : 'This spreadsheet contains no data rows.'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Sheet Bottom Tabs (Excel-like Sheet1, Sheet2...) */}
                  {sheetNames.length > 1 && (
                    <div className="bg-slate-100 border-x border-b border-slate-200 px-2 py-1 flex items-center gap-1 overflow-x-auto rounded-b-xl shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Sheets:</span>
                      {sheetNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelectSheet(name)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                            activeSheetName === name 
                              ? 'bg-white text-purple-700 shadow-2xs font-bold border-t-2 border-t-purple-600' 
                              : 'text-slate-600 hover:bg-slate-200/70'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* 3. IMAGE DIRECT VIEWER (WITH ZOOM, 2-FINGER PINCH & DRAG PAN ENGINE) */}
              {file.file_type === 'image' && (
                <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-slate-900/95 relative">
                  
                  {/* Image Controls Toolbar */}
                  <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-20 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-800 truncate">{file.file_name}</span>
                      <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                        High-Res Photo / Drawing
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <span>🖱️ Mouse wheel / 2-finger pinch to zoom &bull; Click &amp; drag to move</span>
                      </div>

                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
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
                          title="Click to Reset (100%)"
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
                        onClick={handleRotate}
                        className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleResetView}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-purple-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Reset View to 100% and Center"
                      >
                        Reset View
                      </button>
                    </div>
                  </div>

                  {/* Image Interactive Canvas */}
                  <div 
                    ref={setContainerRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={handleDoubleClick}
                    className="flex-1 w-full h-full overflow-hidden flex items-center justify-center p-4 relative select-none"
                    style={{
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                  >
                    <div
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                      }}
                      className="flex items-center justify-center select-none"
                    >
                      {file.file_url ? (
                        <img
                          src={resolveFileUrl(file.file_url)}
                          alt={file.title}
                          draggable={false}
                          className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-2xl pointer-events-none"
                        />
                      ) : (
                        // Render authentic site inspection photo view
                        <div 
                          className="w-[560px] max-w-full bg-gradient-to-tr from-slate-800 to-slate-700 rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl border border-slate-600 select-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                              <span className="text-xs font-mono font-bold tracking-wider uppercase text-rose-300">
                                LIVE SITE INSPECTION PHOTO
                              </span>
                            </div>
                            <span className="font-mono text-xs text-slate-400">
                              {new Date(file.created_at).toLocaleDateString()} &bull; GPS: 28.6139° N, 77.2090° E
                            </span>
                          </div>

                          <div className="space-y-2 my-8 text-center">
                            <ImageIcon className="w-12 h-12 mx-auto text-purple-400" />
                            <h3 className="text-base font-bold text-white">{file.title}</h3>
                            <p className="text-xs text-slate-300 max-w-md mx-auto">
                              {file.description || 'On-site execution record capturing concrete pouring, rebar spacing, and supervisor QA verification.'}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-black/40 backdrop-blur-xs flex items-center justify-between text-xs font-mono text-slate-300">
                            <span>Site: <strong>{file.project?.name || 'Noori Crust Site'}</strong></span>
                            <span>Zone: <strong>{file.building_floor || 'Basement 1'}</strong></span>
                            <span>Contractor: <strong>{file.contractor_name || 'Al-Buraq Civil'}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Floating HUD Pill at Bottom */}
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
                        onClick={handleRotate}
                        className="p-1 hover:text-purple-400 transition-colors cursor-pointer"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
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

                </div>
              )}

              {/* 4. CAD / OTHER TECHNICAL DRAWINGS (WITH PAN & ZOOM) */}
              {file.file_type !== 'pdf' && !isSpreadsheet && file.file_type !== 'image' && (
                <div 
                  ref={setContainerRef}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onDoubleClick={handleDoubleClick}
                  className="flex-1 w-full h-full overflow-hidden flex items-center justify-center p-8 bg-slate-900/95 relative select-none"
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                >
                  <div
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                    }}
                    className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3 max-w-md shadow-2xl"
                  >
                    <FileText className="w-12 h-12 text-purple-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-900">{file.file_name}</h3>
                    <p className="text-xs text-slate-500">
                      {file.file_type === 'dwg' ? 'Technical CAD Drawing' : file.file_type === 'document' ? 'Document' : `${(file.file_name.split('.').pop() || 'FILE').toUpperCase()} Format`} &bull; {formatFileSize(file.file_size)}
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download {file.file_name.split('.').pop()?.toUpperCase() || 'File'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetView}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                      >
                        Reset View
                      </button>
                    </div>
                  </div>

                  {/* Floating HUD Pill at Bottom */}
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
              )}

            </div>
          )}

          {/* TAB 2: DETAILED METADATA & REVISION HISTORY */}
          {activeTab === 'details' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
              
              {/* Category & Status */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Category & Classification
                </div>
                <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {file.category}
                </span>
              </div>

              {/* Description */}
              {file.description && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Description & Scope Notes
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    {file.description}
                  </p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Revision</span>
                  <span className="font-mono font-bold text-slate-800">{file.version}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Status</span>
                  <span className={`font-semibold capitalize ${
                    file.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {file.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-medium">File Size</span>
                  <span className="font-mono text-slate-800">{formatFileSize(file.file_size)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-medium">Format</span>
                  <span className="font-mono uppercase text-slate-800">{file.file_type}</span>
                </div>
              </div>

              {/* Foreign Key Project and Entity Links */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Relational Links (Foreign Key)
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-800">
                  <Building className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Construction Project: <strong>{file.project ? `Site #${file.project.serial_no} — ${file.project.name}` : 'Noori Crust Site'}</strong></span>
                </div>

                {file.building_floor && (
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Building className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Floor / Zone: <strong>{file.building_floor}</strong></span>
                  </div>
                )}

                {file.contractor_name && (
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Contractor / Vendor: <strong>{file.contractor_name}</strong></span>
                  </div>
                )}

                {file.task_code && (
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>WBS Task Code: <strong className="font-mono">{file.task_code}</strong></span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Archived Date: {new Date(file.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Tags */}
              {file.tags && file.tags.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {file.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage & Self-Hosted Path Architecture */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    <span>Supabase Storage Architecture</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Self-Hosted Ready
                  </span>
                </div>

                {/* Stored Relative Path (in Database) */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-600">
                      Database Stored Path (Domain-Agnostic)
                    </span>
                    <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      Relative Path Only
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 overflow-hidden">
                    <span className="truncate" title={file.storage_path || extractStoragePath(file.file_url)}>
                      {file.storage_path || extractStoragePath(file.file_url) || 'No storage path attached'}
                    </span>
                    {(file.storage_path || extractStoragePath(file.file_url)) && (
                      <button
                        type="button"
                        onClick={() => {
                          const p = file.storage_path || extractStoragePath(file.file_url);
                          navigator.clipboard.writeText(p);
                          setCopiedPath(true);
                          setTimeout(() => setCopiedPath(false), 2000);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
                        title="Copy database relative path"
                      >
                        {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Stored in PostgreSQL without domain prefixes so migrating Supabase to a self-hosted instance never breaks file references.
                  </p>
                </div>

                {/* Dynamically Resolved Public URL */}
                {resolveFileUrl(file.file_url) && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-600">
                        Dynamic Resolved URL (Active Domain)
                      </span>
                      <a
                        href={resolveFileUrl(file.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-purple-700 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open Live URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 overflow-hidden">
                      <span className="truncate" title={resolveFileUrl(file.file_url)}>
                        {resolveFileUrl(file.file_url)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(resolveFileUrl(file.file_url));
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
                        title="Copy active public URL"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Resolved in real-time from <code>NEXT_PUBLIC_SUPABASE_URL</code>. Changing your domain automatically updates this URL everywhere.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
