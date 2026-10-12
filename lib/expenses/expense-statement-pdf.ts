'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SiteExpense } from '@/lib/supabase/types';

export function formatINR(val: number): string {
  const num = Math.round(Number(val) || 0);
  const str = num.toString();
  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  const formatted = otherNumbers !== ''
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return `Rs. ${formatted}`;
}

/**
 * Converts a numeric amount to Indian Currency Words (e.g. Rupees One Thousand Eight Hundred Fifty Only)
 */
export function numberToWordsINR(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Rupees Zero Only';

  function convertTwoDigits(v: number): string {
    if (v < 20) return a[v];
    return b[Math.floor(v / 10)] + ' ' + a[v % 10];
  }

  function convertThreeDigits(v: number): string {
    let str = '';
    if (v >= 100) {
      str += a[Math.floor(v / 100)] + 'Hundred ';
      v %= 100;
    }
    if (v > 0) {
      str += convertTwoDigits(v);
    }
    return str;
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const rest = rem;

  if (crore > 0) words += convertTwoDigits(crore) + 'Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + 'Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + 'Thousand ';
  if (rest > 0) words += convertThreeDigits(rest);

  return `Rupees ${words.trim()} Only`;
}

export interface ExpensePdfOptions {
  projectName?: string;
  projectCode?: string;
  filterLabel?: string;
  generatedBy?: string;
}

/**
 * Generates an executive A4 landscape PDF statement of site expenses.
 */
export function generateSiteExpensesPdf(
  expenses: SiteExpense[],
  options: ExpensePdfOptions = {}
): jsPDF {
  const {
    projectName = 'Noori Crest Tower',
    projectCode = 'NC-2026',
    filterLabel = 'All Dates Statement',
    generatedBy = 'Site Commercial Incharge',
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;
  let currentY = margin;

  // 1. Top Decorative Accent Strip
  doc.setFillColor(4, 47, 56); // Deep Spruce / Teal #042f38
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Header Container
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, 'S');

  // Title & Project Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(4, 47, 56); // Deep Spruce / Teal
  doc.text('SITE BILLS, DAILY EXPENSES & PETTY CASH STATEMENT', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Project: ${projectName} (${projectCode})  •  Scope: ${filterLabel}  •  Audited Supabase Ledger`,
    margin + 6,
    currentY + 16
  );

  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated: ${todayStr}  •  By: ${generatedBy}`, margin + 6, currentY + 22);

  // Right Header Badge
  doc.setFillColor(219, 238, 242); // Light Teal 100
  doc.roundedRect(pageWidth - margin - 58, currentY + 6, 52, 16, 3, 3, 'F');
  doc.setDrawColor(184, 223, 229); // Border 200
  doc.roundedRect(pageWidth - margin - 58, currentY + 6, 52, 16, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(4, 47, 56); // Deep Spruce / Teal
  doc.text('SITE EXPENSE LEDGER', pageWidth - margin - 53, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Total Records: ${expenses.length}`, pageWidth - margin - 53, currentY + 18);

  currentY += 32;

  // 3. KPI Highlights Summary Bar
  const todayISO = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.expense_date === todayISO);
  const todaySum = todayExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalSum = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const kpiWidth = (pageWidth - margin * 2 - 9) / 4;
  const kpiHeight = 14;

  const kpiCards = [
    { title: "TODAY'S EXPENSES", value: formatINR(todaySum), sub: `${todayExpenses.length} bills today` },
    { title: 'TOTAL EXPENDITURE', value: formatINR(totalSum), sub: `${expenses.length} total entries` },
    { title: 'CASH / PETTY PAYMENTS', value: formatINR(expenses.filter(e => e.payment_method === 'cash' || e.payment_method === 'petty_cash').reduce((a, b) => a + Number(b.amount || 0), 0)), sub: 'On-site liquid cash' },
    { title: 'UPI / BANK TRANSFERS', value: formatINR(expenses.filter(e => e.payment_method === 'upi' || e.payment_method === 'bank_transfer').reduce((a, b) => a + Number(b.amount || 0), 0)), sub: 'Digital & Cheque' },
  ];

  kpiCards.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.rect(kpiX, currentY, kpiWidth, kpiHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(kpiX, currentY, kpiWidth, kpiHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, kpiX + 3, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(kpi.value, kpiX + 3, currentY + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, kpiX + 3, currentY + 12.5);
  });

  currentY += kpiHeight + 4;

  // 4. Data Table
  const tableRows = expenses.map((exp, index) => {
    const code = exp.expense_code || `EXP-${index + 1}`;
    const date = exp.expense_date || '-';
    const title = exp.title || '-';
    const category = exp.category || 'General';
    const vendor = exp.vendor_name || 'Direct / Site Cash';
    const method = (exp.payment_method || 'cash').toUpperCase();
    const paidBy = exp.paid_by || '-';
    const status = (exp.payment_status || 'paid').toUpperCase();
    const amountStr = formatINR(exp.amount);

    return [
      String(index + 1),
      code,
      date,
      title,
      category,
      vendor,
      method,
      paidBy,
      status,
      amountStr,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      'S.No',
      'Expense Code',
      'Date',
      'Expense Title & Purpose',
      'Category',
      'Paid To / Vendor Name',
      'Mode',
      'Paid By',
      'Status',
      'Amount (Rs.)',
    ]],
    body: tableRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [241, 245, 249], // Soft Slate 100
      textColor: [30, 41, 59], // Slate 800
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold', textColor: [109, 40, 217] },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 58 },
      4: { cellWidth: 34 },
      5: { cellWidth: 46 },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 24 },
      8: { cellWidth: 18, halign: 'center' },
      9: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });

  const totalPages = (doc as any).internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Footer Strip
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, pageHeight - 12, pageWidth - margin * 2, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, pageHeight - 12, pageWidth - margin * 2, 8, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Armee Enterprises PMS  •  Certified Site Expense Statement  •  Total: ${formatINR(totalSum)}`,
      margin + 4,
      pageHeight - 7
    );

    const pageStr = `Page ${page} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr) - 4, pageHeight - 7);
  }

  return doc;
}

/**
 * Returns a Blob URL for the site expenses statement PDF.
 */
export function getSiteExpensesPdfBlobUrl(
  expenses: SiteExpense[],
  projectName: string = 'Noori Crest Tower',
  filterLabel: string = 'All Dates Statement'
): { blobUrl: string; doc: jsPDF } {
  const doc = generateSiteExpensesPdf(expenses, { projectName, filterLabel });
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, doc };
}

/**
 * Downloads the full site expenses statement PDF via Blob URL.
 */
export function downloadSiteExpensesPdf(
  expenses: SiteExpense[],
  projectName: string = 'Noori Crest Tower',
  filterLabel: string = 'All Dates Statement'
): void {
  const { blobUrl } = getSiteExpensesPdfBlobUrl(expenses, projectName, filterLabel);
  const a = document.createElement('a');
  a.href = blobUrl;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `Site_Expenses_Statement_${dateStr}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Opens the expenses statement PDF in a new tab via Blob URL.
 */
export function viewSiteExpensesPdfInNewTab(
  expenses: SiteExpense[],
  projectName: string = 'Noori Crest Tower',
  filterLabel: string = 'All Dates Statement'
): string {
  const { blobUrl } = getSiteExpensesPdfBlobUrl(expenses, projectName, filterLabel);
  if (typeof window !== 'undefined') {
    window.open(blobUrl, '_blank');
  }
  return blobUrl;
}

// ============================================================================
// SINGLE EXPENSE BILL / PAYMENT VOUCHER SLIP (PORTRAIT A4)
// ============================================================================

/**
 * Generates an executive Single Expense Payment Voucher PDF slip.
 * Clean, clutter-free corporate layout with proper spacing and hierarchy.
 */
export function generateSingleExpenseVoucherPdf(
  expense: SiteExpense,
  projectName: string = 'Noori Crest Tower'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // 1. Sleek Top Accent Line (Flushed at top of sheet)
  doc.setFillColor(99, 102, 241); // Indigo 500
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // 2. Company & Document Header (Generous top clearance, no touching top)
  let currentY = 16;

  // Company Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('Armee Enterprises', margin, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Site Engineering & Construction Management System', margin, currentY + 9.5);

  // Right Header: Document Title & Voucher Reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(4, 47, 56);
  doc.text('PAYMENT VOUCHER SLIP', pageWidth - margin, currentY + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const vCode = expense.expense_code || 'EXP-VOUCHER';
  doc.text(`Voucher Ref: ${vCode}`, pageWidth - margin, currentY + 9.5, { align: 'right' });

  currentY += 15;

  // Clean Header Divider Line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // 3. Unified Metadata Card (Clean Grid, Soft Background, No Clutter)
  const metaCardHeight = 28;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, contentWidth, metaCardHeight, 2, 2, 'FD');

  const c1X = margin + 5;
  const c2X = margin + 68;
  const c3X = margin + 128;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAID TO / RECIPIENT VENDOR', c1X, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const payeeName = expense.vendor_name || 'Direct Site Cash Recipient';
  doc.text(payeeName.length > 28 ? payeeName.substring(0, 26) + '...' : payeeName, c1X, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VOUCHER DATE', c2X, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(expense.expense_date, c2X, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT STATUS', c3X, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const isPaid = expense.payment_status === 'paid';
  if (isPaid) {
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text('PAID (CLEARED)', c3X, currentY + 10);
  } else {
    doc.setTextColor(217, 119, 6); // Amber 600
    doc.text(expense.payment_status.toUpperCase(), c3X, currentY + 10);
  }

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PROJECT SITE', c1X, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(projectName, c1X, currentY + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL / MEMO REF #', c2X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(expense.bill_number || 'Cash Memo / Direct', c2X, currentY + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT MODE', c3X, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(expense.payment_method.toUpperCase(), c3X, currentY + 21);

  currentY += metaCardHeight + 6;

  // 4. Line Item AutoTable (Clean executive table, no cramped wrapping)
  autoTable(doc, {
    startY: currentY,
    head: [[
      '#',
      'Expense Description & Purpose',
      'Category',
      'Payment Mode',
      'Amount (Rs.)',
    ]],
    body: [
      [
        '1',
        `${expense.title}${expense.notes ? '\nNotes: ' + expense.notes : ''}`,
        expense.category,
        expense.payment_method.toUpperCase(),
        formatINR(expense.amount),
      ],
    ],
    foot: [
      [
        {
          content: 'TOTAL VOUCHER AMOUNT PAID:',
          colSpan: 4,
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fontSize: 8.5,
            textColor: [51, 65, 85], // Slate 700
            fillColor: [248, 250, 252], // Slate 50
            cellPadding: { top: 4.5, bottom: 4.5, right: 4 },
          },
        },
        {
          content: formatINR(expense.amount),
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fontSize: 10.5,
            textColor: [4, 47, 56], // Deep Spruce / Teal #042f38
            fillColor: [248, 250, 252], // Slate 50
            cellPadding: { top: 4.5, bottom: 4.5, right: 4 },
          },
        },
      ],
    ],
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [241, 245, 249], // Soft Slate 100
      textColor: [30, 41, 59], // Slate 800
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 86 },
      2: { cellWidth: 34 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 5. Amount in Words Strip (Clean single line callout)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 9.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS:', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(4, 47, 56);
  doc.text(numberToWordsINR(expense.amount), margin + 35, currentY + 6);

  currentY += 14;

  // 6. Security & Audit Verification Strip
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const auditDate = expense.created_at ? new Date(expense.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  doc.text(
    `[VERIFIED DIGITAL VOUCHER]  •  Audited Site Expenditure  •  Logged in Supabase public.site_expenses at ${auditDate}`,
    margin + 1,
    currentY
  );

  currentY += 8;

  // 7. 3-Part Official Signature Block (Clean, side by side)
  const sigGap = 5;
  const sigWidth = (contentWidth - sigGap * 2) / 3;
  const sigHeight = 25;

  const signatures = [
    { title: 'PREPARED / PAID BY', sub: expense.paid_by || 'Site Supervisor' },
    { title: 'CHECKED & VERIFIED BY', sub: 'Site Project Engineer' },
    { title: 'AUTHORIZED / RECEIVER', sub: expense.vendor_name || 'Receiver Sign' },
  ];

  signatures.forEach((sig, idx) => {
    const sigX = margin + idx * (sigWidth + sigGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(sigX, currentY, sigWidth, sigHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(sig.title, sigX + 4, currentY + 5.5);

    // Signature dotted line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(sigX + 4, currentY + 16.5, sigX + sigWidth - 4, currentY + 16.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(sig.sub, sigX + 4, currentY + 21);
  });

  // 8. Footer Micro-print
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a certified digital payment voucher generated by Armee Enterprises PMS. All monetary values in Indian Rupees (INR).', margin, pageHeight - 8);
  doc.text(`Doc Ref: ${expense.id}`, pageWidth - margin, pageHeight - 8, { align: 'right' });

  return doc;
}

/**
 * Returns a Blob URL for a single expense bill voucher slip.
 */
export function getSingleExpenseVoucherBlobUrl(
  expense: SiteExpense,
  projectName: string = 'Noori Crest Tower'
): { blobUrl: string; doc: jsPDF } {
  const doc = generateSingleExpenseVoucherPdf(expense, projectName);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, doc };
}

/**
 * Directly downloads the single expense bill voucher slip PDF via Blob URL.
 */
export function downloadSingleExpenseVoucherPdf(
  expense: SiteExpense,
  projectName: string = 'Noori Crest Tower'
): void {
  const { blobUrl } = getSingleExpenseVoucherBlobUrl(expense, projectName);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `Expense_Bill_${expense.expense_code || 'Voucher'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Opens a single expense bill voucher slip directly in a new tab via Blob URL.
 */
export function viewSingleExpenseVoucherInNewTab(
  expense: SiteExpense,
  projectName: string = 'Noori Crest Tower'
): string {
  const { blobUrl } = getSingleExpenseVoucherBlobUrl(expense, projectName);
  if (typeof window !== 'undefined') {
    window.open(blobUrl, '_blank');
  }
  return blobUrl;
}
