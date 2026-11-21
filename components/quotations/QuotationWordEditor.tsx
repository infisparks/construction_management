'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Printer,
  MessageCircle,
  FileText,
  Sliders,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Sparkles,
  Settings,
  Upload,
  ChevronDown,
  Palette,
  Highlighter,
  Plus,
  Trash2,
  Columns,
  Layers,
  FilePlus,
  ShieldCheck,
  SplitSquareVertical,
  Box,
  Heading,
  Check
} from 'lucide-react';
import {
  QuotationRecord,
  updateQuotation,
  getDefaultQuotationTemplate
} from '@/lib/supabase/quotations-services';
import { WhatsAppShareModal, WhatsAppSharePayload } from '@/components/whatsapp/WhatsAppShareModal';

interface QuotationWordEditorProps {
  quotation: QuotationRecord;
  availableProjects?: { id: string; name: string }[];
  userEmail?: string;
  onBack: () => void;
  onSaved?: (updated: QuotationRecord) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Inter (Modern)', value: 'Inter, system-ui, -apple-system, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New (Fixed)', value: '"Courier New", Courier, monospace' },
];

const FONT_SIZES = [
  { label: '10px (Small)', value: '10px' },
  { label: '11px', value: '11px' },
  { label: '12px (Compact)', value: '12px' },
  { label: '13px (Default)', value: '13px' },
  { label: '14px (Standard)', value: '14px' },
  { label: '16px (Medium)', value: '16px' },
  { label: '18px (Subhead)', value: '18px' },
  { label: '20px (Heading)', value: '20px' },
  { label: '24px (Title)', value: '24px' },
  { label: '28px (Large)', value: '28px' },
];

const TEXT_COLORS = [
  { label: 'Default Charcoal', value: '#111827' },
  { label: 'Armee Purple', value: '#653ef1' },
  { label: 'Navy Blue', value: '#1e3a8a' },
  { label: 'Forest Green', value: '#166534' },
  { label: 'Crimson Red', value: '#b91c1c' },
  { label: 'Amber Orange', value: '#d97706' },
  { label: 'Slate Gray', value: '#4b5563' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'Soft Yellow', value: '#fef08a' },
  { label: 'Soft Purple', value: '#ede9fe' },
  { label: 'Soft Green', value: '#dcfce7' },
  { label: 'Soft Blue', value: '#e0f2fe' },
  { label: 'Soft Pink', value: '#fce7f3' },
];

// Standard A4 Dimensions at 96 DPI
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
  // Metadata state
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
  const [totalAmount, setTotalAmount] = useState<number>(quotation.total_amount || 0);

  // Letterhead & Margins (Default blank if not set, or 185px if letterhead attached)
  const [letterheadEnabled, setLetterheadEnabled] = useState(
    quotation.letterhead_enabled ?? Boolean(quotation.letterhead_image_url)
  );
  const [letterheadImageUrl, setLetterheadImageUrl] = useState(
    quotation.letterhead_image_url || ''
  );
  const [marginTop, setMarginTop] = useState(
    quotation.margin_top ?? (quotation.letterhead_image_url ? 185 : 40)
  );
  const [marginBottom, setMarginBottom] = useState(quotation.margin_bottom ?? 80);
  const [marginLeft, setMarginLeft] = useState(quotation.margin_left ?? 48);
  const [marginRight, setMarginRight] = useState(quotation.margin_right ?? 48);
  const [showGuidelines, setShowGuidelines] = useState(true);

  // Editor states
  const [activeFont, setActiveFont] = useState('Inter, system-ui, -apple-system, sans-serif');
  const [activeSize, setActiveSize] = useState('13px');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isMarginsDrawerOpen, setIsMarginsDrawerOpen] = useState(false);
  const [isMetaDrawerOpen, setIsMetaDrawerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Dropdown menus states (Click-to-open, won't hide on hover or lose selection)
  const [isInsertBlockOpen, setIsInsertBlockOpen] = useState(false);
  const [isTextColorOpen, setIsTextColorOpen] = useState(false);
  const [isHighlightColorOpen, setIsHighlightColorOpen] = useState(false);
  const [isFontFamilyOpen, setIsFontFamilyOpen] = useState(false);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);

  // Multi-page detection
  const [pageCount, setPageCount] = useState<number>(1);

  // WhatsApp Share Modal
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppPayload, setWhatsAppPayload] = useState<WhatsAppSharePayload | null>(null);

  // References
  const editorRef = useRef<HTMLDivElement>(null);
  const letterheadFileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Save current text selection
  const saveSelection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Restore saved text selection
  const restoreSelection = useCallback(() => {
    if (typeof window === 'undefined' || !savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.insert-block-container')) {
        setIsInsertBlockOpen(false);
      }
      if (!target.closest('.text-color-container')) {
        setIsTextColorOpen(false);
      }
      if (!target.closest('.highlight-color-container')) {
        setIsHighlightColorOpen(false);
      }
      if (!target.closest('.font-family-container')) {
        setIsFontFamilyOpen(false);
      }
      if (!target.closest('.font-size-container')) {
        setIsFontSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate pages
  const checkEditorContent = useCallback(() => {
    if (!editorRef.current) return;
    const scrollH = editorRef.current.scrollHeight;
    const printableHeight = A4_HEIGHT_PX - marginTop - marginBottom;
    const computedPages = Math.max(1, Math.ceil(scrollH / Math.max(100, printableHeight)));
    setPageCount(computedPages);
  }, [marginTop, marginBottom]);

  // Initialize editor content once mounted
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML =
        quotation.content_html ||
        getDefaultQuotationTemplate({
          quotationNumber,
          date: quotationDate,
          clientName,
          clientPhone,
          projectName,
          title,
        });
      checkEditorContent();
    }
  }, []);

  // Check content on resize or edit
  useEffect(() => {
    checkEditorContent();
  }, [marginTop, marginBottom, checkEditorContent]);

  // Sync project name when project selection changes
  const handleProjectSelect = (pId: string) => {
    setProjectId(pId);
    const found = availableProjects.find((p) => p.id === pId);
    if (found) {
      setProjectName(found.name);
    } else {
      setProjectName('');
    }
    setHasUnsavedChanges(true);
  };

  // Execute formatting command on contentEditable preserving selection
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (typeof document === 'undefined') return;
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {}
    document.execCommand(command, false, value);
    saveSelection();
    setHasUnsavedChanges(true);
    checkEditorContent();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Apply custom font size to selected text only
  const applyFontSize = (sizeStr: string) => {
    setActiveSize(sizeStr);
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      if (editorRef.current) editorRef.current.focus();
      return;
    }

    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontSize', false, '7');
      if (editorRef.current) {
        const fontTags = editorRef.current.querySelectorAll(
          'font[size="7"], span[style*="font-size: -webkit-xxx-large"], span[style*="font-size: xxx-large"]'
        );
        fontTags.forEach((el) => {
          const span = document.createElement('span');
          span.style.fontSize = sizeStr;
          span.innerHTML = el.innerHTML;
          el.parentNode?.replaceChild(span, el);
        });
      }
    } catch (err) {
      try {
        const span = document.createElement('span');
        span.style.fontSize = sizeStr;
        span.appendChild(range.extractContents());
        range.insertNode(span);
      } catch {}
    }

    saveSelection();
    setHasUnsavedChanges(true);
    checkEditorContent();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Apply font family to selected text
  const applyFontFamily = (familyStr: string) => {
    setActiveFont(familyStr);
    restoreSelection();
    executeCommand('fontName', familyStr);
  };

  // Apply text color to selected text only
  const applyTextColor = (colorStr: string) => {
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {}
    document.execCommand('foreColor', false, colorStr);
    saveSelection();
    setIsTextColorOpen(false);
    setHasUnsavedChanges(true);
    checkEditorContent();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Apply highlight background to selected text only
  const applyHighlightColor = (colorStr: string) => {
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {}
    document.execCommand('hiliteColor', false, colorStr);
    saveSelection();
    setIsHighlightColorOpen(false);
    setHasUnsavedChanges(true);
    checkEditorContent();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Clean and parse text pasted from ChatGPT or external rich sources
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    let htmlData = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');

    if (htmlData) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlData;

      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          htmlEl.style.backgroundColor = '';
          htmlEl.style.background = '';
          if (
            htmlEl.style.color &&
            (htmlEl.style.color.includes('55, 65, 81') ||
              htmlEl.style.color.includes('209, 213, 219') ||
              htmlEl.style.color.includes('rgb(13, 13, 13)'))
          ) {
            htmlEl.style.color = '';
          }
          htmlEl.style.fontFamily = '';
        }
      });

      const cleanHtml = tempDiv.innerHTML;
      executeCommand('insertHTML', cleanHtml);
    } else if (plainText) {
      let formatted = plainText
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ')) {
            return `<h3 style="font-size: 15px; font-weight: bold; margin: 10px 0 4px 0; color: #1e293b;">${trimmed.slice(4)}</h3>`;
          }
          if (trimmed.startsWith('## ')) {
            return `<h2 style="font-size: 16px; font-weight: bold; margin: 12px 0 6px 0; color: #1e293b;">${trimmed.slice(3)}</h2>`;
          }
          if (trimmed.startsWith('# ')) {
            return `<h1 style="font-size: 18px; font-weight: bold; margin: 14px 0 8px 0; color: #653ef1;">${trimmed.slice(2)}</h1>`;
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return `<li style="margin-bottom: 3px;">${trimmed.slice(2)}</li>`;
          }
          if (/^\d+\.\s/.test(trimmed)) {
            return `<li style="margin-bottom: 3px;">${trimmed.replace(/^\d+\.\s/, '')}</li>`;
          }
          if (trimmed === '') {
            return '<p style="margin: 8px 0;"><br/></p>';
          }
          return `<p style="margin: 8px 0; font-size: 13px; line-height: 1.6; color: #111827;">${line}</p>`;
        })
        .join('');

      executeCommand('insertHTML', formatted);
    }
    setHasUnsavedChanges(true);
    checkEditorContent();
  };

  // ==========================================
  // BLOCK INSERTION OPERATIONS (NO COMPLEX TABLES)
  // ==========================================

  // 1. Insert Standard Text Paragraph (Write one above another)
  const insertTextParagraph = () => {
    const html = `<p style="margin: 10px 0; font-size: ${activeSize}; line-height: 1.6; color: #111827;">Click here to type notes, project details, or specifications...</p>`;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    if (showToast) showToast('Inserted text paragraph', 'info');
  };

  // 2. Insert Section Heading
  const insertSectionHeading = () => {
    const html = `<h2 style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 16px 0 6px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">New Section Heading</h2><p style="margin: 8px 0;"><br/></p>`;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    if (showToast) showToast('Inserted section heading', 'info');
  };

  // 3. Insert 2 Columns Side-by-Side Block
  const insertTwoColumns = () => {
    const html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Column 1 Details</div>
          <div style="font-size: 13px; color: #0f172a; line-height: 1.5;">Type left column text, customer details, or scope here...</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Column 2 Details</div>
          <div style="font-size: 13px; color: #0f172a; line-height: 1.5;">Type right column text, commercial terms, or dates here...</div>
        </div>
      </div>
      <p style="margin: 8px 0;"><br/></p>
    `;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    if (showToast) showToast('Inserted 2 Columns layout', 'success');
  };

  // 4. Insert 3 Columns Side-by-Side Block
  const insertThreeColumns = () => {
    const html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 14px 0;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">Phase / Milestone</div>
          <div style="font-size: 12px; color: #0f172a;">Phase 1: Foundation</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">Timeline</div>
          <div style="font-size: 12px; color: #0f172a;">30 Working Days</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">Payment Value</div>
          <div style="font-size: 12px; font-weight: bold; color: #653ef1;">Rs. 1,50,000</div>
        </div>
      </div>
      <p style="margin: 8px 0;"><br/></p>
    `;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    if (showToast) showToast('Inserted 3 Columns layout', 'success');
  };

  // 5. Insert Itemized Work Scope Card (Stacked One Above Another)
  const insertScopeItemCard = () => {
    const html = `
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin: 10px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: bold; font-size: 13px; color: #0f172a;">Item Scope Description (Click to Edit)</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Specify material specifications, labor scope, and standards...</div>
          </div>
          <div style="text-align: right; min-width: 140px;">
            <div style="font-size: 13px; font-weight: bold; color: #0f172a;">Rs. 50,000</div>
            <div style="font-size: 11px; color: #64748b;">100 Sq.Ft @ Rs. 500/Sq.Ft</div>
          </div>
        </div>
      </div>
      <p style="margin: 8px 0;"><br/></p>
    `;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    if (showToast) showToast('Inserted Item Scope Card', 'success');
  };

  // 6. Insert Callout Highlight Box
  const insertCalloutBox = () => {
    const html = `
      <div style="background-color: #f5f3ff; border-left: 4px solid #653ef1; border-radius: 6px; padding: 12px 16px; margin: 14px 0; font-size: 12px; color: #374151;">
        <div style="font-weight: bold; color: #653ef1; margin-bottom: 4px;">
          <span>💡 Important Project Note:</span>
        </div>
        <p style="margin: 0; line-height: 1.5;">Type critical terms, scope limitations, or timeline milestones here...</p>
      </div>
      <p style="margin: 8px 0;"><br/></p>
    `;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    if (showToast) showToast('Inserted Note / Callout Box', 'info');
  };

  // 7. Insert Signature & Approval Block
  const insertSignatureBlock = () => {
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
        <div style="color: #64748b;">
          <div><b>Client Acceptance & Approval:</b></div>
          <div style="margin-top: 35px; border-top: 1px solid #94a3b8; width: 180px; padding-top: 4px;">Authorized Signatory / Seal</div>
        </div>
        <div style="text-align: right; color: #334155;">
          <div>For <b>${projectName || 'Armee Enterprises'}</b></div>
          <div style="margin-top: 35px; border-top: 1px solid #653ef1; width: 180px; padding-top: 4px; font-weight: bold; color: #653ef1;">Managing Director / Commercial</div>
        </div>
      </div>
      <p style="margin: 8px 0;"><br/></p>
    `;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    if (showToast) showToast('Inserted Signatures Block', 'info');
  };

  // 8. Insert Manual Page Break
  const insertManualPageBreak = () => {
    const html = `
      <div class="print-page-break" style="page-break-before: always; margin: 32px 0 20px 0; border-top: 2px dashed #a855f7; position: relative; text-align: center;">
        <span style="background-color: #faf5ff; border: 1px solid #d8b4fe; color: #7e22ce; font-size: 10px; font-weight: bold; padding: 2px 10px; border-radius: 9999px; position: relative; top: -11px; text-transform: uppercase; letter-spacing: 0.5px;">
          📄 Page Break (New A4 Page Continues Below)
        </span>
      </div>
      <p style="margin: 8px 0;"><br/></p>
    `;
    executeCommand('insertHTML', html);
    setIsInsertBlockOpen(false);
    checkEditorContent();
    if (showToast) showToast('Inserted Page Break', 'info');
  };

  // Insert Inline Image / Stamp / Signature
  const handleInsertInlineImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      const imgHtml = `<p style="margin: 10px 0;"><img src="${b64}" alt="Document Image" style="max-width: 240px; height: auto; border-radius: 4px; border: 1px solid #e2e8f0; padding: 4px; background: white;" /></p><p style="margin: 8px 0;"><br/></p>`;
      executeCommand('insertHTML', imgHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setIsInsertBlockOpen(false);
  };

  // Handle Custom Letterhead Upload
  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setLetterheadImageUrl(b64);
      setLetterheadEnabled(true);
      setHasUnsavedChanges(true);
      if (showToast) showToast('Custom letterhead background loaded!', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Set to clean blank page (no letterhead)
  const handleSetBlankLetterhead = () => {
    setLetterheadImageUrl('');
    setLetterheadEnabled(false);
    setMarginTop(40);
    setHasUnsavedChanges(true);
    if (showToast) showToast('Set to clean blank page (no letterhead)', 'info');
  };

  // Reset to default /letterhead.png
  const handleResetDefaultLetterhead = () => {
    setLetterheadImageUrl('/letterhead.png');
    setLetterheadEnabled(true);
    setMarginTop(185);
    setHasUnsavedChanges(true);
    if (showToast) showToast('Reset to default Armee letterhead (/letterhead.png)', 'info');
  };

  // Save Quotation Handler
  const handleSave = async () => {
    setIsSaving(true);
    const content = editorRef.current?.innerHTML || '';

    // Auto calculate total amount if grand total exists
    let calculatedAmount = totalAmount;
    try {
      const matchGrand = content.match(/GRAND TOTAL[^:]*:[^<]*<b>Rs\.\s*([\d,]+)<\/b>/i) ||
                         content.match(/GRAND TOTAL[^:]*:[^<]*Rs\.\s*([\d,]+)/i);
      if (matchGrand && matchGrand[1]) {
        calculatedAmount = parseFloat(matchGrand[1].replace(/,/g, ''));
      }
    } catch {}

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
      total_amount: calculatedAmount,
      content_html: content,
      letterhead_enabled: letterheadEnabled,
      letterhead_image_url: letterheadImageUrl,
      margin_top: marginTop,
      margin_bottom: marginBottom,
      margin_left: marginLeft,
      margin_right: marginRight,
      created_by_email: userEmail || quotation.created_by_email,
    };

    try {
      const updated = await updateQuotation(quotation.id, payload);
      setIsSaving(false);
      setHasUnsavedChanges(false);
      if (showToast) {
        showToast(`Quotation "${quotationNumber}" saved successfully!`, 'success');
      }
      if (onSaved && updated) {
        onSaved(updated);
      }
    } catch (err: any) {
      setIsSaving(false);
      if (showToast) {
        showToast('Failed to save quotation: ' + err.message, 'error');
      }
    }
  };

  // Print Handler: invokes window.print()
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share Trigger
  const handleShareWhatsApp = () => {
    setWhatsAppPayload({
      title: `${title} (${quotationNumber})`,
      documentNo: quotationNumber,
      category: 'Quotations & Estimates',
      projectName: projectName || 'Site',
      customSummary: [
        `📄 *COMMERCIAL QUOTATION*`,
        `🔖 Ref: *${quotationNumber}*`,
        `🏢 Site: *${projectName || 'Main Site'}*`,
        `👤 Client: *${clientName || 'Valued Client'}*`,
        `📅 Date: *${quotationDate}*`,
        `💰 Total Quoted: *Rs. ${Number(totalAmount).toLocaleString('en-IN')}*`,
        ``,
        `_Generated via Armee Enterprises Construction ERP Letterhead Builder_`
      ].join('\n'),
    });
    setIsWhatsAppOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f7] flex flex-col font-sans">
      {/* Hidden file inputs for letterhead and inline images */}
      <input
        type="file"
        ref={letterheadFileInputRef}
        onChange={handleLetterheadUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={inlineImageInputRef}
        onChange={handleInsertInlineImage}
        accept="image/*"
        className="hidden"
      />

      {/* 1. TOP HEADER / TITLE BAR */}
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
                className="font-bold text-slate-800 text-sm md:text-base border-b border-transparent hover:border-slate-300 focus:border-[#653ef1] focus:outline-hidden px-1 py-0.5 rounded-xs transition-colors"
                placeholder="Enter Quotation Title..."
              />
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Client: <b>{clientName || 'Not specified'}</b></span>
              <span>•</span>
              <span>Site: <b>{projectName || 'General'}</b></span>
              <span>•</span>
              <span>Amount: <b>Rs. {Number(totalAmount).toLocaleString('en-IN')}</b></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Metadata Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMetaDrawerOpen(!isMetaDrawerOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isMetaDrawerOpen
                ? 'bg-purple-50 border-purple-200 text-[#653ef1]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quotation Info</span>
          </button>

          {/* Margins & Letterhead Config Toggle */}
          <button
            type="button"
            onClick={() => setIsMarginsDrawerOpen(!isMarginsDrawerOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isMarginsDrawerOpen
                ? 'bg-purple-50 border-purple-200 text-[#653ef1]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Margins & Letterhead</span>
          </button>

          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">WhatsApp</span>
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Print or Export to PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Print / PDF</span>
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

      {/* 2. WORD TOOLBAR (TYPOGRAPHY + CLICK-TO-OPEN INSERT BLOCKS) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs z-30">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Undo / Redo */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('undo')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('redo')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-200 mx-1" />

          {/* Font Family Dropdown (Custom to never drop text selection) */}
          <div className="relative font-family-container">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                saveSelection();
                setIsFontFamilyOpen(!isFontFamilyOpen);
                setIsFontSizeOpen(false);
                setIsTextColorOpen(false);
                setIsHighlightColorOpen(false);
                setIsInsertBlockOpen(false);
              }}
              className="h-7 px-2 border border-slate-200 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 focus:outline-hidden focus:border-[#653ef1]"
            >
              <span className="truncate max-w-[90px]">
                {FONT_FAMILIES.find((f) => f.value === activeFont)?.label || 'Inter'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isFontFamilyOpen && (
              <div className="absolute top-full left-0 mt-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50 min-w-[140px] max-h-60 overflow-y-auto">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFontFamily(f.value);
                      setIsFontFamilyOpen(false);
                    }}
                    className={`px-2 py-1 text-xs text-left rounded-sm hover:bg-purple-50 hover:text-[#653ef1] cursor-pointer flex items-center justify-between ${
                      activeFont === f.value ? 'bg-purple-50 text-[#653ef1] font-bold' : 'text-slate-700'
                    }`}
                    style={{ fontFamily: f.value }}
                  >
                    <span>{f.label}</span>
                    {activeFont === f.value && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size Dropdown (Custom to never drop text selection) */}
          <div className="relative font-size-container">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                saveSelection();
                setIsFontSizeOpen(!isFontSizeOpen);
                setIsFontFamilyOpen(false);
                setIsTextColorOpen(false);
                setIsHighlightColorOpen(false);
                setIsInsertBlockOpen(false);
              }}
              className="h-7 px-2 border border-slate-200 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 focus:outline-hidden focus:border-[#653ef1]"
            >
              <span>{FONT_SIZES.find((s) => s.value === activeSize)?.label || activeSize}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isFontSizeOpen && (
              <div className="absolute top-full left-0 mt-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50 min-w-[110px]">
                {FONT_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFontSize(s.value);
                      setIsFontSizeOpen(false);
                    }}
                    className={`px-2 py-1 text-xs text-left rounded-sm hover:bg-purple-50 hover:text-[#653ef1] cursor-pointer flex items-center justify-between ${
                      activeSize === s.value ? 'bg-purple-50 text-[#653ef1] font-bold' : 'text-slate-700'
                    }`}
                  >
                    <span>{s.label}</span>
                    {activeSize === s.value && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-1" />

          {/* Text Styling */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          {/* Text Color (Click to open, will never hide accidentally) */}
          <div className="relative text-color-container">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                saveSelection();
                setIsTextColorOpen(!isTextColorOpen);
                setIsHighlightColorOpen(false);
                setIsInsertBlockOpen(false);
                setIsFontFamilyOpen(false);
                setIsFontSizeOpen(false);
              }}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Font Color"
            >
              <Palette className="w-4 h-4" />
            </button>
            {isTextColorOpen && (
              <div className="absolute top-full left-0 mt-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 min-w-[150px]">
                <span className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Text Color
                </span>
                {TEXT_COLORS.map((tc) => (
                  <button
                    key={tc.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyTextColor(tc.value)}
                    className="flex items-center gap-2 px-2 py-1 text-xs rounded-sm hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: tc.value }}
                    />
                    <span className="text-slate-700">{tc.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Highlight Color (Click to open) */}
          <div className="relative highlight-color-container">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                saveSelection();
                setIsHighlightColorOpen(!isHighlightColorOpen);
                setIsTextColorOpen(false);
                setIsInsertBlockOpen(false);
                setIsFontFamilyOpen(false);
                setIsFontSizeOpen(false);
              }}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Highlight Color"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            {isHighlightColorOpen && (
              <div className="absolute top-full left-0 mt-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 min-w-[150px]">
                <span className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Highlight
                </span>
                {HIGHLIGHT_COLORS.map((hc) => (
                  <button
                    key={hc.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHighlightColor(hc.value)}
                    className="flex items-center gap-2 px-2 py-1 text-xs rounded-sm hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: hc.value }}
                    />
                    <span className="text-slate-700">{hc.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-[1px] h-5 bg-slate-200 mx-1" />

          {/* Alignments */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyFull')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          {/* Lists */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Bulleted List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-200 mx-1" />

          {/* QUICK DIRECT BUTTONS: 2-Columns & Item Card */}
          <button
            type="button"
            onClick={insertTwoColumns}
            className="px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-[#653ef1] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
            title="Insert 2 Side-by-Side Columns for text"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>2 Columns</span>
          </button>

          <button
            type="button"
            onClick={insertScopeItemCard}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Insert Itemized Scope Card (Stacked One Above Another)"
          >
            <Box className="w-3.5 h-3.5 text-purple-600" />
            <span>+ Item Card</span>
          </button>

          {/* CLICK-TO-OPEN INSERT BLOCK DROPDOWN (Will NEVER hide on hover!) */}
          <div className="relative insert-block-container">
            <button
              type="button"
              onClick={() => {
                setIsInsertBlockOpen(!isInsertBlockOpen);
                setIsTextColorOpen(false);
                setIsHighlightColorOpen(false);
              }}
              className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                isInsertBlockOpen
                  ? 'bg-[#653ef1] text-white border-[#653ef1]'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Insert Block</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isInsertBlockOpen ? 'rotate-180' : ''}`} />
            </button>

            {isInsertBlockOpen && (
              <div className="absolute top-full left-0 mt-1.5 flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 z-50 min-w-[230px] animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Text & Layout Blocks
                </div>

                <button
                  type="button"
                  onClick={insertTextParagraph}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <FilePlus className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-semibold">Text Paragraph</div>
                    <div className="text-[10px] text-slate-400">Write text one above another</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={insertSectionHeading}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <Heading className="w-4 h-4 text-slate-700" />
                  <div>
                    <div className="font-semibold">Section Heading</div>
                    <div className="text-[10px] text-slate-400">Title for work scope or terms</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={insertTwoColumns}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <Columns className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-semibold">2 Columns (Side-by-Side)</div>
                    <div className="text-[10px] text-slate-400">Two text boxes next to each other</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={insertThreeColumns}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <Columns className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-semibold">3 Columns (Side-by-Side)</div>
                    <div className="text-[10px] text-slate-400">Three columns grid for rates/dates</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={insertScopeItemCard}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <Box className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-semibold">Item / Scope Card</div>
                    <div className="text-[10px] text-slate-400">Item description with rate & total</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={insertCalloutBox}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-semibold">Note / Callout Box</div>
                    <div className="text-[10px] text-slate-400">Highlighted notice for clients</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={insertSignatureBlock}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-semibold">Signatures & Approval</div>
                    <div className="text-[10px] text-slate-400">Client Sign & Managing Director</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    inlineImageInputRef.current?.click();
                    setIsInsertBlockOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer border-t border-slate-100 mt-1"
                >
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                  <div>
                    <div className="font-semibold">Stamp or Image</div>
                    <div className="text-[10px] text-slate-400">Upload signature/seal file</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={insertManualPageBreak}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-[#653ef1] rounded-lg text-left font-medium cursor-pointer"
                >
                  <SplitSquareVertical className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-semibold">Insert Page Break</div>
                    <div className="text-[10px] text-slate-400">Shift content to next A4 sheet</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Reset Standard Template */}
          <button
            type="button"
            onClick={() => {
              if (confirm('Load clean commercial quotation template? Current content will be replaced.')) {
                if (editorRef.current) {
                  editorRef.current.innerHTML = getDefaultQuotationTemplate({
                    quotationNumber,
                    date: quotationDate,
                    clientName,
                    clientPhone,
                    projectName,
                    title,
                  });
                  setHasUnsavedChanges(true);
                  checkEditorContent();
                }
              }
            }}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset with Clean Modern Quotation Template"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Reset Template</span>
          </button>
        </div>

        {/* Zoom & Page Count Indicator */}
        <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[11px] text-slate-600 font-bold">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>{pageCount} Page{pageCount > 1 ? 's' : ''} (A4)</span>
          </div>

          <div className="flex items-center gap-1">
            <span>Zoom:</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="w-5 h-5 rounded-md border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold"
            >
              -
            </button>
            <span className="w-8 text-center font-mono">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="w-5 h-5 rounded-md border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE / A4 CANVAS DESK */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Viewport */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
          {/* A4 Sheet Container */}
          <div
            className="relative bg-white shadow-2xl transition-transform origin-top rounded-xs border border-slate-300/60"
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              transform: `scale(${zoomLevel / 100})`,
              marginBottom: `${Math.max(60, (zoomLevel - 100) * 15)}px`,
            }}
          >
            {/* Background Letterhead Layer (Only if enabled and image provided) */}
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

            {/* PROTECTED LETTERHEAD HEADER REGION (Non-editable Top Shield - only when letterhead active) */}
            {letterheadEnabled && letterheadImageUrl && (
              <div
                className="absolute left-0 right-0 top-0 pointer-events-none z-10 select-none print:hidden flex flex-col justify-end"
                style={{ height: `${marginTop}px` }}
              >
                {showGuidelines && (
                  <div className="border-b-2 border-dashed border-purple-400/80 bg-purple-500/5 px-4 py-1 flex items-center justify-between text-[10px] text-purple-700 font-mono font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>🛡️ Letterhead Header Area (Protected Zone • Text Starts Below)</span>
                    </span>
                    <span>Top Margin: {marginTop}px</span>
                  </div>
                )}
              </div>
            )}

            {/* Visual Guideline for Bottom Margin (Footer Protection) */}
            {showGuidelines && letterheadEnabled && letterheadImageUrl && (
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400/80 bg-amber-500/5 pointer-events-none z-10 select-none print:hidden flex items-center justify-between px-4 py-1 text-[10px] text-amber-800 font-mono font-bold"
                style={{ bottom: `${marginBottom}px` }}
              >
                <span>⚠️ Letterhead Footer Zone (Content shifts to Page 2 if touching)</span>
                <span>Bottom Margin: {marginBottom}px</span>
              </div>
            )}

            {/* Multi-page Visual Overflow Indicator */}
            {pageCount > 1 && (
              <div
                className="absolute left-0 right-0 border-t-2 border-purple-600 pointer-events-none z-10 select-none print:hidden flex items-center justify-center text-[10px] text-purple-700 font-bold"
                style={{ top: `${A4_HEIGHT_PX}px` }}
              >
                <span className="bg-purple-100 border border-purple-300 px-3 py-0.5 rounded-full shadow-xs -translate-y-1/2">
                  📄 Page 2 Begins Here (Printed on Next Sheet)
                </span>
              </div>
            )}

            {/* ContentEditable Word Canvas */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onPaste={handlePaste}
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              onSelect={saveSelection}
              onInput={() => {
                saveSelection();
                setHasUnsavedChanges(true);
                checkEditorContent();
              }}
              className="relative z-20 min-h-full focus:outline-hidden text-slate-900 quotation-word-canvas"
              style={{
                fontFamily: activeFont,
                fontSize: activeSize,
                paddingTop: `${marginTop}px`,
                paddingBottom: `${marginBottom}px`,
                paddingLeft: `${marginLeft}px`,
                paddingRight: `${marginRight}px`,
                lineHeight: 1.6,
              }}
            />
          </div>
        </div>

        {/* 4. MARGINS & LETTERHEAD CONFIG DRAWER (RIGHT SIDEBAR) */}
        {isMarginsDrawerOpen && (
          <div className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto shrink-0 shadow-lg z-30 flex flex-col gap-5 print:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#653ef1]" />
                <span>Letterhead & Margins</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMarginsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Quick Margin Presets (Dynamic for Blank vs Letterhead) */}
            <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-purple-900">
                {letterheadImageUrl ? 'Letterhead Margin Presets:' : 'Blank Page Margin Presets:'}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {letterheadImageUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMarginTop(160);
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        marginTop === 160 ? 'bg-[#653ef1] text-white border-[#653ef1]' : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100'
                      }`}
                    >
                      Compact (160px)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMarginTop(185);
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        marginTop === 185 ? 'bg-[#653ef1] text-white border-[#653ef1]' : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100'
                      }`}
                    >
                      Armee (185px)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMarginTop(215);
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        marginTop === 215 ? 'bg-[#653ef1] text-white border-[#653ef1]' : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100'
                      }`}
                    >
                      Spacious (215px)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMarginTop(25);
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        marginTop === 25 ? 'bg-[#653ef1] text-white border-[#653ef1]' : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100'
                      }`}
                    >
                      Compact (25px)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMarginTop(40);
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        marginTop === 40 ? 'bg-[#653ef1] text-white border-[#653ef1]' : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100'
                      }`}
                    >
                      Standard (40px)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMarginTop(65);
                        setHasUnsavedChanges(true);
                      }}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        marginTop === 65 ? 'bg-[#653ef1] text-white border-[#653ef1]' : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100'
                      }`}
                    >
                      Spacious (65px)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Letterhead Background Toggle & Presets */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700">Letterhead Mode</div>
                  <div className="text-[10px] text-slate-400">
                    {letterheadImageUrl ? 'Letterhead image active' : 'Clean blank canvas (no letterhead)'}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  letterheadImageUrl ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {letterheadImageUrl ? 'Active' : 'Blank'}
                </span>
              </div>

              {/* 1-Click Fast Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSetBlankLetterhead}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    !letterheadImageUrl
                      ? 'bg-purple-50 text-[#653ef1] border-[#653ef1]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>⬜ Keep Blank</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaultLetterhead}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    letterheadImageUrl === '/letterhead.png'
                      ? 'bg-purple-50 text-[#653ef1] border-[#653ef1]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>🏢 Armee Header</span>
                </button>
              </div>

              {/* Letterhead thumbnail if active */}
              {letterheadImageUrl && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/60">
                  <div className="w-full h-20 rounded-lg border border-slate-200 bg-white overflow-hidden relative shadow-2xs">
                    <img
                      src={letterheadImageUrl}
                      alt="Letterhead Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => letterheadFileInputRef.current?.click()}
                    className="w-full py-1 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Custom Letterhead Image</span>
                  </button>
                </div>
              )}
            </div>

            {/* Top Margin Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">Top Margin (Content Starts)</span>
                <span className="font-mono font-bold text-[#653ef1]">{marginTop} px</span>
              </div>
              <input
                type="range"
                min="10"
                max="340"
                value={marginTop}
                onChange={(e) => {
                  setMarginTop(Number(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="w-full accent-[#653ef1] cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Adjusts top clearance from the page edge or letterhead graphics.
              </span>
            </div>

            {/* Bottom Margin Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">Bottom Margin (Footer Offset)</span>
                <span className="font-mono font-bold text-[#653ef1]">{marginBottom} px</span>
              </div>
              <input
                type="range"
                min="40"
                max="260"
                value={marginBottom}
                onChange={(e) => {
                  setMarginBottom(Number(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="w-full accent-[#653ef1] cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Ensures content shifts to Page 2 before touching the footer info.
              </span>
            </div>

            {/* Left & Right Margins */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Left Margin (px)</label>
                <input
                  type="number"
                  value={marginLeft}
                  onChange={(e) => {
                    setMarginLeft(Number(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Right Margin (px)</label>
                <input
                  type="number"
                  value={marginRight}
                  onChange={(e) => {
                    setMarginRight(Number(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>
            </div>

            {/* Guidelines Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-600">Show Margin Guidelines</span>
              <input
                type="checkbox"
                checked={showGuidelines}
                onChange={(e) => setShowGuidelines(e.target.checked)}
                className="rounded-sm border-slate-300 text-[#653ef1] focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 5. QUOTATION INFO / METADATA DRAWER (RIGHT SIDEBAR) */}
        {isMetaDrawerOpen && (
          <div className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto shrink-0 shadow-lg z-30 flex flex-col gap-4 print:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#653ef1]" />
                <span>Quotation Details</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMetaDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Quotation Number *</label>
              <input
                type="text"
                value={quotationNumber}
                onChange={(e) => {
                  setQuotationNumber(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-hidden focus:border-[#653ef1]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Client / Recipient Name *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-[#653ef1]"
                placeholder="e.g. M/S Acme Infra"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Client Mobile / WhatsApp</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => {
                  setClientPhone(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-[#653ef1]"
                placeholder="e.g. +91 99583 99157"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Construction Site / Project</label>
              <select
                value={projectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-[#653ef1] bg-white"
              >
                <option value="">-- Select Construction Site --</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quotation Date</label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => {
                    setQuotationDate(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-[#653ef1]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as any);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-[#653ef1] bg-white capitalize"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Total Quoted Value (Rs.)</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => {
                  setTotalAmount(Number(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden focus:border-[#653ef1]"
                placeholder="0"
              />
            </div>
          </div>
        )}
      </div>

      {/* 6. WHATSAPP SHARE MODAL */}
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

      {/* 7. GLOBAL CSS & PRINT STYLES */}
      <style jsx global>{`
        .quotation-word-canvas {
          outline: none !important;
        }
        .quotation-word-canvas p {
          margin: 10px 0;
          line-height: 1.6;
          color: #111827;
        }
        .quotation-word-canvas ul {
          list-style-type: disc !important;
          margin: 10px 0 !important;
          padding-left: 28px !important;
        }
        .quotation-word-canvas ol {
          list-style-type: decimal !important;
          margin: 10px 0 !important;
          padding-left: 28px !important;
        }
        .quotation-word-canvas li {
          margin: 4px 0 !important;
          line-height: 1.6 !important;
          display: list-item !important;
          list-style-position: outside !important;
        }
        .quotation-word-canvas h1 {
          font-size: 20px;
          font-weight: bold;
          margin: 14px 0 6px 0;
          color: #653ef1;
        }
        .quotation-word-canvas h2 {
          font-size: 16px;
          font-weight: bold;
          margin: 12px 0 4px 0;
          color: #1e293b;
        }
        .quotation-word-canvas h3 {
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0 4px 0;
          color: #334155;
        }

        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header,
          .print\\:hidden {
            display: none !important;
          }
          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
            border-top: none !important;
            margin: 0 !important;
          }
          .print-page-break span {
            display: none !important;
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
