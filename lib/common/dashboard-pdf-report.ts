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

function fmtCompact(val: number): string {
  const num = Number(val) || 0;
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${Math.round(num)}`;
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
  const MARGIN_TOP = 49;    // Clear of letterhead top ARM logo & Noori Horizon (~46mm)
  const MARGIN_BOTTOM = 30; // Clear of letterhead bottom forest-green/gold footer (~26mm)
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

  // Report Header Card (Forest Green & Gold letterhead theme)
  doc.setFillColor(248, 249, 246);
  doc.setDrawColor(218, 224, 215);
  doc.roundedRect(MARGIN_X, cursorY, CONTENT_W, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 51, 35); // Armee Forest Green
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
    doc.setTextColor(31, 51, 35);
    doc.text(title, MARGIN_X, cursorY);
    doc.setDrawColor(207, 163, 58); // Armee Gold accent
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
      lineColor: [224, 228, 222] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [31, 51, 35] as [number, number, number],
      textColor: [245, 223, 158] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 248] as [number, number, number],
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

  // 2. Monthly Bills & Expenses Trend (6 Months) — Bar Chart + Table
  drawSectionTitle('2. MONTHLY BILLS & EXPENSES TREND (LAST 6 MONTHS)');
  ensureSpace(52);
  {
    const chartH = 44;
    const chartW = CONTENT_W;
    doc.setFillColor(249, 250, 248);
    doc.setDrawColor(220, 226, 218);
    doc.roundedRect(MARGIN_X, cursorY, chartW, chartH, 2, 2, 'FD');

    // Legend top-right (Armee Letterhead Forest Green & Gold)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(31, 51, 35);
    doc.rect(MARGIN_X + chartW - 44, cursorY + 3.5, 3, 3, 'F');
    doc.setTextColor(31, 51, 35);
    doc.text('Paid', MARGIN_X + chartW - 39.5, cursorY + 6);
    doc.setFillColor(207, 163, 58);
    doc.rect(MARGIN_X + chartW - 26, cursorY + 3.5, 3, 3, 'F');
    doc.text('Pending', MARGIN_X + chartW - 21.5, cursorY + 6);

    const plotTop = cursorY + 10;
    const plotBottom = cursorY + chartH - 8;
    const plotH = plotBottom - plotTop;
    const maxVal = Math.max(...input.monthlyTrend.map((m) => m.total), 1);

    // Baseline
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(MARGIN_X + 6, plotBottom, MARGIN_X + chartW - 6, plotBottom);

    const count = Math.max(input.monthlyTrend.length, 1);
    const slotW = (chartW - 16) / count;
    const barW = Math.min(16, slotW * 0.55);

    input.monthlyTrend.forEach((m, idx) => {
      const centerX = MARGIN_X + 8 + slotW * idx + slotW / 2;
      const barX = centerX - barW / 2;
      const totalH = m.total > 0 ? Math.max((m.total / maxVal) * plotH, 2.5) : 0.8;
      const paidH = m.total > 0 ? (m.paid / m.total) * totalH : 0;
      const pendH = Math.max(totalH - paidH, 0);

      if (paidH > 0) {
        doc.setFillColor(31, 51, 35);
        doc.rect(barX, plotBottom - paidH, barW, paidH, 'F');
      }
      if (pendH > 0) {
        doc.setFillColor(207, 163, 58);
        doc.rect(barX, plotBottom - paidH - pendH, barW, pendH, 'F');
      }
      if (m.total === 0) {
        doc.setFillColor(226, 232, 240);
        doc.rect(barX, plotBottom - 0.8, barW, 0.8, 'F');
      }

      // Value above bar
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(m.total > 0 ? fmtCompact(m.total) : '0', centerX, plotBottom - totalH - 1.5, {
        align: 'center',
      });

      // Month label below
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(m.label, centerX, plotBottom + 4.5, { align: 'center' });
    });

    cursorY += chartH + 4;
  }

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

  // 3. Payment Settlement & Mode Split — Visual Bars + Table
  if (input.paymentModes.length > 0) {
    drawSectionTitle('3. PAYMENT SETTLEMENT & MODE SPLIT');
    const chartBoxH = 18 + input.paymentModes.length * 7;
    ensureSpace(chartBoxH + 8);

    doc.setFillColor(249, 250, 248);
    doc.setDrawColor(220, 226, 218);
    doc.roundedRect(MARGIN_X, cursorY, CONTENT_W, chartBoxH, 2, 2, 'FD');

    // Overall Paid vs Pending Stacked Bar
    const totalExp = Math.max(input.expenseStats.total, 1);
    const paidRatio = Math.min(input.expenseStats.paid / totalExp, 1);
    const barLeft = MARGIN_X + 4;
    const fullBarW = CONTENT_W - 8;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 51, 35);
    doc.text(
      `Settlement Health: ${input.expenseStats.paidPct}% Paid (${fmtRs(input.expenseStats.paid)})   |   Pending: ${fmtRs(input.expenseStats.unpaidTotal)}`,
      barLeft,
      cursorY + 5.5
    );

    doc.setFillColor(207, 163, 58);
    doc.roundedRect(barLeft, cursorY + 7.5, fullBarW, 4, 1, 1, 'F');
    if (paidRatio > 0) {
      doc.setFillColor(31, 51, 35);
      doc.roundedRect(barLeft, cursorY + 7.5, Math.max(fullBarW * paidRatio, 2), 4, 1, 1, 'F');
    }

    // Mode Horizontal Bars (Armee Letterhead Forest Green, Olive & Gold)
    const modeBarStart = MARGIN_X + 38;
    const modeBarMaxW = CONTENT_W - 82;
    const modeColors: [number, number, number][] = [
      [31, 51, 35],
      [66, 99, 71],
      [207, 163, 58],
      [100, 116, 139],
      [163, 122, 32],
    ];

    input.paymentModes.forEach((m, idx) => {
      const rowY = cursorY + 17 + idx * 7;
      const color = modeColors[idx % modeColors.length];
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text(m.mode.replace('_', ' ').toUpperCase(), barLeft, rowY + 2.8);

      doc.setFillColor(229, 231, 235);
      doc.roundedRect(modeBarStart, rowY, modeBarMaxW, 3.2, 1, 1, 'F');
      const fillW = Math.max((m.pct / 100) * modeBarMaxW, m.amount > 0 ? 2 : 0);
      if (fillW > 0) {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(modeBarStart, rowY, fillW, 3.2, 1, 1, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      doc.text(`${fmtRs(m.amount)} (${m.pct}%)`, MARGIN_X + CONTENT_W - 4, rowY + 2.8, {
        align: 'right',
      });
    });

    cursorY += chartBoxH + 4;

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

  // 4. Site-wise Comparison — Visual Horizontal Bar Graph + Table
  if (input.siteComparison.length > 0) {
    drawSectionTitle('4. SITE-WISE SPEND & DOCUMENTS COMPARISON');
    const siteGraphH = 12 + input.siteComparison.length * 8;
    ensureSpace(siteGraphH + 8);

    doc.setFillColor(249, 250, 248);
    doc.setDrawColor(220, 226, 218);
    doc.roundedRect(MARGIN_X, cursorY, CONTENT_W, siteGraphH, 2, 2, 'FD');

    const maxSiteSpend = Math.max(...input.siteComparison.map((s) => s.billTotal), 1);
    const sBarStart = MARGIN_X + 54;
    const sBarMaxW = CONTENT_W - 96;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(31, 51, 35);
    doc.rect(MARGIN_X + 4, cursorY + 3.5, 3, 3, 'F');
    doc.setTextColor(31, 51, 35);
    doc.text('Total Spend', MARGIN_X + 8.5, cursorY + 6);
    doc.setFillColor(207, 163, 58);
    doc.rect(MARGIN_X + 30, cursorY + 3.5, 3, 3, 'F');
    doc.text('Pending Due', MARGIN_X + 34.5, cursorY + 6);

    input.siteComparison.forEach((s, idx) => {
      const rowY = cursorY + 11 + idx * 8;
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      const shortName = s.name.length > 26 ? `${s.name.slice(0, 24)}..` : s.name;
      doc.text(shortName, MARGIN_X + 4, rowY + 3);

      doc.setFillColor(229, 231, 235);
      doc.roundedRect(sBarStart, rowY, sBarMaxW, 3.6, 1, 1, 'F');

      const totalW = Math.max((s.billTotal / maxSiteSpend) * sBarMaxW, s.billTotal > 0 ? 2 : 0);
      if (totalW > 0) {
        doc.setFillColor(31, 51, 35);
        doc.roundedRect(sBarStart, rowY, totalW, 3.6, 1, 1, 'F');
      }
      if (s.billPending > 0 && s.billTotal > 0) {
        const pendW = Math.max((s.billPending / maxSiteSpend) * sBarMaxW, 1.5);
        doc.setFillColor(207, 163, 58);
        doc.roundedRect(sBarStart + Math.max(totalW - pendW, 0), rowY, Math.min(pendW, totalW), 3.6, 1, 1, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(fmtRs(s.billTotal), MARGIN_X + CONTENT_W - 4, rowY + 3, { align: 'right' });
    });

    cursorY += siteGraphH + 4;

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

  // 4B. Store Inventory Health & Movement Visual
  drawSectionTitle('5. STORE INVENTORY HEALTH & STOCK MOVEMENT');
  ensureSpace(30);
  {
    const boxH = 26;
    doc.setFillColor(249, 250, 248);
    doc.setDrawColor(220, 226, 218);
    doc.roundedRect(MARGIN_X, cursorY, CONTENT_W, boxH, 2, 2, 'FD');

    const totalSkus = Math.max(input.storeStats.totalProducts, 1);
    const okW = ((input.storeStats.healthyCount / totalSkus) * (CONTENT_W - 8));
    const lowW = ((input.storeStats.lowStockCount / totalSkus) * (CONTENT_W - 8));
    const outW = Math.max((CONTENT_W - 8) - okW - lowW, 0);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 51, 35);
    doc.text(
      `Catalog Stock Readiness (${input.storeStats.totalProducts} Items):   In Stock: ${input.storeStats.healthyCount}   |   Low Stock: ${input.storeStats.lowStockCount}   |   Depleted: ${input.storeStats.outOfStockCount}`,
      MARGIN_X + 4,
      cursorY + 5.5
    );

    let sx = MARGIN_X + 4;
    if (okW > 0) {
      doc.setFillColor(31, 51, 35);
      doc.rect(sx, cursorY + 8, okW, 3.8, 'F');
      sx += okW;
    }
    if (lowW > 0) {
      doc.setFillColor(207, 163, 58);
      doc.rect(sx, cursorY + 8, lowW, 3.8, 'F');
      sx += lowW;
    }
    if (outW > 0) {
      doc.setFillColor(185, 28, 28);
      doc.rect(sx, cursorY + 8, outW, 3.8, 'F');
    }

    // 3 Movement Summary Pill Boxes (Armee Forest Green, Gold & Slate tints)
    const cardW = (CONTENT_W - 16) / 3;
    const moves = [
      { label: 'INWARD VOUCHERS', val: String(input.storeStats.inCount), bg: [238, 243, 238] as [number, number, number], tc: [31, 51, 35] as [number, number, number] },
      { label: 'OUTWARD ISSUES', val: String(input.storeStats.outCount), bg: [253, 248, 232] as [number, number, number], tc: [145, 108, 20] as [number, number, number] },
      { label: 'RETURNS / DAMAGES', val: String(input.storeStats.defectReturnCount), bg: [241, 245, 249] as [number, number, number], tc: [51, 65, 85] as [number, number, number] },
    ];
    moves.forEach((mv, idx) => {
      const mx = MARGIN_X + 4 + idx * (cardW + 4);
      doc.setFillColor(mv.bg[0], mv.bg[1], mv.bg[2]);
      doc.roundedRect(mx, cursorY + 14.5, cardW, 9, 1.5, 1.5, 'F');
      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mv.tc[0], mv.tc[1], mv.tc[2]);
      doc.text(mv.label, mx + cardW / 2, cursorY + 18, { align: 'center' });
      doc.setFontSize(9);
      doc.text(mv.val, mx + cardW / 2, cursorY + 22, { align: 'center' });
    });

    cursorY += boxH + 7;
  }

  // 6. Top Vendors by Spend
  if (input.topVendors.length > 0) {
    drawSectionTitle('6. TOP VENDORS BY SPEND');
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

  // 7. Pending & Unpaid Bills
  if (input.pendingBills.length > 0) {
    drawSectionTitle('7. PENDING / UNPAID BILLS REQUIRING SETTLEMENT');
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

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
}
