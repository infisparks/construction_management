'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Printer,
  MessageCircle,
  FileDown,
  Sliders,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Settings,
  Upload,
  Palette,
  Check,
  Columns,
  Layers,
  ShieldCheck,
  Box,
  Heading,
  FileText,
  PenTool,
  CheckCircle2,
  DollarSign,
  Info
} from 'lucide-react';
import {
  QuotationRecord,
  updateQuotation,
  getDefaultQuotationTemplate
} from '@/lib/supabase/quotations-services';
import { WhatsAppShareModal, WhatsAppSharePayload } from '@/components/whatsapp/WhatsAppShareModal';
import { supabase } from '@/lib/supabase/client';

export type CanvaElementType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'two-columns'
  | 'three-columns'
  | 'scope-item'
  | 'total-box'
  | 'callout'
  | 'signatures'
  | 'image'
  | 'divider';

export interface CanvaElement {
  id: string;
  type: CanvaElementType;
  pageIndex: number; // 0 for Page 1, 1 for Page 2
  // Content
  text?: string;
  subtext?: string;
  headingLevel?: 1 | 2 | 3;
  listType?: 'bullet' | 'number';
  listItems?: string[];
  // For two-columns
  col1Title?: string;
  col1Text?: string;
  col2Title?: string;
  col2Text?: string;
  // For three-columns
  cols3?: { title: string; subtitle: string; value: string }[];
  // For scope item
  itemNumber?: string;
  itemName?: string;
  itemDescription?: string;
  qty?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  // For total-box
  subtotal?: number;
  taxLabel?: string;
  taxAmount?: number;
  grandTotal?: number;
  // For signatures
  leftSignTitle?: string;
  leftSignSubtitle?: string;
  rightSignTitle?: string;
  rightSignSubtitle?: string;
  // For image
  imageUrl?: string;
  imageCaption?: string;
  // Styling
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
}

interface QuotationWordEditorProps {
  quotation: QuotationRecord;
  availableProjects?: { id: string; name: string }[];
  userEmail?: string;
  onBack: () => void;
  onSaved?: (updated: QuotationRecord) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const FONT_FAMILIES = [
  { label: 'Inter (Modern)', value: 'Inter, system-ui, -apple-system, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
];

const FONT_SIZES = [
  '11px',
  '12px',
  '13px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '28px',
];

const PRESET_COLORS = [
  '#111827', // Charcoal
  '#653ef1', // Primary Purple
  '#2563eb', // Blue
  '#059669', // Emerald
  '#dc2626', // Red
  '#d97706', // Amber
  '#475569', // Slate
  '#6b7280', // Gray
];

const BG_PRESET_COLORS = [
  'transparent',
  '#ffffff',
  '#f8fafc',
  '#f5f3ff',
  '#eff6ff',
  '#f0fdf4',
  '#fffbeb',
  '#fef2f2',
];

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export const QuotationWordEditor: React.FC<QuotationWordEditorProps> = ({
  quotation,
  availableProjects = [],
  userEmail,
  onBack,
  onSaved,
  showToast,
}) => {
  // Quotation Metadata
  const [title, setTitle] = useState(quotation.title);
  const [quotationNumber, setQuotationNumber] = useState(quotation.quotation_number);
  const [clientName, setClientName] = useState(quotation.client_name || '');
  const [clientPhone, setClientPhone] = useState(quotation.client_phone || '');
  const [clientEmail, setClientEmail] = useState(quotation.client_email || '');
  const [clientAddress, setClientAddress] = useState(quotation.client_address || '');
  const [projectId, setProjectId] = useState(quotation.project_id || '');
  const [projectName, setProjectName] = useState(quotation.project_name || '');
  const [quotationDate, setQuotationDate] = useState(
    quotation.quotation_date || new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState(quotation.valid_until || '');
  const [status, setStatus] = useState(quotation.status || 'draft');

  // Letterhead & Canvas Margins (Default Blank Canvas, or 185px if letterhead image)
  const [letterheadEnabled, setLetterheadEnabled] = useState(
    quotation.letterhead_enabled ?? Boolean(quotation.letterhead_image_url)
  );
  const [letterheadImageUrl, setLetterheadImageUrl] = useState(
    quotation.letterhead_image_url || ''
  );
  const [marginTop, setMarginTop] = useState(
    quotation.margin_top ?? (quotation.letterhead_image_url ? 185 : 40)
  );
  const [marginBottom, setMarginBottom] = useState(quotation.margin_bottom ?? 60);
  const [showGuidelines, setShowGuidelines] = useState(true);

  // Canva Multi-Page & Zoom
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Elements State
  const [elements, setElements] = useState<CanvaElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // UI Panels State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'elements' | 'letterhead' | 'details'>('elements');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
  const [isFontFamilyOpen, setIsFontFamilyOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // WhatsApp Share
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppPayload, setWhatsAppPayload] = useState<WhatsAppSharePayload | null>(null);

  // References
  const letterheadFileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);

  // Calculate Grand Total from scope items
  const computedTotal = elements.reduce((acc, el) => {
    if (el.type === 'scope-item' && typeof el.amount === 'number') {
      return acc + el.amount;
    }
    return acc;
  }, 0);

  // Parse existing content_html or initialize standard Canva elements
  const buildDefaultElements = (): CanvaElement[] => {
    const qNo = quotationNumber || 'QTN-2026-001';
    const qDate = quotationDate || new Date().toISOString().slice(0, 10);
    const client = clientName || 'M/S Armee Infra & Associates';
    const site = projectName || 'Noori Horizon Site';

    return [
      {
        id: 'el-header-1',
        type: 'heading',
        pageIndex: 0,
        text: 'COMMERCIAL QUOTATION',
        headingLevel: 1,
        textColor: '#653ef1',
        fontSize: '22px',
        bold: true,
        align: 'left',
      },
      {
        id: 'el-2col-summary',
        type: 'two-columns',
        pageIndex: 0,
        col1Title: 'CLIENT / TO DETAILS',
        col1Text: `${client}\nContact: ${clientPhone || '+91 99583 99157'}\nSite: ${site}`,
        col2Title: 'COMMERCIAL REFERENCE',
        col2Text: `Ref: ${qNo}\nDate: ${qDate}\nValidity: 30 Calendar Days`,
      },
      {
        id: 'el-intro-para',
        type: 'paragraph',
        pageIndex: 0,
        text: `Dear Sir/Madam,\nWe thank you for the opportunity to present our commercial proposal for the execution of works at ${site}. Below is our itemized scope of works, specifications, and commercial schedule:`,
        fontSize: '13px',
        textColor: '#111827',
      },
      {
        id: 'el-heading-scope',
        type: 'heading',
        pageIndex: 0,
        text: 'Scope of Works & Rate Breakdown',
        headingLevel: 2,
        textColor: '#1e293b',
        fontSize: '15px',
        bold: true,
      },
      {
        id: 'el-scope-1',
        type: 'scope-item',
        pageIndex: 0,
        itemNumber: '1',
        itemName: 'RCC Column & Slab Casting (M25 Grade)',
        itemDescription: 'Supply and pour of ready-mix concrete including shuttering, propping, and vibration curing.',
        qty: 50,
        unit: 'Cu.M',
        rate: 6500,
        amount: 325000,
      },
      {
        id: 'el-scope-2',
        type: 'scope-item',
        pageIndex: 0,
        itemNumber: '2',
        itemName: 'AAC Block Masonry Work (6" thick)',
        itemDescription: 'Laying AAC blocks with high-bond polymer adhesive mortar, line, level & joint filling.',
        qty: 1200,
        unit: 'Sq.Ft',
        rate: 75,
        amount: 90000,
      },
      {
        id: 'el-scope-3',
        type: 'scope-item',
        pageIndex: 0,
        itemNumber: '3',
        itemName: 'Internal Sand Face Plastering (12mm)',
        itemDescription: 'Smooth trowel finished cement mortar (1:4) including curing & scaffolding.',
        qty: 2500,
        unit: 'Sq.Ft',
        rate: 35,
        amount: 87500,
      },
      {
        id: 'el-total-box',
        type: 'total-box',
        pageIndex: 0,
        subtotal: 502500,
        taxLabel: 'GST (18%)',
        taxAmount: 90450,
        grandTotal: 592950,
      },
      {
        id: 'el-terms-list',
        type: 'list',
        pageIndex: 0,
        text: 'Commercial Terms & Conditions:',
        listType: 'bullet',
        listItems: [
          'Payment Schedule: 40% Mobilization Advance, 50% progressive running bills, 10% on completion.',
          'Water & Power: To be supplied by client free of cost at the site location.',
          'Statutory taxes applicable as per prevailing governmental regulations.',
          'Rates remain valid for 30 calendar days from the date of issuance.',
        ],
      },
      {
        id: 'el-signatures',
        type: 'signatures',
        pageIndex: 0,
        leftSignTitle: 'Client Acceptance',
        leftSignSubtitle: 'Authorized Signatory & Seal',
        rightSignTitle: 'For Armee Enterprises Construction ERP',
        rightSignSubtitle: 'Managing Director / Commercial Head',
      },
    ];
  };

  // Initialize Elements from content_html or template
  useEffect(() => {
    if (quotation.content_html) {
      // Check if structured Canva elements are serialized in HTML comment
      const match = quotation.content_html.match(/<!-- CANVA_ELEMENTS_DATA:([\s\S]*?) -->/);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setElements(parsed);
            const maxPage = parsed.reduce((max, el) => Math.max(max, el.pageIndex || 0), 0);
            setTotalPages(maxPage + 1);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse Canva JSON comment, falling back to template:', e);
        }
      }
    }
    // Default template
    setElements(buildDefaultElements());
  }, []);

  // Sync project name when selection changes
  const handleProjectSelect = (pId: string) => {
    setProjectId(pId);
    const found = availableProjects.find((p) => p.id === pId);
    setProjectName(found ? found.name : '');
    setHasUnsavedChanges(true);
  };

  // Selected Element
  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  // Update a single element field
  const updateElement = (id: string, updates: Partial<CanvaElement>) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        const updated = { ...el, ...updates };
        // Auto-recalculate scope-item amount
        if (updated.type === 'scope-item' && ('qty' in updates || 'rate' in updates)) {
          const q = Number(updated.qty) || 0;
          const r = Number(updated.rate) || 0;
          updated.amount = q * r;
        }
        return updated;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Delete element
  const deleteElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
    setHasUnsavedChanges(true);
    if (showToast) showToast('Element removed', 'info');
  };

  // Duplicate element
  const duplicateElement = (id: string) => {
    const orig = elements.find((el) => el.id === id);
    if (!orig) return;
    const newEl: CanvaElement = {
      ...orig,
      id: `el-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    const origIdx = elements.findIndex((el) => el.id === id);
    const updated = [...elements];
    updated.splice(origIdx + 1, 0, newEl);
    setElements(updated);
    setSelectedElementId(newEl.id);
    setHasUnsavedChanges(true);
    if (showToast) showToast('Element duplicated', 'success');
  };

  // Move element up / down in flow
  const moveElement = (id: string, direction: 'up' | 'down') => {
    const idx = elements.findIndex((el) => el.id === id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= elements.length) return;

    const updated = [...elements];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);
    setElements(updated);
    setHasUnsavedChanges(true);
  };

  // Add new element
  const addElement = (type: CanvaElementType) => {
    const newId = `el-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    let newEl: CanvaElement;

    switch (type) {
      case 'heading':
        newEl = {
          id: newId,
          type: 'heading',
          pageIndex: currentPageIndex,
          text: 'New Section Heading',
          headingLevel: 2,
          textColor: '#1e293b',
          fontSize: '16px',
          bold: true,
          align: 'left',
        };
        break;
      case 'paragraph':
        newEl = {
          id: newId,
          type: 'paragraph',
          pageIndex: currentPageIndex,
          text: 'Type notes, specifications, or proposal paragraphs here. Click anytime to edit...',
          fontSize: '13px',
          textColor: '#111827',
          align: 'left',
        };
        break;
      case 'list':
        newEl = {
          id: newId,
          type: 'list',
          pageIndex: currentPageIndex,
          text: 'Important Notes / Checklist:',
          listType: 'bullet',
          listItems: [
            'All structural dimensions to be confirmed on site prior to casting.',
            'Quality test cubes to be cast for compressive strength verification.',
            'All safety helmets and protective equipment must be worn on site.',
          ],
        };
        break;
      case 'two-columns':
        newEl = {
          id: newId,
          type: 'two-columns',
          pageIndex: currentPageIndex,
          col1Title: 'Left Column Details',
          col1Text: 'Client details, site requirements, or scope description...',
          col2Title: 'Right Column Details',
          col2Text: 'Milestone dates, payment schedules, or commercial terms...',
        };
        break;
      case 'three-columns':
        newEl = {
          id: newId,
          type: 'three-columns',
          pageIndex: currentPageIndex,
          cols3: [
            { title: 'Foundation Stage', subtitle: 'Phase 1', value: 'Rs. 1,50,000' },
            { title: 'Superstructure Slab', subtitle: 'Phase 2', value: 'Rs. 2,20,000' },
            { title: 'Finishing & Handover', subtitle: 'Phase 3', value: 'Rs. 80,000' },
          ],
        };
        break;
      case 'scope-item':
        newEl = {
          id: newId,
          type: 'scope-item',
          pageIndex: currentPageIndex,
          itemNumber: `${elements.filter((e) => e.type === 'scope-item').length + 1}`,
          itemName: 'Itemized Work Scope Title',
          itemDescription: 'Specify materials, grade, application procedures, line and leveling...',
          qty: 100,
          unit: 'Sq.Ft',
          rate: 250,
          amount: 25000,
        };
        break;
      case 'total-box':
        newEl = {
          id: newId,
          type: 'total-box',
          pageIndex: currentPageIndex,
          subtotal: computedTotal || 100000,
          taxLabel: 'GST (18%)',
          taxAmount: Math.round((computedTotal || 100000) * 0.18),
          grandTotal: Math.round((computedTotal || 100000) * 1.18),
        };
        break;
      case 'callout':
        newEl = {
          id: newId,
          type: 'callout',
          pageIndex: currentPageIndex,
          text: 'Special Note / Instruction: All site works will be executed strictly in accordance with approved structural and architectural drawings.',
          bgColor: '#f5f3ff',
          borderColor: '#c4b5fd',
          textColor: '#5b21b6',
        };
        break;
      case 'signatures':
        newEl = {
          id: newId,
          type: 'signatures',
          pageIndex: currentPageIndex,
          leftSignTitle: 'Client Acceptance',
          leftSignSubtitle: 'Sign & Stamp Here',
          rightSignTitle: 'For Armee Enterprises Construction ERP',
          rightSignSubtitle: 'Authorized Signatory',
        };
        break;
      case 'divider':
        newEl = {
          id: newId,
          type: 'divider',
          pageIndex: currentPageIndex,
        };
        break;
      case 'image':
        newEl = {
          id: newId,
          type: 'image',
          pageIndex: currentPageIndex,
          imageUrl: '/letterhead.png',
          imageCaption: 'Official Company Stamp / Seal',
        };
        break;
      default:
        return;
    }

    setElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
    setHasUnsavedChanges(true);
    if (showToast) showToast(`Added ${type} block`, 'info');
  };

  // Add Page
  const handleAddPage = () => {
    const nextIdx = totalPages;
    setTotalPages(nextIdx + 1);
    setCurrentPageIndex(nextIdx);
    if (showToast) showToast(`Added Page ${nextIdx + 1}`, 'info');
  };

  // Delete current page
  const handleDeletePage = (pageIdx: number) => {
    if (totalPages <= 1) {
      if (showToast) showToast('Quotation must contain at least 1 page', 'error');
      return;
    }
    // Remove elements on this page and shift succeeding pages down
    setElements((prev) =>
      prev
        .filter((el) => el.pageIndex !== pageIdx)
        .map((el) => (el.pageIndex > pageIdx ? { ...el, pageIndex: el.pageIndex - 1 } : el))
    );
    setTotalPages((p) => p - 1);
    setCurrentPageIndex((curr) => Math.max(0, Math.min(curr, totalPages - 2)));
    setHasUnsavedChanges(true);
    if (showToast) showToast(`Removed Page ${pageIdx + 1}`, 'info');
  };

  // Letterhead toggle actions
  const handleSetBlankLetterhead = () => {
    setLetterheadImageUrl('');
    setLetterheadEnabled(false);
    setMarginTop(40);
    setHasUnsavedChanges(true);
    if (showToast) showToast('Set to clean blank page (no letterhead)', 'info');
  };

  const handleSetArmeeLetterhead = () => {
    setLetterheadImageUrl('/letterhead.png');
    setLetterheadEnabled(true);
    setMarginTop(185);
    setHasUnsavedChanges(true);
    if (showToast) showToast('Applied Armee Enterprises letterhead banner (/letterhead.png)', 'info');
  };

  const handleCustomLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLetterheadImageUrl(reader.result as string);
      setLetterheadEnabled(true);
      setMarginTop(185);
      setHasUnsavedChanges(true);
      if (showToast) showToast('Custom letterhead image loaded!', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Convert Elements into clean HTML + Embedded JSON for persistence
  const serializeToHtml = (): string => {
    const jsonComment = `<!-- CANVA_ELEMENTS_DATA:${JSON.stringify(elements)} -->`;
    return `${jsonComment}
<div class="canva-quotation-rendered" style="font-family: Inter, system-ui, sans-serif; color: #111827; line-height: 1.6;">
  ${elements
    .map((el) => {
      if (el.type === 'heading') {
        const tag = el.headingLevel === 1 ? 'h1' : el.headingLevel === 3 ? 'h3' : 'h2';
        return `<${tag} style="color: ${el.textColor || '#111827'}; font-size: ${el.fontSize || '18px'}; font-weight: ${el.bold ? 'bold' : 'normal'}; text-align: ${el.align || 'left'}; margin: 12px 0;">${el.text || ''}</${tag}>`;
      }
      if (el.type === 'paragraph') {
        return `<p style="color: ${el.textColor || '#111827'}; font-size: ${el.fontSize || '13px'}; text-align: ${el.align || 'left'}; white-space: pre-wrap; margin: 10px 0;">${el.text || ''}</p>`;
      }
      if (el.type === 'list') {
        const listTag = el.listType === 'number' ? 'ol' : 'ul';
        const items = (el.listItems || []).map((li) => `<li>${li}</li>`).join('');
        return `<div style="margin: 12px 0;"><b>${el.text || ''}</b><${listTag} style="padding-left: 20px; margin-top: 6px;">${items}</${listTag}></div>`;
      }
      if (el.type === 'two-columns') {
        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
              <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">${el.col1Title || ''}</div>
              <div style="font-size: 13px; color: #0f172a; white-space: pre-wrap; margin-top: 4px;">${el.col1Text || ''}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
              <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">${el.col2Title || ''}</div>
              <div style="font-size: 13px; color: #0f172a; white-space: pre-wrap; margin-top: 4px;">${el.col2Text || ''}</div>
            </div>
          </div>
        `;
      }
      if (el.type === 'scope-item') {
        return `
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin: 8px 0;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="font-weight: bold; font-size: 13px; color: #0f172a;">${el.itemNumber ? `${el.itemNumber}. ` : ''}${el.itemName || ''}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${el.itemDescription || ''}</div>
              </div>
              <div style="text-align: right; min-width: 140px;">
                <div style="font-size: 13px; font-weight: bold; color: #0f172a;">Rs. ${Number(el.amount || 0).toLocaleString('en-IN')}</div>
                <div style="font-size: 11px; color: #64748b;">${el.qty || 0} ${el.unit || ''} @ Rs. ${el.rate || 0}</div>
              </div>
            </div>
          </div>
        `;
      }
      if (el.type === 'total-box') {
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-weight: bold; margin: 12px 0;">
            <div>GRAND TOTAL (INCL. TAXES):</div>
            <div style="color: #653ef1; font-size: 16px;">Rs. ${Number(el.grandTotal || computedTotal).toLocaleString('en-IN')}</div>
          </div>
        `;
      }
      if (el.type === 'callout') {
        return `<div style="background: ${el.bgColor || '#f5f3ff'}; border-left: 4px solid ${el.borderColor || '#653ef1'}; padding: 10px 14px; border-radius: 6px; color: ${el.textColor || '#5b21b6'}; margin: 10px 0; font-size: 13px;">${el.text || ''}</div>`;
      }
      if (el.type === 'signatures') {
        return `
          <div style="display: flex; justify-content: space-between; margin-top: 36px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
            <div style="font-size: 11px; color: #64748b;">
              <div>${el.leftSignTitle || 'Client Sign'}</div>
              <div style="margin-top: 32px; border-top: 1px solid #94a3b8; width: 170px; padding-top: 4px;">${el.leftSignSubtitle || 'Authorized Signatory'}</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #334155;">
              <div>${el.rightSignTitle || 'Armee Enterprises'}</div>
              <div style="margin-top: 32px; border-top: 1px solid #653ef1; width: 170px; padding-top: 4px; color: #653ef1; font-weight: bold;">${el.rightSignSubtitle || 'Managing Director'}</div>
            </div>
          </div>
        `;
      }
      if (el.type === 'divider') {
        return `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 14px 0;" />`;
      }
      if (el.type === 'image' && el.imageUrl) {
        return `<div style="text-align: center; margin: 12px 0;"><img src="${el.imageUrl}" style="max-height: 120px; object-contain;" /><div style="font-size: 11px; color: #64748b;">${el.imageCaption || ''}</div></div>`;
      }
      return '';
    })
    .join('\n')}
</div>`;
  };

  // Save Quotation Handler
  const handleSave = async () => {
    setIsSaving(true);
    const serializedHtml = serializeToHtml();
    const finalAmount = computedTotal > 0 ? computedTotal : quotation.total_amount;

    const payload: Partial<QuotationRecord> = {
      title,
      quotation_number: quotationNumber,
      client_name: clientName || null,
      client_phone: clientPhone || null,
      client_email: clientEmail || null,
      client_address: clientAddress || null,
      project_id: projectId || null,
      project_name: projectName || null,
      quotation_date: quotationDate,
      valid_until: validUntil || null,
      status: status as any,
      total_amount: finalAmount,
      content_html: serializedHtml,
      letterhead_enabled: letterheadEnabled,
      letterhead_image_url: letterheadImageUrl,
      margin_top: marginTop,
      margin_bottom: marginBottom,
    };

    try {
      const updated = await updateQuotation(quotation.id, payload);
      setIsSaving(false);
      setHasUnsavedChanges(false);
      if (showToast) showToast('Quotation saved successfully!', 'success');
      if (onSaved && updated) onSaved(updated);
    } catch (err: any) {
      setIsSaving(false);
      if (showToast) showToast('Failed to save quotation: ' + err.message, 'error');
    }
  };

  // Export to Crisp High-Res A4 PDF using html2canvas & jspdf
  const exportToPdfBlob = async (): Promise<Blob | null> => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const pageNodes = document.querySelectorAll<HTMLElement>('.canva-a4-sheet');
      if (!pageNodes || pageNodes.length === 0) return null;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pageNodes.length; i++) {
        const pageEl = pageNodes[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2, // High resolution crisp print
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        if (i > 0) pdf.addPage('a4', 'p');
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      return pdf.output('blob');
    } catch (err) {
      console.error('PDF export failed:', err);
      return null;
    }
  };

  // Download PDF file
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    if (showToast) showToast('Generating high-resolution A4 PDF...', 'info');

    const blob = await exportToPdfBlob();
    setIsExportingPdf(false);

    if (blob) {
      const cleanDocNo = quotationNumber.replace(/[^a-zA-Z0-9.-]/g, '_');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanDocNo}_Quotation.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (showToast) showToast('PDF downloaded successfully!', 'success');
    } else {
      if (showToast) showToast('Failed to export PDF', 'error');
    }
  };

  // Print Quotation Handler
  const handlePrint = () => {
    setSelectedElementId(null);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = async () => {
    if (showToast) showToast('Preparing PDF for WhatsApp delivery...', 'info');
    setIsExportingPdf(true);

    let mediaUrl: string | undefined = undefined;
    const blob = await exportToPdfBlob();
    setIsExportingPdf(false);

    if (blob) {
      try {
        // Upload to Supabase Storage whatsapp_shares
        const cleanName = (quotationNumber || 'quotation').replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `whatsapp_shares/${Date.now()}_${cleanName}.pdf`;
        const { data: uploadRes, error: uploadErr } = await supabase.storage
          .from('project-documents')
          .upload(storagePath, blob, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (!uploadErr && uploadRes) {
          const { data: urlData } = supabase.storage
            .from('project-documents')
            .getPublicUrl(uploadRes.path);
          if (urlData?.publicUrl) {
            mediaUrl = urlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('WhatsApp PDF storage upload error:', err);
      }
    }

    setWhatsAppPayload({
      title: `${title} (${quotationNumber})`,
      documentNo: quotationNumber,
      category: 'Commercial Quotations',
      projectName: projectName || 'Construction Site',
      fileName: `${quotationNumber.replace(/[^a-zA-Z0-9.-]/g, '_')}_Quotation.pdf`,
      fileType: 'pdf',
      mediaUrl: mediaUrl || undefined,
      customSummary: [
        `📄 *COMMERCIAL QUOTATION*`,
        `🔖 Ref: *${quotationNumber}*`,
        `🏢 Site: *${projectName || 'Main Site'}*`,
        `👤 Client: *${clientName || 'Valued Client'}*`,
        `📅 Date: *${quotationDate}*`,
        `💰 Total Quoted: *Rs. ${Number(computedTotal).toLocaleString('en-IN')}*`,
        ``,
        `_Generated via Armee Enterprises Construction ERP Canva Builder_`,
      ].join('\n'),
    });
    setIsWhatsAppOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f7] flex flex-col font-sans select-none">
      {/* Hidden inputs */}
      <input
        type="file"
        ref={letterheadFileInputRef}
        onChange={handleCustomLetterheadUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={inlineImageInputRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f || !selectedElementId) return;
          const reader = new FileReader();
          reader.onload = () => {
            updateElement(selectedElementId, { imageUrl: reader.result as string });
          };
          reader.readAsDataURL(f);
        }}
        accept="image/*"
        className="hidden"
      />

      {/* 1. TOP MAIN HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Quotations List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-[#653ef1] border border-purple-100">
                {quotationNumber}
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="font-bold text-slate-800 text-sm md:text-base border-none hover:border-b hover:border-slate-300 focus:border-b focus:border-[#653ef1] focus:outline-hidden px-1 py-0.5 rounded-xs"
                placeholder="Quotation Title..."
              />
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
              )}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{projectName || 'No Project Linked'}</span>
              <span>•</span>
              <span>Client: <b>{clientName || 'General Client'}</b></span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">Total: Rs. {Number(computedTotal).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold mr-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-600 cursor-pointer"
            >
              -
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-700">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-600 cursor-pointer"
            >
              +
            </button>
          </div>

          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={isExportingPdf}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">WhatsApp</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-purple-200 bg-purple-50 text-[#653ef1] hover:bg-purple-100 transition-colors cursor-pointer"
            title="Export High-Resolution A4 PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Print"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Print</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#653ef1] hover:bg-[#542de3] text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Quotation'}</span>
          </button>
        </div>
      </header>

      {/* 2. CANVA CONTEXTUAL TOOLBAR (STYLES & ELEMENT CONTROLS) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs z-30">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick Insert Buttons */}
          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-slate-200">
            <button
              type="button"
              onClick={() => addElement('heading')}
              className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-[#653ef1] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Add Heading"
            >
              <Heading className="w-3 h-3" />
              <span>+ Heading</span>
            </button>
            <button
              type="button"
              onClick={() => addElement('paragraph')}
              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Add Text Block"
            >
              <Type className="w-3 h-3" />
              <span>+ Text</span>
            </button>
            <button
              type="button"
              onClick={() => addElement('scope-item')}
              className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Add Itemized Scope Card"
            >
              <Plus className="w-3 h-3" />
              <span>+ Scope Item</span>
            </button>
            <button
              type="button"
              onClick={() => addElement('list')}
              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Add Bullet / Numbered List"
            >
              <List className="w-3 h-3" />
              <span>+ List</span>
            </button>
            <button
              type="button"
              onClick={() => addElement('two-columns')}
              className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Add 2 Columns"
            >
              <Columns className="w-3 h-3" />
              <span>+ 2 Columns</span>
            </button>
          </div>

          {/* Contextual Element Styling */}
          {selectedElement ? (
            <div className="flex items-center gap-1.5 animate-fadeIn">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                {selectedElement.type.replace('-', ' ')}
              </span>

              {/* Font Family */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFontFamilyOpen(!isFontFamilyOpen)}
                  className="h-7 px-2 border border-slate-200 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                >
                  <span className="truncate max-w-[80px]">
                    {FONT_FAMILIES.find((f) => f.value === selectedElement.fontFamily)?.label || 'Font'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isFontFamilyOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50 min-w-[130px]">
                    {FONT_FAMILIES.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => {
                          updateElement(selectedElement.id, { fontFamily: f.value });
                          setIsFontFamilyOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-purple-50 text-slate-700 cursor-pointer"
                        style={{ fontFamily: f.value }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Font Size */}
              <div className="flex items-center border border-slate-200 rounded-md h-7 overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => {
                    const curr = parseInt(selectedElement.fontSize || '13px', 10);
                    updateElement(selectedElement.id, { fontSize: `${Math.max(10, curr - 1)}px` });
                  }}
                  className="px-1.5 h-full hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  -
                </button>
                <span className="px-1 text-xs font-mono text-slate-700 min-w-[32px] text-center">
                  {selectedElement.fontSize || '13px'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const curr = parseInt(selectedElement.fontSize || '13px', 10);
                    updateElement(selectedElement.id, { fontSize: `${Math.min(36, curr + 1)}px` });
                  }}
                  className="px-1.5 h-full hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Bold, Italic, Underline */}
              <button
                type="button"
                onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  selectedElement.bold ? 'bg-purple-100 text-[#653ef1] font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateElement(selectedElement.id, { italic: !selectedElement.italic })}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  selectedElement.italic ? 'bg-purple-100 text-[#653ef1]' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateElement(selectedElement.id, { underline: !selectedElement.underline })}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  selectedElement.underline ? 'bg-purple-100 text-[#653ef1]' : 'hover:bg-slate-100 text-slate-700'
                }`}
                title="Underline"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              {/* Text Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsColorPickerOpen(!isColorPickerOpen);
                    setIsBgPickerOpen(false);
                  }}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Text Color"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span
                    className="w-3 h-3 rounded-full border border-slate-300"
                    style={{ backgroundColor: selectedElement.textColor || '#111827' }}
                  />
                </button>
                {isColorPickerOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 flex gap-1">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          updateElement(selectedElement.id, { textColor: col });
                          setIsColorPickerOpen(false);
                        }}
                        className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Background Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsBgPickerOpen(!isBgPickerOpen);
                    setIsColorPickerOpen(false);
                  }}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Card Fill Color"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span
                    className="w-3 h-3 rounded-md border border-slate-300"
                    style={{ backgroundColor: selectedElement.bgColor || '#ffffff' }}
                  />
                </button>
                {isBgPickerOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 flex gap-1">
                    {BG_PRESET_COLORS.map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => {
                          updateElement(selectedElement.id, { bgColor: bg });
                          setIsBgPickerOpen(false);
                        }}
                        className="w-5 h-5 rounded-md border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: bg }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Alignments */}
              <div className="flex items-center border-l border-slate-200 pl-1.5 ml-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => updateElement(selectedElement.id, { align: 'left' })}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    selectedElement.align === 'left' ? 'bg-purple-100 text-[#653ef1]' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateElement(selectedElement.id, { align: 'center' })}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    selectedElement.align === 'center' ? 'bg-purple-100 text-[#653ef1]' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateElement(selectedElement.id, { align: 'right' })}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    selectedElement.align === 'right' ? 'bg-purple-100 text-[#653ef1]' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Element Position Order & Duplicate/Delete */}
              <div className="flex items-center border-l border-slate-200 pl-1.5 ml-1 gap-1">
                <button
                  type="button"
                  onClick={() => moveElement(selectedElement.id, 'up')}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Move Block Up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveElement(selectedElement.id, 'down')}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Move Block Down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateElement(selectedElement.id)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="Duplicate Block"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteElement(selectedElement.id)}
                  className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                  title="Delete Block"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">
              Click any block on the page to customize font, color, position, and layout
            </span>
          )}
        </div>

        {/* Right side drawer tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSidebarTab('elements')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeSidebarTab === 'elements' ? 'bg-[#653ef1] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Blocks
          </button>
          <button
            type="button"
            onClick={() => setActiveSidebarTab('letterhead')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeSidebarTab === 'letterhead' ? 'bg-[#653ef1] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Letterhead & Margins
          </button>
          <button
            type="button"
            onClick={() => setActiveSidebarTab('details')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeSidebarTab === 'details' ? 'bg-[#653ef1] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Details
          </button>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE WITH CANVA CANVAS & SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Elements / Tools Panel */}
        <div className="w-72 bg-white border-r border-slate-200 p-4 overflow-y-auto shrink-0 shadow-xs flex flex-col gap-4 print:hidden">
          {activeSidebarTab === 'elements' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Canva Block Library
                </span>
                <span className="text-[10px] text-[#653ef1] font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                  1-Click Insert
                </span>
              </div>

              {/* Elements Cards Grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addElement('heading')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <Heading className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">Heading</span>
                  <span className="text-[10px] text-slate-400">Section title</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('paragraph')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <Type className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">Text Box</span>
                  <span className="text-[10px] text-slate-400">Notes & intro</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('scope-item')}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/60 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs col-span-2"
                >
                  <Plus className="w-5 h-5 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-800">+ Work Scope / Rate Item</span>
                  <span className="text-[10px] text-emerald-600">Qty × Rate auto-calculating card</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('list')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <List className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">Bullet List</span>
                  <span className="text-[10px] text-slate-400">Terms & checklist</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('two-columns')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <Columns className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">2 Columns</span>
                  <span className="text-[10px] text-slate-400">Client / Ref details</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('three-columns')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <Layers className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">3 Columns</span>
                  <span className="text-[10px] text-slate-400">Phases / Timeline</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('total-box')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <DollarSign className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">Grand Total</span>
                  <span className="text-[10px] text-slate-400">Summary total bar</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('callout')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <Info className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">Notice Box</span>
                  <span className="text-[10px] text-slate-400">Highlighted warning</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('signatures')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs"
                >
                  <PenTool className="w-5 h-5 text-slate-600 group-hover:text-[#653ef1]" />
                  <span className="text-xs font-bold text-slate-800">Signatures</span>
                  <span className="text-[10px] text-slate-400">Approval & Seal</span>
                </button>

                <button
                  type="button"
                  onClick={() => addElement('divider')}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#653ef1] hover:bg-purple-50/50 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group shadow-2xs col-span-2"
                >
                  <span className="text-xs font-bold text-slate-800">— Divider Line</span>
                </button>
              </div>

              {/* Reset Template */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Load clean commercial quotation blocks? Any custom blocks will be reset.')) {
                      setElements(buildDefaultElements());
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Reset Standard Template</span>
                </button>
              </div>
            </div>
          )}

          {activeSidebarTab === 'letterhead' && (
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Letterhead & Margins
              </span>

              {/* Letterhead Switcher */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700">Choose Letterhead Mode:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSetBlankLetterhead}
                    className={`py-2 px-2 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                      !letterheadImageUrl
                        ? 'bg-purple-50 text-[#653ef1] border-[#653ef1]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>⬜ Blank Page</span>
                    <span className="text-[10px] font-normal text-slate-500">No header image</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSetArmeeLetterhead}
                    className={`py-2 px-2 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                      letterheadImageUrl === '/letterhead.png'
                        ? 'bg-purple-50 text-[#653ef1] border-[#653ef1]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🏢 Armee Header</span>
                    <span className="text-[10px] font-normal text-slate-500">Official logo banner</span>
                  </button>
                </div>

                {/* Upload Custom Letterhead */}
                <button
                  type="button"
                  onClick={() => letterheadFileInputRef.current?.click()}
                  className="w-full py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Custom Header Image</span>
                </button>
              </div>

              {/* Top Margin Slider */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Top Margin Clearance:</span>
                  <span className="font-mono font-bold text-[#653ef1]">{marginTop} px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="320"
                  value={marginTop}
                  onChange={(e) => {
                    setMarginTop(Number(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full accent-[#653ef1] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">
                  {letterheadImageUrl
                    ? 'Prevents quotation text from overlapping the logo and contact header.'
                    : 'Adjusts spacing from top of paper.'}
                </span>
              </div>

              {/* Guidelines Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="font-medium text-slate-700">Show Margin Guidelines</span>
                <input
                  type="checkbox"
                  checked={showGuidelines}
                  onChange={(e) => setShowGuidelines(e.target.checked)}
                  className="rounded text-[#653ef1] cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeSidebarTab === 'details' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quotation Metadata
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Quotation No *</label>
                <input
                  type="text"
                  value={quotationNumber}
                  onChange={(e) => {
                    setQuotationNumber(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:border-[#653ef1] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Client Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-semibold focus:border-[#653ef1] focus:outline-hidden"
                  placeholder="e.g. M/S Acme Infra"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Client Mobile / WhatsApp</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => {
                    setClientPhone(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs focus:border-[#653ef1] focus:outline-hidden"
                  placeholder="+91 99583 99157"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Project Site FK</label>
                <select
                  value={projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:border-[#653ef1] focus:outline-hidden"
                >
                  <option value="">-- No Project Linked --</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Quotation Date</label>
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(e) => {
                      setQuotationDate(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs focus:border-[#653ef1] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as any);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:border-[#653ef1] focus:outline-hidden"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Canva A4 Canvas Area */}
        <div
          ref={pagesContainerRef}
          className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center gap-8"
        >
          {Array.from({ length: totalPages }).map((_, pIdx) => {
            const pageElements = elements.filter((el) => el.pageIndex === pIdx);

            return (
              <div
                key={`canva-page-${pIdx}`}
                className="canva-a4-sheet relative bg-white shadow-2xl transition-transform origin-top rounded-xs border border-slate-300/60 print:shadow-none print:border-none"
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  minHeight: `${A4_HEIGHT_PX}px`,
                  transform: `scale(${zoomLevel / 100})`,
                  marginBottom: `${Math.max(40, (zoomLevel - 100) * 12)}px`,
                }}
                onClick={(e) => {
                  // Click canvas backdrop to deselect
                  if ((e.target as HTMLElement).classList.contains('canva-a4-sheet')) {
                    setSelectedElementId(null);
                  }
                }}
              >
                {/* Background Letterhead Layer */}
                {letterheadEnabled && letterheadImageUrl && (
                  <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                      backgroundImage: `url(${letterheadImageUrl})`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'top center',
                      opacity: 1,
                    }}
                  />
                )}

                {/* Top Protected Margin Guideline */}
                {showGuidelines && letterheadEnabled && letterheadImageUrl && (
                  <div
                    className="absolute left-0 right-0 top-0 pointer-events-none z-10 select-none print:hidden flex flex-col justify-end"
                    style={{ height: `${marginTop}px` }}
                  >
                    <div className="border-b-2 border-dashed border-purple-400/80 bg-purple-500/5 px-4 py-1 flex items-center justify-between text-[10px] text-purple-700 font-mono font-bold">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span>🛡️ Protected Letterhead Header Zone (Content Starts Below)</span>
                      </span>
                      <span>{marginTop}px</span>
                    </div>
                  </div>
                )}

                {/* Page Badge (Top Right) */}
                <div className="absolute top-2 right-3 text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded print:hidden z-10">
                  Page {pIdx + 1} of {totalPages}
                </div>

                {/* Elements Flow Container */}
                <div
                  className="relative z-20 min-h-full flex flex-col gap-2.5"
                  style={{
                    paddingTop: `${marginTop}px`,
                    paddingBottom: `${marginBottom}px`,
                    paddingLeft: '48px',
                    paddingRight: '48px',
                  }}
                >
                  {pageElements.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl my-4">
                      <p className="text-sm font-semibold">Page {pIdx + 1} is empty</p>
                      <p className="text-xs mt-1">Click blocks from the left sidebar to add content</p>
                    </div>
                  ) : (
                    pageElements.map((el) => {
                      const isSelected = selectedElementId === el.id;

                      return (
                        <div
                          key={el.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElementId(el.id);
                          }}
                          className={`relative rounded-lg transition-all group ${
                            isSelected
                              ? 'ring-2 ring-[#653ef1] shadow-xs'
                              : 'hover:ring-1 hover:ring-purple-300'
                          }`}
                          style={{
                            backgroundColor: el.bgColor || 'transparent',
                            fontFamily: el.fontFamily || 'Inter, system-ui, sans-serif',
                          }}
                        >
                          {/* Element Canva Selection Quick Controls */}
                          {isSelected && (
                            <div className="absolute -top-7 right-2 flex items-center gap-1 bg-[#653ef1] text-white px-2 py-0.5 rounded-md shadow-md text-[10px] font-bold z-30 print:hidden animate-fadeIn">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveElement(el.id, 'up');
                                }}
                                className="hover:text-purple-200 cursor-pointer"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveElement(el.id, 'down');
                                }}
                                className="hover:text-purple-200 cursor-pointer"
                                title="Move Down"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateElement(el.id);
                                }}
                                className="hover:text-purple-200 cursor-pointer ml-1"
                                title="Duplicate"
                              >
                                📋
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteElement(el.id);
                                }}
                                className="hover:text-red-200 text-red-300 cursor-pointer ml-1"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {/* 1. HEADING */}
                          {el.type === 'heading' && (
                            <input
                              type="text"
                              value={el.text || ''}
                              onChange={(e) => updateElement(el.id, { text: e.target.value })}
                              className="w-full bg-transparent border-none focus:outline-hidden font-bold py-1 px-1.5 rounded"
                              style={{
                                color: el.textColor || '#111827',
                                fontSize: el.fontSize || (el.headingLevel === 1 ? '22px' : '16px'),
                                fontWeight: el.bold !== false ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal',
                                textDecoration: el.underline ? 'underline' : 'none',
                                textAlign: el.align || 'left',
                              }}
                              placeholder="Type Heading..."
                            />
                          )}

                          {/* 2. PARAGRAPH / TEXT */}
                          {el.type === 'paragraph' && (
                            <textarea
                              rows={Math.max(2, (el.text || '').split('\n').length)}
                              value={el.text || ''}
                              onChange={(e) => updateElement(el.id, { text: e.target.value })}
                              className="w-full bg-transparent border-none focus:outline-hidden py-1 px-1.5 rounded resize-none leading-relaxed"
                              style={{
                                color: el.textColor || '#111827',
                                fontSize: el.fontSize || '13px',
                                fontWeight: el.bold ? 'bold' : 'normal',
                                fontStyle: el.italic ? 'italic' : 'normal',
                                textDecoration: el.underline ? 'underline' : 'none',
                                textAlign: el.align || 'left',
                              }}
                              placeholder="Type paragraph or notes here..."
                            />
                          )}

                          {/* 3. LIST BLOCK */}
                          {el.type === 'list' && (
                            <div className="p-2 flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={el.text || ''}
                                onChange={(e) => updateElement(el.id, { text: e.target.value })}
                                className="font-bold text-xs text-slate-800 bg-transparent border-none focus:outline-hidden"
                                placeholder="List Title..."
                              />
                              <div className="flex flex-col gap-1 pl-2">
                                {(el.listItems || []).map((item, liIdx) => (
                                  <div key={liIdx} className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#653ef1] w-4 text-center">
                                      {el.listType === 'number' ? `${liIdx + 1}.` : '•'}
                                    </span>
                                    <input
                                      type="text"
                                      value={item}
                                      onChange={(e) => {
                                        const updated = [...(el.listItems || [])];
                                        updated[liIdx] = e.target.value;
                                        updateElement(el.id, { listItems: updated });
                                      }}
                                      className="flex-1 text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#653ef1] focus:outline-hidden py-0.5"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (el.listItems || []).filter((_, i) => i !== liIdx);
                                        updateElement(el.id, { listItems: updated });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs px-1"
                                      title="Remove item"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(el.listItems || []), 'New list requirement...'];
                                    updateElement(el.id, { listItems: updated });
                                  }}
                                  className="text-[11px] font-semibold text-[#653ef1] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                                >
                                  + Add Item
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 4. TWO COLUMNS */}
                          {el.type === 'two-columns' && (
                            <div className="grid grid-cols-2 gap-3 p-1">
                              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-3 flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={el.col1Title || ''}
                                  onChange={(e) => updateElement(el.id, { col1Title: e.target.value })}
                                  className="text-[11px] font-bold uppercase text-slate-500 bg-transparent border-none focus:outline-hidden"
                                  placeholder="Column 1 Title"
                                />
                                <textarea
                                  rows={3}
                                  value={el.col1Text || ''}
                                  onChange={(e) => updateElement(el.id, { col1Text: e.target.value })}
                                  className="text-xs text-slate-800 bg-transparent border-none focus:outline-hidden resize-none leading-relaxed"
                                  placeholder="Type left column content..."
                                />
                              </div>

                              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-3 flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={el.col2Title || ''}
                                  onChange={(e) => updateElement(el.id, { col2Title: e.target.value })}
                                  className="text-[11px] font-bold uppercase text-slate-500 bg-transparent border-none focus:outline-hidden"
                                  placeholder="Column 2 Title"
                                />
                                <textarea
                                  rows={3}
                                  value={el.col2Text || ''}
                                  onChange={(e) => updateElement(el.id, { col2Text: e.target.value })}
                                  className="text-xs text-slate-800 bg-transparent border-none focus:outline-hidden resize-none leading-relaxed"
                                  placeholder="Type right column content..."
                                />
                              </div>
                            </div>
                          )}

                          {/* 5. THREE COLUMNS */}
                          {el.type === 'three-columns' && (
                            <div className="grid grid-cols-3 gap-2 p-1">
                              {(el.cols3 || []).map((col, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1 text-center"
                                >
                                  <input
                                    type="text"
                                    value={col.title}
                                    onChange={(e) => {
                                      const updated = [...(el.cols3 || [])];
                                      updated[cIdx].title = e.target.value;
                                      updateElement(el.id, { cols3: updated });
                                    }}
                                    className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-hidden text-center"
                                    placeholder="Stage"
                                  />
                                  <input
                                    type="text"
                                    value={col.subtitle}
                                    onChange={(e) => {
                                      const updated = [...(el.cols3 || [])];
                                      updated[cIdx].subtitle = e.target.value;
                                      updateElement(el.id, { cols3: updated });
                                    }}
                                    className="text-[10px] text-slate-500 bg-transparent border-none focus:outline-hidden text-center"
                                    placeholder="Phase"
                                  />
                                  <input
                                    type="text"
                                    value={col.value}
                                    onChange={(e) => {
                                      const updated = [...(el.cols3 || [])];
                                      updated[cIdx].value = e.target.value;
                                      updateElement(el.id, { cols3: updated });
                                    }}
                                    className="text-xs font-bold text-[#653ef1] bg-transparent border-none focus:outline-hidden text-center"
                                    placeholder="Amount"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 6. SCOPE ITEM / RATE CARD */}
                          {el.type === 'scope-item' && (
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs hover:border-slate-300 transition-colors flex items-start justify-between gap-3">
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={el.itemNumber || ''}
                                    onChange={(e) => updateElement(el.id, { itemNumber: e.target.value })}
                                    className="w-7 text-xs font-bold text-slate-400 bg-transparent border-none focus:outline-hidden"
                                    placeholder="#"
                                  />
                                  <input
                                    type="text"
                                    value={el.itemName || ''}
                                    onChange={(e) => updateElement(el.id, { itemName: e.target.value })}
                                    className="flex-1 text-xs font-bold text-slate-900 bg-transparent border-none focus:outline-hidden"
                                    placeholder="Item Title (e.g. RCC Column Works)"
                                  />
                                </div>
                                <textarea
                                  rows={2}
                                  value={el.itemDescription || ''}
                                  onChange={(e) => updateElement(el.id, { itemDescription: e.target.value })}
                                  className="text-xs text-slate-500 bg-transparent border-none focus:outline-hidden resize-none pl-9 leading-relaxed"
                                  placeholder="Scope specifications, grades, and details..."
                                />
                              </div>

                              {/* Rates & Calculated Amount */}
                              <div className="flex flex-col items-end gap-1 shrink-0 bg-slate-50 p-2 rounded-lg border border-slate-100 min-w-[150px]">
                                <div className="text-xs font-bold text-slate-900">
                                  Rs. {Number(el.amount || 0).toLocaleString('en-IN')}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <input
                                    type="number"
                                    value={el.qty ?? 0}
                                    onChange={(e) => updateElement(el.id, { qty: Number(e.target.value) })}
                                    className="w-14 text-right bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-semibold focus:outline-hidden"
                                  />
                                  <input
                                    type="text"
                                    value={el.unit || ''}
                                    onChange={(e) => updateElement(el.id, { unit: e.target.value })}
                                    className="w-12 text-center bg-white border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-hidden"
                                    placeholder="Sq.Ft"
                                  />
                                  <span>@</span>
                                  <input
                                    type="number"
                                    value={el.rate ?? 0}
                                    onChange={(e) => updateElement(el.id, { rate: Number(e.target.value) })}
                                    className="w-16 text-right bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-semibold focus:outline-hidden"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 7. GRAND TOTAL SUMMARY BOX */}
                          {el.type === 'total-box' && (
                            <div className="bg-[#f8fafc] border border-slate-300 rounded-lg p-3 flex items-center justify-between text-xs font-bold my-1">
                              <div>
                                <span className="text-slate-800">GRAND TOTAL (INCL. TAXES):</span>
                                <span className="text-[10px] text-slate-400 font-normal ml-2">
                                  (Auto calculated from scope items)
                                </span>
                              </div>
                              <div className="text-base font-bold text-[#653ef1]">
                                Rs. {Number(computedTotal).toLocaleString('en-IN')}
                              </div>
                            </div>
                          )}

                          {/* 8. CALLOUT / NOTICE BOX */}
                          {el.type === 'callout' && (
                            <div
                              className="p-3 rounded-lg border-l-4 flex items-start gap-2 text-xs"
                              style={{
                                backgroundColor: el.bgColor || '#f5f3ff',
                                borderColor: el.borderColor || '#653ef1',
                                color: el.textColor || '#5b21b6',
                              }}
                            >
                              <Info className="w-4 h-4 shrink-0 mt-0.5" />
                              <textarea
                                rows={2}
                                value={el.text || ''}
                                onChange={(e) => updateElement(el.id, { text: e.target.value })}
                                className="w-full bg-transparent border-none focus:outline-hidden resize-none leading-relaxed"
                                placeholder="Important terms or notice..."
                              />
                            </div>
                          )}

                          {/* 9. SIGNATURES & STAMPS */}
                          {el.type === 'signatures' && (
                            <div className="flex justify-between items-end mt-8 pt-4 border-t border-dashed border-slate-300 px-2">
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={el.leftSignTitle || ''}
                                  onChange={(e) => updateElement(el.id, { leftSignTitle: e.target.value })}
                                  className="text-xs font-semibold text-slate-600 bg-transparent border-none focus:outline-hidden"
                                  placeholder="Client Signatory"
                                />
                                <div className="mt-8 border-t border-slate-400 w-44 pt-1">
                                  <input
                                    type="text"
                                    value={el.leftSignSubtitle || ''}
                                    onChange={(e) => updateElement(el.id, { leftSignSubtitle: e.target.value })}
                                    className="text-[11px] text-slate-500 bg-transparent border-none focus:outline-hidden"
                                    placeholder="Sign & Stamp Here"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <input
                                  type="text"
                                  value={el.rightSignTitle || ''}
                                  onChange={(e) => updateElement(el.id, { rightSignTitle: e.target.value })}
                                  className="text-xs font-semibold text-slate-700 bg-transparent border-none focus:outline-hidden text-right"
                                  placeholder="Company Name"
                                />
                                <div className="mt-8 border-t-2 border-[#653ef1] w-48 pt-1 text-right">
                                  <input
                                    type="text"
                                    value={el.rightSignSubtitle || ''}
                                    onChange={(e) => updateElement(el.id, { rightSignSubtitle: e.target.value })}
                                    className="text-[11px] font-bold text-[#653ef1] bg-transparent border-none focus:outline-hidden text-right"
                                    placeholder="Managing Director"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 10. DIVIDER LINE */}
                          {el.type === 'divider' && (
                            <div className="py-2">
                              <hr className="border-t border-slate-200" />
                            </div>
                          )}

                          {/* 11. IMAGE / STAMP */}
                          {el.type === 'image' && (
                            <div className="flex flex-col items-center justify-center p-2">
                              {el.imageUrl ? (
                                <img
                                  src={el.imageUrl}
                                  alt="Attached"
                                  className="max-h-24 object-contain rounded"
                                />
                              ) : (
                                <div className="w-32 h-20 border border-dashed border-slate-300 rounded flex items-center justify-center text-xs text-slate-400">
                                  No Image
                                </div>
                              )}
                              <input
                                type="text"
                                value={el.imageCaption || ''}
                                onChange={(e) => updateElement(el.id, { imageCaption: e.target.value })}
                                className="text-[11px] text-slate-500 text-center mt-1 bg-transparent border-none focus:outline-hidden"
                                placeholder="Caption or Stamp label"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {/* Add / Manage Pages Bar */}
          <div className="flex items-center gap-3 print:hidden py-4">
            <button
              type="button"
              onClick={handleAddPage}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-[#653ef1] hover:text-[#653ef1] text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New A4 Page</span>
            </button>
            {totalPages > 1 && (
              <button
                type="button"
                onClick={() => handleDeletePage(totalPages - 1)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-red-400 hover:text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Last Page</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. WHATSAPP SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setWhatsAppPayload(null);
        }}
        payload={whatsAppPayload}
        onSuccessToast={(msg) => {
          if (showToast) showToast(msg, 'success');
        }}
      />

      {/* 5. PRINT STYLES */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header,
          .canva-a4-sheet ~ div,
          button,
          .print\\:hidden {
            display: none !important;
          }
          .canva-a4-sheet {
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            width: 100% !important;
            margin: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
