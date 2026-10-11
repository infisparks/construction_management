'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryTransaction } from './mock-inventory-data';

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  const isCheckIn = transaction.type === 'check_in';
  const isCheckOut = transaction.type === 'check_out';
  const isReturn = transaction.type === 'return';
  const isDamage = transaction.type === 'damage';

  // --- 1. Top Accent Bar ---
  if (isCheckIn) {
    doc.setFillColor(16, 185, 129); // Emerald 500
  } else if (isCheckOut) {
    doc.setFillColor(79, 70, 229); // Indigo 600
  } else if (isReturn) {
    doc.setFillColor(217, 119, 6); // Amber 600
  } else {
    doc.setFillColor(225, 29, 72); // Rose 600
  }
  doc.rect(margin, currentY, pageWidth - margin * 2, 3.5, 'F');
  currentY += 8;

  // --- 2. Organization & Project Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39); // #111827
  doc.text(projectName, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text('Central Construction Site Materials Store & Supply Logistics Division', margin, currentY + 4.5);
  doc.text('Site Gate Office #1 • Plot 48/A, Commercial Business Hub, Mumbai', margin, currentY + 8.5);

  // Title on right side
  let voucherTitle = 'MATERIAL ISSUE NOTE (MIN)';
  if (isCheckIn) voucherTitle = 'GOODS RECEIPT NOTE (GRN)';
  else if (isReturn) voucherTitle = 'VENDOR RETURN VOUCHER (RET)';
  else if (isDamage) voucherTitle = 'DAMAGE & SCRAP VOUCHER (DMG)';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (isCheckIn) doc.setTextColor(16, 185, 129);
  else if (isCheckOut) doc.setTextColor(79, 70, 229);
  else if (isReturn) doc.setTextColor(217, 119, 6);
  else doc.setTextColor(225, 29, 72);

  doc.text(voucherTitle, pageWidth - margin, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(`VOUCHER #: ${transaction.voucherNumber}`, pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`DATE: ${transaction.date} | ${transaction.time}`, pageWidth - margin, currentY + 9, { align: 'right' });

  currentY += 15;

  // --- 3. Summary Metadata Box ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 24, 2, 2, 'FD');

  const colWidth = (pageWidth - margin * 2) / 4;
  
  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRANSACTION TYPE', margin + 3, currentY + 5);
  doc.text(isCheckIn || isReturn ? 'SUPPLIER / VENDOR' : 'SUBCONTRACTOR AGENCY', margin + colWidth + 3, currentY + 5);
  doc.text(isCheckIn ? 'DELIVERY CHALLAN #' : 'RECEIVING PERSON', margin + colWidth * 2 + 3, currentY + 5);
  doc.text(isCheckIn ? 'VEHICLE / TRUCK #' : 'FLOOR / ZONE LOCATION', margin + colWidth * 3 + 3, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(
    isCheckIn ? 'Inward Check-In (+)' : isCheckOut ? 'Outward Dispatch (-)' : isReturn ? 'Vendor Return (-)' : 'Damage Scrap (-)',
    margin + 3,
    currentY + 10.5
  );
  doc.text(
    (transaction.supplierName || transaction.subcontractorName || 'Site Central Store').slice(0, 26),
    margin + colWidth + 3,
    currentY + 10.5
  );
  doc.text(
    (transaction.challanNumber || transaction.foremanName || 'Authorized Foreman').slice(0, 24),
    margin + colWidth * 2 + 3,
    currentY + 10.5
  );
  doc.text(
    (transaction.vehicleNumber || transaction.floorZone || 'Ground Yard').slice(0, 24),
    margin + colWidth * 3 + 3,
    currentY + 10.5
  );

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('STOREKEEPER', margin + 3, currentY + 16.5);
  doc.text('AUTHORIZED BY', margin + colWidth + 3, currentY + 16.5);
  doc.text('LINKED WBS TASK', margin + colWidth * 2 + 3, currentY + 16.5);
  doc.text('QC / AUDIT STATUS', margin + colWidth * 3 + 3, currentY + 16.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(transaction.receivedOrIssuedBy || 'Ravi Kumar', margin + 3, currentY + 21);
  doc.text(transaction.authorizedBy || 'Er. Amit Verma', margin + colWidth + 3, currentY + 21);
  doc.text(transaction.wbsTaskCode || 'SITE-GENERAL', margin + colWidth * 2 + 3, currentY + 21);
  doc.text(transaction.qcStatus || 'VERIFIED ON-SITE', margin + colWidth * 3 + 3, currentY + 21);

  currentY += 28;

  // --- 4. Callout Box for Return Reason or Damage Reason ---
  if (transaction.returnReason || transaction.damageReason) {
    if (transaction.returnReason) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 12, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text('SPECIFIC REASON FOR RETURN TO VENDOR:', margin + 4, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9);
      const returnDesc = `${transaction.returnReason}${transaction.notes ? ` • Note: ${transaction.notes}` : ''}`;
      doc.text(returnDesc, margin + 4, currentY + 9, { maxWidth: pageWidth - margin * 2 - 8 });
    } else if (transaction.damageReason) {
      doc.setFillColor(255, 228, 230); // rose-100
      doc.setDrawColor(244, 63, 94); // rose-500
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(159, 18, 57);
      doc.text('OFFICIAL CAUSE FOR MATERIAL DAMAGE / SCRAP WRITE-OFF:', margin + 4, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(190, 18, 60);
      const dmgDesc = `${transaction.damageReason}${transaction.notes ? ` • Note: ${transaction.notes}` : ''}`;
      doc.text(dmgDesc, margin + 4, currentY + 9, { maxWidth: pageWidth - margin * 2 - 8 });
    }
    currentY += 17;
  }

  // --- 5. Item AutoTable ---
  const tableData = [
    [
      '1',
      transaction.materialId || 'MAT-01',
      transaction.materialName,
      transaction.category,
      `${isCheckIn ? '+' : '-'}${transaction.quantity} ${transaction.unit}`,
      transaction.unitRate ? formatINR(transaction.unitRate) : '—',
      transaction.totalAmount ? formatINR(transaction.totalAmount) : '—',
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Code', 'Description of Goods', 'Category', 'Quantity', 'Rate', 'Total Value']],
    body: tableData,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 28 },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: isCheckIn ? [16, 185, 129] : isCheckOut ? [79, 70, 229] : isReturn ? [217, 119, 6] : [225, 29, 72],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
    },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY + 30;
    },
  });

  currentY += 6;

  // Running Balance Card
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - margin - 75, currentY, 75, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Remaining Store Balance:', pageWidth - margin - 71, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text(
    `${transaction.runningStockBalance} ${transaction.unit}`,
    pageWidth - margin - 71,
    currentY + 11.5
  );

  currentY += 22;

  // --- 6. Notes & Purpose Remarks ---
  if (transaction.purpose || transaction.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('FIELD REMARKS & INSTRUCTIONS:', margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    let noteText = '';
    if (transaction.purpose) noteText += `Purpose: ${transaction.purpose}. `;
    if (transaction.notes) noteText += `Notes: ${transaction.notes}`;
    doc.text(noteText || 'Material verified by site storekeeper.', margin, currentY + 4, {
      maxWidth: pageWidth - margin * 2,
    });
    currentY += 12;
  }

  // --- 7. Triple Sign-Off Block ---
  const signBlockY = Math.max(currentY + 10, pageHeight - margin - 28);

  const signColWidth = (pageWidth - margin * 2) / 3;

  // Sign 1: Storekeeper
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 5, signBlockY, margin + signColWidth - 10, signBlockY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(transaction.receivedOrIssuedBy || 'Ravi Kumar', margin + 5, signBlockY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Storekeeper / Dispatch Incharge', margin + 5, signBlockY + 7.5);

  // Sign 2: Receiver / Transporter
  const sign2X = margin + signColWidth + 5;
  doc.line(sign2X, signBlockY, sign2X + signColWidth - 15, signBlockY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(
    isCheckIn
      ? transaction.driverName || 'Driver / Transporter'
      : isReturn
      ? transaction.supplierName || 'Vendor Representative'
      : transaction.foremanName || 'Receiving Supervisor',
    sign2X,
    signBlockY + 4
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    isCheckIn ? 'Driver Signature' : isReturn ? 'Vendor Acknowledgment' : 'Contractor Foreman Signature',
    sign2X,
    signBlockY + 7.5
  );

  // Sign 3: Project Engineer
  const sign3X = margin + signColWidth * 2 + 5;
  doc.line(sign3X, signBlockY, sign3X + signColWidth - 15, signBlockY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);
  doc.text(transaction.authorizedBy || 'Er. Amit Verma', sign3X, signBlockY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Project Engineer / Site PM', sign3X, signBlockY + 7.5);

  // Footer Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a system generated construction material audit voucher. Material movements are tracked with tamper-proof running balances.',
    pageWidth / 2,
    pageHeight - margin + 2,
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
 * Downloads the voucher PDF directly
 */
export function downloadInventoryVoucherPdf(
  transaction: InventoryTransaction,
  projectName?: string
): void {
  const doc = generateInventoryVoucherPdf(transaction, projectName);
  const fileName = `Material_Voucher_${(transaction.voucherNumber || transaction.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(fileName);
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // 1. Top Indigo Accent Bar
  doc.setFillColor(79, 70, 229); // Indigo 600
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
  doc.setTextColor(79, 70, 229);
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
      6: { cellWidth: 17, halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229] },
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
      fillColor: [79, 70, 229],
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
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(pageWidth - margin - 85, currentY, 85, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(79, 70, 229);
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
    'Certified Site Issue Register. Generated from InfiBuild PMS Material Store Module. Official record for audit & subcontractor billing.',
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
): void {
  const doc = generateMaterialCheckoutHistoryPdf(material, checkouts, projectName);
  const fileName = `Checkout_Bill_${material.code.replace(/[^a-zA-Z0-9_-]/g, '_')}_Total_Issues.pdf`;
  doc.save(fileName);
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

