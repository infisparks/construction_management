'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryTransaction } from './inventory-types';
import { drawBarcodeOnPdf } from '@/lib/common/pdf-barcode';
import { registerPoppinsFont } from '@/lib/common/pdf-poppins';
import { uploadInventoryBillToStorage } from '@/lib/supabase/inventory-services';

/**
 * Formats a monetary value safely without using the unicode rupee symbol (₹),
 * which is unsupported in standard PDF fonts and renders as a broken single quote (').
 * Uses standard "Rs." notation with clean Indian comma separators.
 */
export function formatINR(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `Rs. ${Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Resolves a clean, human-readable Serial Item Code for bills and vouchers.
 * Replaces raw UUIDs (e.g. 'd6ddc9b6-50ad-4e52-8399-7a3b2f915cf3') with clean serial numbers like MAT-001.
 */
export function getCleanItemCode(
  materialCode?: string,
  materialId?: string,
  fallbackIndex: number = 1
): string {
  const isUuid = (val?: string) =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

  if (materialCode && materialCode.trim() && !isUuid(materialCode)) {
    return materialCode.trim();
  }
  if (materialId && materialId.trim() && !isUuid(materialId)) {
    return materialId.trim();
  }
  return `MAT-${String(fallbackIndex).padStart(3, '0')}`;
}

/**
 * Generate a certified professional construction site material voucher / bill PDF
 */
export function generateInventoryVoucherPdf(
  transaction: InventoryTransaction,
  projectName: string = 'Noori Crest Tower'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  registerPoppinsFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  const isCheckIn = transaction.type === 'check_in';
  const isCheckOut = transaction.type === 'check_out';
  const isReturn = transaction.type === 'return';
  const isDamage = transaction.type === 'damage';

  // Helper: Convert INR amount to words (supports up to 100+ Cr)
  const amountToWords = (num: number): string => {
    if (!num || num <= 0) return '';
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return a[n] + ' ';
      if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand ' + inWords(n % 1000);
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh ' + inWords(n % 100000);
      return inWords(Math.floor(n / 10000000)) + ' Crore ' + inWords(n % 10000000);
    };
    return `${inWords(Math.round(num)).trim()} Rupees Only`;
  };

  // Color Palette by Transaction Type
  const accentRGB: [number, number, number] = isCheckIn
    ? [16, 185, 129] // Emerald
    : isCheckOut
    ? [101, 62, 241] // Executive Purple #653ef1
    : isReturn
    ? [217, 119, 6] // Amber
    : [225, 29, 72]; // Rose

  const badgeBgRGB: [number, number, number] = isCheckIn
    ? [236, 253, 245]
    : isCheckOut
    ? [245, 243, 255]
    : isReturn
    ? [255, 251, 235]
    : [255, 241, 242];

  // --- 1. Top Executive Brand Band ---
  doc.setFillColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.rect(margin, currentY, pageWidth - margin * 2, 3.2, 'F');
  currentY += 5.5;

  // --- 2. Header Card Container ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 27, 2.5, 2.5, 'FD');

  // Left: Company & Project Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('ARMEE ENTERPRISES • STORE & SUPPLY LOGISTICS', margin + 4.5, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(projectName.toUpperCase(), margin + 4.5, currentY + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Site Gate Office #1 • Plot 48/A, Commercial Business Hub, Mumbai', margin + 4.5, currentY + 17.5);
  doc.text('GSTIN / Store Audit Verified Voucher • Digital ERP Record', margin + 4.5, currentY + 22);

  // Right: Voucher Title Pill, Voucher #, Date & Barcode
  let voucherTitle = 'MATERIAL ISSUE NOTE (MIN)';
  if (isCheckIn) voucherTitle = 'GOODS RECEIPT NOTE (GRN)';
  else if (isReturn) voucherTitle = 'VENDOR RETURN VOUCHER (RET)';
  else if (isDamage) voucherTitle = 'DAMAGE & SCRAP VOUCHER (DMG)';

  doc.setFillColor(badgeBgRGB[0], badgeBgRGB[1], badgeBgRGB[2]);
  doc.setDrawColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.roundedRect(pageWidth - margin - 66, currentY + 3.5, 61.5, 6.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(voucherTitle, pageWidth - margin - 35.25, currentY + 7.8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(transaction.voucherNumber, pageWidth - margin - 4.5, currentY + 14.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${transaction.date}  |  ${transaction.time || '12:00 PM'}`, pageWidth - margin - 4.5, currentY + 18.5, { align: 'right' });

  // Draw Code 39 Barcode cleanly inside right header
  drawBarcodeOnPdf(doc, transaction.voucherNumber, {
    x: pageWidth - margin - 49,
    y: currentY + 20,
    height: 5,
    narrowBarWidth: 0.2,
    includeText: false,
  });

  currentY += 32;

  // --- 3. Two-Column Executive Party & Dispatch Details Cards ---
  const rawEngineer = (transaction.engineerName || transaction.authorizedBy || '').trim();
  const hasEngineer = Boolean(rawEngineer);
  const engineerDisplayName = rawEngineer;

  const cardGap = 4;
  const halfWidth = (pageWidth - margin * 2 - cardGap) / 2;
  const cardHeight = hasEngineer ? 32 : 27;

  // Left Card: Party & Site Location
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, halfWidth, cardHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text(
    isCheckIn || isReturn ? 'SUPPLIER & DELIVERY DETAILS' : 'ISSUED TO & SITE LOCATION',
    margin + 4,
    currentY + 5.5
  );
  doc.setDrawColor(241, 245, 249);
  doc.line(margin + 4, currentY + 7.5, margin + halfWidth - 4, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(isCheckIn || isReturn ? 'Vendor / Party:' : 'Subcontractor:', margin + 4, currentY + 12);
  doc.text(isCheckIn ? 'Challan / Inv #:' : 'Receiving Person:', margin + 4, currentY + 17);
  doc.text(isCheckIn ? 'Vehicle / Truck:' : 'Floor / Zone:', margin + 4, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const leftValMaxW = halfWidth - 33;
  doc.text((transaction.supplierName || transaction.subcontractorName || 'Site Central Store').slice(0, 34), margin + 30, currentY + 12, { maxWidth: leftValMaxW });
  doc.text((transaction.challanNumber || transaction.foremanName || 'Authorized Foreman').slice(0, 34), margin + 30, currentY + 17, { maxWidth: leftValMaxW });
  doc.text((transaction.vehicleNumber || transaction.floorZone || 'Central Site Yard').slice(0, 34), margin + 30, currentY + 22, { maxWidth: leftValMaxW });

  // Right Card: Store & Audit Metadata
  const rightCardX = margin + halfWidth + cardGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightCardX, currentY, halfWidth, cardHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.text('STORE & AUDIT METADATA', rightCardX + 4, currentY + 5.5);
  doc.setDrawColor(241, 245, 249);
  doc.line(rightCardX + 4, currentY + 7.5, rightCardX + halfWidth - 4, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Movement:', rightCardX + 4, currentY + 12);
  doc.text('Storekeeper:', rightCardX + 4, currentY + 17);
  doc.text('WBS / QC Status:', rightCardX + 4, currentY + 22);
  if (hasEngineer) {
    doc.text('Project Engineer:', rightCardX + 4, currentY + 27);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isCheckIn ? 'Inward Check-In (+)' : isCheckOut ? 'Outward Site Issue (-)' : isReturn ? 'Vendor Return (-)' : 'Damage Write-Off (-)',
    rightCardX + 30,
    currentY + 12
  );
  doc.text((transaction.receivedOrIssuedBy || 'Site Storekeeper').slice(0, 30), rightCardX + 30, currentY + 17);
  doc.text(`${transaction.wbsTaskCode || 'SITE-GEN'} • ${transaction.qcStatus || 'VERIFIED'}`, rightCardX + 30, currentY + 22);
  if (hasEngineer) {
    doc.text(engineerDisplayName.slice(0, 30), rightCardX + 30, currentY + 27);
  }

  currentY += cardHeight + 5;

  // --- 4. Callout Box for Return Reason or Damage Reason ---
  if (transaction.returnReason || transaction.damageReason) {
    if (transaction.returnReason) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 13, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(146, 64, 14);
      doc.text('REASON FOR RETURN TO VENDOR:', margin + 4, currentY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(180, 83, 9);
      const returnDesc = `${transaction.returnReason}${transaction.notes ? ` • Note: ${transaction.notes}` : ''}`;
      doc.text(returnDesc, margin + 4, currentY + 9.5, { maxWidth: pageWidth - margin * 2 - 8 });
    } else if (transaction.damageReason) {
      doc.setFillColor(255, 228, 230);
      doc.setDrawColor(244, 63, 94);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(159, 18, 57);
      doc.text('CAUSE FOR MATERIAL DAMAGE / SCRAP WRITE-OFF:', margin + 4, currentY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(190, 18, 60);
      const dmgDesc = `${transaction.damageReason}${transaction.notes ? ` • Note: ${transaction.notes}` : ''}`;
      doc.text(dmgDesc, margin + 4, currentY + 9.5, { maxWidth: pageWidth - margin * 2 - 8 });
    }
    currentY += 18;
  }

  // --- 5. Item & Valuation AutoTable ---
  const itemCode = getCleanItemCode(transaction.materialCode, transaction.materialId, 1);

  const tableData = [
    [
      '1',
      itemCode,
      transaction.brand ? `${transaction.materialName}\nBrand: ${transaction.brand}` : transaction.materialName,
      transaction.category || 'General',
      `${isCheckIn ? '+' : '-'}${transaction.quantity} ${transaction.unit}`,
      transaction.unitRate ? formatINR(transaction.unitRate) : '—',
      transaction.totalAmount ? formatINR(transaction.totalAmount) : '—',
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      { content: '#', styles: { halign: 'center' } },
      'Item Code',
      'Material Description',
      'Category',
      { content: 'Quantity', styles: { halign: 'right' } },
      { content: 'Unit Rate', styles: { halign: 'right' } },
      { content: 'Total Value', styles: { halign: 'right' } },
    ]],
    body: tableData,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 11, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 23, fontStyle: 'bold', textColor: accentRGB },
      2: { cellWidth: 44, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: accentRGB,
      textColor: [255, 255, 255],
      fontSize: 7.8,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      cellPadding: 3.2,
    },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY + 30;
    },
  });

  currentY += 6;

  // --- 6. Financial Summary & Running Store Balance (Side-by-Side) ---
  const summaryRightW = 76;
  const summaryLeftW = pageWidth - margin * 2 - summaryRightW - 5;

  // Left: Amount in Words + Remarks
  let leftBlockY = currentY;
  const totalAmtNum = Number(transaction.totalAmount || 0);
  if (totalAmtNum > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, leftBlockY, summaryLeftW, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('AMOUNT IN WORDS:', margin + 3.5, leftBlockY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(amountToWords(totalAmtNum), margin + 3.5, leftBlockY + 9.5, { maxWidth: summaryLeftW - 7 });
    leftBlockY += 17;
  }

  if (transaction.purpose || transaction.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('FIELD REMARKS & PURPOSE:', margin, leftBlockY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    let noteText = '';
    if (transaction.purpose) noteText += `Purpose: ${transaction.purpose}. `;
    if (transaction.notes) noteText += `${transaction.notes}`;
    doc.text(noteText || 'Material verified by site storekeeper.', margin, leftBlockY + 7.5, {
      maxWidth: summaryLeftW,
    });
  }

  // Right: Valuation & Remaining Stock Box
  const rightBoxX = pageWidth - margin - summaryRightW;
  const rightBoxH = totalAmtNum > 0 ? 27 : 16;

  doc.setFillColor(badgeBgRGB[0], badgeBgRGB[1], badgeBgRGB[2]);
  doc.setDrawColor(accentRGB[0], accentRGB[1], accentRGB[2]);
  doc.roundedRect(rightBoxX, currentY, summaryRightW, rightBoxH, 2, 2, 'FD');

  if (totalAmtNum > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text('Total Voucher Value:', rightBoxX + 4, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(formatINR(totalAmtNum), rightBoxX + summaryRightW - 4, currentY + 6, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(rightBoxX + 4, currentY + 9.5, rightBoxX + summaryRightW - 4, currentY + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text('Updated Store Balance:', rightBoxX + 4, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
    doc.text(`${transaction.runningStockBalance} ${transaction.unit}`, rightBoxX + summaryRightW - 4, currentY + 16, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Live Ledger-Verified Balance', rightBoxX + 4, currentY + 22.5);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Updated Store Balance:', rightBoxX + 4, currentY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(accentRGB[0], accentRGB[1], accentRGB[2]);
    doc.text(
      `${transaction.runningStockBalance} ${transaction.unit}`,
      rightBoxX + summaryRightW - 4,
      currentY + 7.5,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Live Ledger-Verified Balance', rightBoxX + 4, currentY + 12.5);
  }

  currentY += Math.max(rightBoxH + 8, 30);

  // --- 7. Certified Sign-Off Block ---
  const signBlockY = Math.max(currentY + 12, pageHeight - margin - 26);

  const receiverLabel = isCheckIn
    ? transaction.driverName || 'Driver / Transporter'
    : isReturn
    ? transaction.supplierName || 'Vendor Representative'
    : transaction.foremanName || 'Receiving Supervisor';

  const receiverSubtext = isCheckIn
    ? 'Driver / Carrier Signature'
    : isReturn
    ? 'Vendor Acknowledgment'
    : 'Contractor / Foreman Signature';

  if (hasEngineer) {
    const signColWidth = (pageWidth - margin * 2) / 3;

    doc.setDrawColor(148, 163, 184);
    doc.line(margin + 2, signBlockY, margin + signColWidth - 8, signBlockY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(transaction.receivedOrIssuedBy || 'Site Storekeeper', margin + 2, signBlockY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Storekeeper / Dispatch Incharge', margin + 2, signBlockY + 8);

    const sign2X = margin + signColWidth + 4;
    doc.line(sign2X, signBlockY, sign2X + signColWidth - 10, signBlockY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(receiverLabel, sign2X, signBlockY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(receiverSubtext, sign2X, signBlockY + 8);

    const sign3X = margin + signColWidth * 2 + 6;
    doc.line(sign3X, signBlockY, sign3X + signColWidth - 10, signBlockY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(engineerDisplayName, sign3X, signBlockY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Project Engineer / Site PM', sign3X, signBlockY + 8);
  } else {
    const signColWidth = (pageWidth - margin * 2) / 2;

    doc.setDrawColor(148, 163, 184);
    doc.line(margin + 4, signBlockY, margin + signColWidth - 16, signBlockY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(transaction.receivedOrIssuedBy || 'Site Storekeeper', margin + 4, signBlockY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Storekeeper / Dispatch Incharge', margin + 4, signBlockY + 8);

    const sign2X = margin + signColWidth + 12;
    doc.line(sign2X, signBlockY, sign2X + signColWidth - 12, signBlockY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(receiverLabel, sign2X, signBlockY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(receiverSubtext, sign2X, signBlockY + 8);
  }

  // Footer Bar
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - margin - 4, pageWidth - margin, pageHeight - margin - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'System-Verified Digital Store Voucher • Armee Enterprises Construction ERP • Tamper-Proof Ledger',
    pageWidth / 2,
    pageHeight - margin + 1,
    { align: 'center' }
  );

  return doc;
}

/**
 * Creates a Blob URL for the Voucher PDF and returns both url and blob
 */
export function getInventoryVoucherPdfBlobUrl(
  transaction: InventoryTransaction,
  projectName?: string
): { blobUrl: string; blob: Blob } {
  const doc = generateInventoryVoucherPdf(transaction, projectName);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, blob };
}

/**
 * Opens the voucher PDF directly in a new window/tab via blob URL
 */
export function downloadInventoryVoucherPdf(
  transaction: InventoryTransaction,
  projectName?: string
): string {
  const { blobUrl } = getInventoryVoucherPdfBlobUrl(transaction, projectName);
  window.open(blobUrl, '_blank');
  return blobUrl;
}

/**
 * Opens the voucher PDF in a new tab via blob URL
 */
export function viewInventoryVoucherPdfInNewTab(
  transaction: InventoryTransaction,
  projectName?: string
): string {
  const { blobUrl } = getInventoryVoucherPdfBlobUrl(transaction, projectName);
  window.open(blobUrl, '_blank');
  return blobUrl;
}

/**
 * Generates the official voucher PDF, converts it to a File, and uploads to Supabase Storage
 * bucket 'inventory-documents/vouchers' so that a genuine public HTTPS URL is available for WhatsApp.
 */
export async function uploadOrGetVoucherPdfUrl(
  transaction: InventoryTransaction,
  projectName?: string
): Promise<{ publicUrl: string; fileName: string }> {
  const { blob } = getInventoryVoucherPdfBlobUrl(transaction, projectName);
  const cleanVoucher = (transaction.voucherNumber || 'voucher').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Voucher_${cleanVoucher}.pdf`;
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const result = await uploadInventoryBillToStorage(file, 'vouchers');
  return {
    publicUrl: result.publicUrl,
    fileName: fileName,
  };
}

/**
 * Generate a comprehensive Consolidated Material Checkout Statement & History Bill (PDF)
 * Listing all times and places this material was checked out to subcontractors
 */
export function generateMaterialCheckoutHistoryPdf(
  material: {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    averageUnitRate: number;
    storageLocation: string;
    brand?: string;
  },
  checkouts: InventoryTransaction[],
  projectName: string = 'Noori Crest Tower'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  registerPoppinsFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // 1. Top Accent Bar
  doc.setFillColor(4, 47, 56); // Deep Spruce / Teal #042f38
  doc.rect(margin, currentY, pageWidth - margin * 2, 4, 'F');
  currentY += 8;

  // 2. Organization Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text(projectName, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Central Construction Site Materials Store & Supply Logistics Division', margin, currentY + 4.5);
  doc.text('Site Issue Register & Subcontractor Material Consumption Ledger', margin, currentY + 8.5);

  // Document Title on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(4, 47, 56);
  doc.text('MATERIAL CHECKOUT BILL & STATEMENT', pageWidth - margin, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`MATERIAL: ${material.code}`, pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const today = new Date().toISOString().split('T')[0];
  doc.text(`GENERATED: ${today} | 100% AUDIT VERIFIED`, pageWidth - margin, currentY + 9, { align: 'right' });

  currentY += 15;

  // 3. Material Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 25, 2, 2, 'FD');

  const totalIssuedQty = checkouts.reduce((sum, t) => sum + t.quantity, 0);
  const totalValuation = totalIssuedQty * material.averageUnitRate;

  const colW = (pageWidth - margin * 2) / 4;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('MATERIAL ITEM NAME', margin + 3, currentY + 5);
  doc.text('CATEGORY & BRAND', margin + colW + 3, currentY + 5);
  doc.text('TOTAL CHECKED OUT TO SITE', margin + colW * 2 + 3, currentY + 5);
  doc.text('CURRENT STORE BALANCE', margin + colW * 3 + 3, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(material.name.slice(0, 26), margin + 3, currentY + 10.5);
  doc.text(`${material.category} (${material.brand || 'Standard'})`.slice(0, 26), margin + colW + 3, currentY + 10.5);
  doc.setTextColor(79, 70, 229);
  doc.text(`${totalIssuedQty} ${material.unit}`, margin + colW * 2 + 3, currentY + 10.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`${material.currentStock} ${material.unit}`, margin + colW * 3 + 3, currentY + 10.5);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('STORAGE LOCATION', margin + 3, currentY + 17);
  doc.text('AVERAGE UNIT RATE', margin + colW + 3, currentY + 17);
  doc.text('TOTAL DISPATCH VALUATION', margin + colW * 2 + 3, currentY + 17);
  doc.text('TOTAL CHECKOUT ENTRIES', margin + colW * 3 + 3, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(material.storageLocation.slice(0, 26), margin + 3, currentY + 21.5);
  doc.text(formatINR(material.averageUnitRate), margin + colW + 3, currentY + 21.5);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(totalValuation), margin + colW * 2 + 3, currentY + 21.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${checkouts.length} Checkouts`, margin + colW * 3 + 3, currentY + 21.5);

  currentY += 29;

  // 4. AutoTable of all checkouts
  const tableRows = checkouts.map((tx, idx) => [
    String(idx + 1),
    tx.voucherNumber,
    `${tx.date}\n${tx.time}`,
    (tx.subcontractorName || 'Site Agency').slice(0, 24),
    (tx.floorZone || 'Ground').slice(0, 20),
    (tx.purpose || 'Site Execution').slice(0, 26),
    `-${tx.quantity} ${tx.unit}`,
    tx.runningStockBalance !== undefined ? `${tx.runningStockBalance} ${tx.unit}` : '—',
    (tx.authorizedBy || 'Er. Amit Verma').slice(0, 16),
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      ['#', 'MIN Voucher', 'Date / Time', 'Subcontractor Agency', 'Floor / Zone', 'Purpose / Work Area', 'Qty Issued', 'Balance', 'Authorized By']
    ],
    body: tableRows,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: 32 },
      6: { cellWidth: 17, halign: 'right', fontStyle: 'bold', textColor: [4, 47, 56] },
      7: { cellWidth: 14, halign: 'right' },
      8: { cellWidth: 18 },
    },
    styles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [4, 47, 56],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
    },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY + 40;
    },
  });

  currentY += 6;

  // Grand Total Summary Line
  doc.setFillColor(240, 247, 248); // light teal tint
  doc.setDrawColor(184, 223, 229);
  doc.roundedRect(pageWidth - margin - 85, currentY, 85, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(4, 47, 56);
  doc.text('Grand Total Issued to Site:', pageWidth - margin - 81, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text(
    `${totalIssuedQty} ${material.unit} (${formatINR(totalValuation)})`,
    pageWidth - margin - 81,
    currentY + 10.5
  );

  currentY += 20;

  // Sign-off Block
  const signBlockY = Math.max(currentY + 6, pageHeight - margin - 26);
  const signColWidth = (pageWidth - margin * 2) / 3;

  // Sign 1: Store Incharge
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 5, signBlockY, margin + signColWidth - 10, signBlockY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text('Ravi Kumar', margin + 5, signBlockY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Storekeeper / Dispatch Ledger Incharge', margin + 5, signBlockY + 7.5);

  // Sign 2: Site QS / Cost Controller
  const sign2X = margin + signColWidth + 5;
  doc.line(sign2X, signBlockY, sign2X + signColWidth - 15, signBlockY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text('Er. Priya Sharma', sign2X, signBlockY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Site QS & Billing Engineer', sign2X, signBlockY + 7.5);

  // Sign 3: Project Manager
  const sign3X = margin + signColWidth * 2 + 5;
  doc.line(sign3X, signBlockY, sign3X + signColWidth - 15, signBlockY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text('Er. Amit Verma', sign3X, signBlockY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Project Director / Resident Engineer', sign3X, signBlockY + 7.5);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Certified Site Issue Register. Generated from Armee Enterprises PMS Material Store Module. Official record for audit & subcontractor billing.',
    pageWidth / 2,
    pageHeight - margin + 2,
    { align: 'center' }
  );

  return doc;
}

/**
 * Creates Blob URL for the Checkout History Statement PDF
 */
export function getMaterialCheckoutHistoryPdfBlobUrl(
  material: {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    averageUnitRate: number;
    storageLocation: string;
    brand?: string;
  },
  checkouts: InventoryTransaction[],
  projectName?: string
): { blobUrl: string; blob: Blob } {
  const doc = generateMaterialCheckoutHistoryPdf(material, checkouts, projectName);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, blob };
}

/**
 * Downloads the Consolidated Material Checkout Statement PDF
 */
export function downloadMaterialCheckoutHistoryPdf(
  material: {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    averageUnitRate: number;
    storageLocation: string;
    brand?: string;
  },
  checkouts: InventoryTransaction[],
  projectName?: string
): string {
  const { blobUrl } = getMaterialCheckoutHistoryPdfBlobUrl(material, checkouts, projectName);
  window.open(blobUrl, '_blank');
  return blobUrl;
}

/**
 * Opens Consolidated Checkout Statement PDF in a new tab via blob URL
 */
export function viewMaterialCheckoutHistoryPdfInNewTab(
  material: {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    averageUnitRate: number;
    storageLocation: string;
    brand?: string;
  },
  checkouts: InventoryTransaction[],
  projectName?: string
): string {
  const { blobUrl } = getMaterialCheckoutHistoryPdfBlobUrl(material, checkouts, projectName);
  window.open(blobUrl, '_blank');
  return blobUrl;
}

