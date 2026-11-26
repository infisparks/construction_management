import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DashboardPdfReportInput {
  siteName: string;
  periodLabel: string;
  generatedBy?: string;
  expenseStats: {
    total: number;
    paid: number;
    unpaidTotal: number;
    count: number;
    paidPct: number;
    todayTotal: number;
    todayCount: number;
    monthTotal: number;
    monthCount: number;
    avgBill: number;
    maxBill: number;
  };
  storeStats: {
    totalProducts: number;
    totalStockUnits: number;
    healthyCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    inCount: number;
    outCount: number;
    defectReturnCount: number;
  };
  docStats: {
    total: number;
    approved: number;
    pending: number;
    totalSizeLabel: string;
  };
  monthlyTrend: {
    label: string;
    count: number;
    paid: number;
    pending: number;
    total: number;
  }[];
  paymentModes: {
    mode: string;
    count: number;
    amount: number;
    pct: number;
  }[];
  siteComparison: {
    name: string;
    billCount: number;
    billTotal: number;
    billPending: number;
    docCount: number;
    taskProgress: number;
  }[];
  topVendors: {
    name: string;
    count: number;
    pending: number;
    total: number;
  }[];
  pendingBills: {
    expense_code: string;
    expense_date: string;
    title: string;
    vendor_name: string | null;
    payment_status: string;
    amount: number;
    dueAmount: number;
  }[];
}

function fmtRs(val: number): string {
  const n = Math.round(Number(val) || 0);
  return `Rs. ${new Intl.NumberFormat('en-IN').format(n)}`;
}

async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generates and downloads a professional A4 Director Executive Report PDF
 * formatted onto `/public/letterhead.png` with safe header & footer margins.
 */
export async function downloadDirectorDashboardPdf(input: DashboardPdfReportInput): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const letterheadUrl = await loadImageAsDataUrl('/letterhead.png');

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_TOP = 42;    // Clear of letterhead top logo & gold bar (~37mm)
  const MARGIN_BOTTOM = 29; // Clear of letterhead bottom navy/gold footer (~275mm)
  const MARGIN_X = 14;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;

  const drawLetterheadOnCurrentPage = () => {
    if (letterheadUrl) {
      doc.addImage(letterheadUrl, 'PNG', 0, 0, PAGE_W, PAGE_H, undefined, 'FAST');
    }
  };

  // Draw letterhead on Page 1
  drawLetterheadOnCurrentPage();

  let cursorY = MARGIN_TOP;

  // Report Header Card
  doc.setFillColor(246, 248, 252);
  doc.setDrawColor(219, 226, 238);
  doc.roundedRect(MARGIN_X, cursorY, CONTENT_W, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 37, 74); // Armee Navy
  doc.text('DIRECTOR EXECUTIVE SUMMARY REPORT', MARGIN_X + 4, cursorY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  const nowStr = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Site Scope: ${input.siteName}   |   Period: ${input.periodLabel}`, MARGIN_X + 4, cursorY + 13);
  doc.text(
    `Generated: ${nowStr} IST${input.generatedBy ? `   |   Prepared By: ${input.generatedBy}` : ''}`,
    MARGIN_X + 4,
    cursorY + 17.5
  );

  cursorY += 25;

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > PAGE_H - MARGIN_BOTTOM) {
      doc.addPage();
      drawLetterheadOnCurrentPage();
      cursorY = MARGIN_TOP;
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 37, 74);
    doc.text(title, MARGIN_X, cursorY);
    doc.setDrawColor(217, 155, 38); // Armee Gold accent
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, cursorY + 1.5, MARGIN_X + 38, cursorY + 1.5);
    cursorY += 4.5;
  };

  const commonTableConfig = {
    margin: { top: MARGIN_TOP, right: MARGIN_X, bottom: MARGIN_BOTTOM, left: MARGIN_X },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [31, 41, 55] as [number, number, number],
      lineColor: [229, 231, 235] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 37, 74] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] as [number, number, number],
    },
    didDrawPage: (hookData: any) => {
      // Ensure letterhead is placed behind any auto-added pages
      if (hookData.pageNumber > 1 && letterheadUrl) {
        // Note: willDrawPage runs before drawing cells; handled below
      }
    },
    willDrawPage: (hookData: any) => {
      if (hookData.pageNumber > 1) {
        drawLetterheadOnCurrentPage();
      }
    },
  };

  // 1. Executive KPIs Overview
  drawSectionTitle('1. EXECUTIVE FINANCIAL & OPERATIONS OVERVIEW');
  autoTable(doc, {
    ...commonTableConfig,
    startY: cursorY,
    head: [['Metric', 'Primary Value', 'Breakdown / Details']],
    body: [
      [
        'Total Bills & Expenses',
        fmtRs(input.expenseStats.total),
        `Paid: ${fmtRs(input.expenseStats.paid)} (${input.expenseStats.paidPct}%)  |  Due: ${fmtRs(input.expenseStats.unpaidTotal)}  |  ${input.expenseStats.count} Bills`,
      ],
      [
        "Today's Bill Expense",
        fmtRs(input.expenseStats.todayTotal),
        `${input.expenseStats.todayCount} bill(s) recorded for today`,
      ],
      [
        "This Month's Bill Expense",
        fmtRs(input.expenseStats.monthTotal),
        `${input.expenseStats.monthCount} bill(s) in current calendar month`,
      ],
      [
        'Avg / Highest Bill',
        fmtRs(input.expenseStats.avgBill),
        `Highest Single Bill: ${fmtRs(input.expenseStats.maxBill)}`,
      ],
      [
        'Store Inventory (Central)',
        `${input.storeStats.totalProducts} Items`,
        `Total Stock: ${input.storeStats.totalStockUnits.toLocaleString('en-IN')} units  |  Low: ${input.storeStats.lowStockCount}  |  Depleted: ${input.storeStats.outOfStockCount}`,
      ],
      [
        'Documents Vault',
        `${input.docStats.total} Files`,
        `Approved: ${input.docStats.approved}  |  Storage Used: ${input.docStats.totalSizeLabel}`,
      ],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48 },
      1: { fontStyle: 'bold', cellWidth: 38 },
      2: { cellWidth: CONTENT_W - 86 },
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 7;

  // 2. Monthly Bills & Expenses Trend (6 Months)
  drawSectionTitle('2. MONTHLY BILLS & EXPENSES TREND (LAST 6 MONTHS)');
  autoTable(doc, {
    ...commonTableConfig,
    startY: cursorY,
    head: [['Month', 'Bills Count', 'Paid Amount', 'Pending / Due', 'Total Expense']],
    body: input.monthlyTrend.map((m) => [
      m.label,
      String(m.count),
      fmtRs(m.paid),
      fmtRs(m.pending),
      fmtRs(m.total),
    ]),
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 7;

  // 3. Payment Mode Split
  if (input.paymentModes.length > 0) {
    drawSectionTitle('3. PAYMENT MODE & CASHFLOW SPLIT');
    autoTable(doc, {
      ...commonTableConfig,
      startY: cursorY,
      head: [['Payment Mode', 'Bills Count', 'Amount', 'Share (%)']],
      body: input.paymentModes.map((m) => [
        m.mode.replace('_', ' ').toUpperCase(),
        String(m.count),
        fmtRs(m.amount),
        `${m.pct}%`,
      ]),
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right' },
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 4. Site-wise Comparison
  if (input.siteComparison.length > 0) {
    drawSectionTitle('4. SITE-WISE SPEND & DOCUMENTS COMPARISON');
    autoTable(doc, {
      ...commonTableConfig,
      startY: cursorY,
      head: [['Site / Project', 'Bills', 'Total Spend', 'Pending Due', 'Docs']],
      body: input.siteComparison.map((s) => [
        s.name,
        String(s.billCount),
        fmtRs(s.billTotal),
        fmtRs(s.billPending),
        String(s.docCount),
      ]),
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { halign: 'right' },
        4: { halign: 'center' },
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 5. Top Vendors by Spend
  if (input.topVendors.length > 0) {
    drawSectionTitle('5. TOP VENDORS BY SPEND');
    autoTable(doc, {
      ...commonTableConfig,
      startY: cursorY,
      head: [['#', 'Vendor Name', 'Bills', 'Pending Due', 'Total Spend']],
      body: input.topVendors.map((v, idx) => [
        String(idx + 1),
        v.name,
        String(v.count),
        fmtRs(v.pending),
        fmtRs(v.total),
      ]),
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 7;
  }

  // 6. Pending & Unpaid Bills
  if (input.pendingBills.length > 0) {
    drawSectionTitle('6. PENDING / UNPAID BILLS REQUIRING SETTLEMENT');
    autoTable(doc, {
      ...commonTableConfig,
      startY: cursorY,
      head: [['Date', 'Title', 'Vendor', 'Status', 'Total', 'Due']],
      body: input.pendingBills.map((b) => [
        b.expense_date,
        b.title,
        b.vendor_name || 'Direct Cash',
        b.payment_status.toUpperCase(),
        fmtRs(b.amount),
        fmtRs(b.dueAmount),
      ]),
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // Add subtle page numbering just above the letterhead footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Armee Enterprises • Director Report (${input.siteName})`,
      MARGIN_X,
      PAGE_H - MARGIN_BOTTOM + 4
    );
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM + 4, {
      align: 'right',
    });
  }

  const safeSiteSlug = input.siteName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const dateSlug = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  doc.save(`Armee_Executive_Report_${safeSiteSlug}_${dateSlug}.pdf`);
}
