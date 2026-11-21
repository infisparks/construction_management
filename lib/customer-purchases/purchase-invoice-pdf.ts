import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomerPurchase, CustomerPayment } from './types';
import { drawBarcodeOnPdf } from '@/lib/common/pdf-barcode';

// Format currency as Rs. X,XX,XXX (Plain ASCII - safe for all PDF engines)
function formatRs(num: number): string {
  const safeNum = Number(num) || 0;
  return `Rs. ${safeNum.toLocaleString('en-IN')}`;
}

// Convert numbers to Indian Rupees in words
function numberToWordsINR(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + ' Crore ' + inWords(n % 10000000);
  }

  const rounded = Math.round(num);
  return `${inWords(rounded).trim()} Rupees Only`;
}

export interface PdfOptions {
  companyName?: string;
  companyContact?: string;
  projectName?: string;
  projectCode?: string;
}

function resolveOptions(opt?: string | PdfOptions): PdfOptions {
  if (!opt) return {};
  if (typeof opt === 'string') return { projectName: opt };
  return opt;
}

/**
 * 1. Generate Individual Payment Receipt Voucher Slip with Scannable Barcode
 */
export function generatePaymentReceiptSlipPdf(
  arg1: CustomerPurchase | CustomerPayment,
  arg2: CustomerPurchase | CustomerPayment,
  opt?: string | PdfOptions
): jsPDF {
  let purchase: CustomerPurchase;
  let payment: CustomerPayment;

  if ('dealNumber' in arg1 || 'deal_number' in arg1) {
    purchase = arg1 as CustomerPurchase;
    payment = arg2 as CustomerPayment;
  } else {
    payment = arg1 as CustomerPayment;
    purchase = arg2 as CustomerPurchase;
  }

  const options = resolveOptions(opt);
  const companyName = options.companyName || 'Armee Enterprises Construction ERP';
  const companyContact = options.companyContact || '+91 98450 11982 • accounts@armee.com';
  const projectName = options.projectName || purchase.project?.name || 'Site Office';
  const projectCode = options.projectCode || purchase.project?.code || (purchase.project?.serial_no ? `SITE-${purchase.project.serial_no}` : 'SITE');

  const dealNo = purchase.deal_number || purchase.dealNumber || 'DEAL';
  const custName = purchase.customer_name || purchase.customerName || 'Valued Client';
  const receiptNo = payment.receipt_voucher_no || payment.receiptVoucherNo || 'REC';
  const payDate = payment.payment_date || payment.paymentDate || new Date().toISOString().slice(0, 10);
  const payAmt = Number(payment.amount_paid ?? payment.amountPaid ?? 0);
  const payMode = payment.payment_mode || payment.paymentMode || 'Cash';
  const refNo = payment.reference_no ?? payment.referenceNo ?? 'N/A';
  const recBy = payment.received_by ?? payment.receivedBy ?? 'Authorized Cashier';
  const pType = purchase.purchase_type || purchase.purchaseType || 'Unit / Room';
  const uNum = purchase.unit_number ?? purchase.unitNumber ?? 'General Unit';
  const totDeal = Number(purchase.total_amount ?? purchase.totalAmount ?? 0);
  const totColl = Number(purchase.totalCollected ?? 0);
  const balRem = Math.max(0, totDeal - totColl);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // --- Top Header Accent Band ---
  doc.setFillColor(99, 56, 235); // Modern Vibrant Purple #6338eb
  doc.rect(margin, currentY, pageWidth - margin * 2, 4, 'F');
  currentY += 8;

  // --- Company Brand & Document Title ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text(companyName.toUpperCase(), margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CONSTRUCTION ERP • REAL ESTATE COMMERCIAL SUITE', margin, currentY + 4.5);
  doc.text(`${companyContact} • Site: ${projectName}`, margin, currentY + 8.5);

  // Top-Right Voucher & Date Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(99, 56, 235);
  doc.text('PAYMENT RECEIPT VOUCHER', pageWidth - margin, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`VOUCHER #: ${receiptNo}`, pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`DATE: ${payDate}`, pageWidth - margin, currentY + 9, { align: 'right' });

  // Barcode Box
  const barcodeBoxWidth = 52;
  const barcodeBoxHeight = 15;
  const barcodeX = pageWidth - margin - barcodeBoxWidth;
  const barcodeY = currentY + 12;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(barcodeX, barcodeY, barcodeBoxWidth, barcodeBoxHeight, 2, 2, 'FD');

  drawBarcodeOnPdf(doc, receiptNo, {
    x: barcodeX + 4,
    y: barcodeY + 2.5,
    height: 7,
    narrowBarWidth: 0.22,
    includeText: false,
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`CODE 39 VERIFIED: ${receiptNo}`, barcodeX + barcodeBoxWidth / 2, barcodeY + 13, { align: 'center' });

  currentY += 30;

  // Thin separator
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.6);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // --- Hero Inward Amount Received Card ---
  doc.setFillColor(245, 243, 255); // Soft purple-50
  doc.setDrawColor(221, 214, 254);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(99, 56, 235);
  doc.text('AMOUNT RECEIVED IN CASH / BANK (INR):', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(payAmt), margin + 6, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Amount in Words: ${numberToWordsINR(payAmt)}`, margin + 68, currentY + 17);

  currentY += 30;

  // --- Two-Column Particulars Grid ---
  const colGap = 6;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;
  const boxHeight = 52;

  // Left Column: Buyer & Deal Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, boxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(99, 56, 235);
  doc.text('BUYER & BOOKING PARTICULARS', margin + 5, currentY + 7);

  const leftLabels = [
    ['Customer Name:', custName],
    ['Deal Reference #:', dealNo],
    ['Site / Project:', projectName],
    ['Category & Unit:', `${pType} • Unit: ${uNum}`],
    ['Contact Phone:', purchase.customer_phone || purchase.customerPhone || 'N/A'],
    ['Buyer Address:', purchase.customer_address || purchase.customerAddress || 'On Record'],
  ];

  let lineY = currentY + 14;
  leftLabels.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin + 5, lineY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), margin + 35, lineY);
    lineY += 6.5;
  });

  // Right Column: Payment Settlement Ledger
  const rightX = margin + colWidth + colGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, currentY, colWidth, boxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(99, 56, 235);
  doc.text('SETTLEMENT & RUNNING ACCOUNT', rightX + 5, currentY + 7);

  const rightLabels = [
    ['Payment Mode:', payMode],
    ['Reference / UTR #:', refNo],
    ['Collected By:', recBy],
    ['Total Agreed Deal:', formatRs(totDeal)],
    ['Total Received So Far:', formatRs(totColl)],
    ['Outstanding Balance:', formatRs(balRem)],
  ];

  lineY = currentY + 14;
  rightLabels.forEach(([label, val], idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, rightX + 5, lineY);

    doc.setFont('helvetica', idx === 5 ? 'bold' : 'normal');
    if (idx === 5) {
      doc.setTextColor(balRem > 0 ? 180 : 16, balRem > 0 ? 83 : 185, balRem > 0 ? 9 : 129);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(String(val), rightX + 40, lineY);
    lineY += 6.5;
  });

  currentY += boxHeight + 8;

  // Remarks / Voucher Notes
  if (payment.notes || purchase.notes) {
    doc.setFillColor(254, 252, 232); // Amber-50
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 98, 7);
    doc.text('REMARKS / PAYMENT PARTICULARS:', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(payment.notes || purchase.notes || '', margin + 4, currentY + 10);
    currentY += 18;
  }

  // Terms and Conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TERMS & CONDITIONS:', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    '1. This receipt is computer-generated and verified with an official scannable Code 39 barcode.\n' +
    '2. Cheques / RTGS / Online transfers are subject to real-time realization in company accounts.\n' +
    '3. This voucher serves as official proof of payment against the referenced Deal & Unit.',
    margin,
    currentY + 4
  );

  // Signatures
  const signY = pageHeight - 38;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin + 10, signY, margin + 65, signY);
  doc.line(pageWidth - margin - 65, signY, pageWidth - margin - 10, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer / Buyer Signature', margin + 37.5, signY + 4.5, { align: 'center' });
  doc.text('Authorized Signatory & Seal', pageWidth - margin - 37.5, signY + 4.5, { align: 'center' });

  // Footer Watermark
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official PMS Payment Voucher • Barcode: ${receiptNo} • Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
}

/**
 * 2. Generate Full Deal Commercial Statement Bill with Barcode
 */
export function generatePurchaseStatementPdf(
  purchase: CustomerPurchase,
  opt?: string | PdfOptions
): jsPDF {
  const options = resolveOptions(opt);
  const companyName = options.companyName || 'Armee Enterprises Construction ERP';
  const companyContact = options.companyContact || '+91 98450 11982 • accounts@armee.com';
  const projectName = options.projectName || purchase.project?.name || 'Site Office';
  const projectCode = options.projectCode || purchase.project?.code || (purchase.project?.serial_no ? `SITE-${purchase.project.serial_no}` : 'SITE');

  const dealNo = purchase.deal_number || purchase.dealNumber || 'DEAL';
  const custName = purchase.customer_name || purchase.customerName || 'Valued Client';
  const pType = purchase.purchase_type || purchase.purchaseType || 'Unit / Room';
  const uNum = purchase.unit_number ?? purchase.unitNumber ?? 'General Unit';
  const bookDate = purchase.booking_date || purchase.bookingDate || new Date().toISOString().slice(0, 10);
  const totDeal = Number(purchase.total_amount ?? purchase.totalAmount ?? 0);
  const totColl = Number(purchase.totalCollected ?? 0);
  const balRem = Math.max(0, totDeal - totColl);
  const payments = purchase.payments || [];
  const percentCollected = totDeal > 0 ? Math.min(100, Math.round((totColl / totDeal) * 100)) : 0;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // --- Top Header Accent Band ---
  doc.setFillColor(99, 56, 235); // Modern Vibrant Purple #6338eb
  doc.rect(margin, currentY, pageWidth - margin * 2, 4, 'F');
  currentY += 8;

  // --- Company Branding & Subtitle ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text(companyName.toUpperCase(), margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('COMMERCIAL PROPERTY SALES & BOOKING LEDGER STATEMENT', margin, currentY + 4.5);
  doc.text(`${companyContact} • Site: ${projectName}`, margin, currentY + 8.5);

  // Top-Right Title Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(99, 56, 235);
  doc.text('PURCHASE BILL & STATEMENT', pageWidth - margin, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`DEAL #: ${dealNo}`, pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`BOOKING DATE: ${bookDate}`, pageWidth - margin, currentY + 9, { align: 'right' });

  // Code 39 Barcode Frame
  const barcodeBoxWidth = 54;
  const barcodeBoxHeight = 15;
  const barcodeX = pageWidth - margin - barcodeBoxWidth;
  const barcodeY = currentY + 12;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(barcodeX, barcodeY, barcodeBoxWidth, barcodeBoxHeight, 2, 2, 'FD');

  drawBarcodeOnPdf(doc, dealNo, {
    x: barcodeX + 4,
    y: barcodeY + 2.5,
    height: 7,
    narrowBarWidth: 0.22,
    includeText: false,
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`SCANNABLE BARCODE: ${dealNo}`, barcodeX + barcodeBoxWidth / 2, barcodeY + 13, { align: 'center' });

  currentY += 30;

  // Thin separator
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.6);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // --- 3 Executive Financial Metric Cards ---
  const cardGap = 4;
  const cardWidth = (pageWidth - margin * 2 - cardGap * 2) / 3;
  const cardHeight = 22;

  // Card 1: Total Deal Value
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CONTRACT VALUE', margin + 5, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(totDeal), margin + 5, currentY + 16.5);

  // Card 2: Total Collected Inflow
  const c2X = margin + cardWidth + cardGap;
  doc.setFillColor(240, 253, 244); // Emerald-50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(c2X, currentY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text(`TOTAL REALIZED INFLOW (${percentCollected}%)`, c2X + 5, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(21, 128, 61);
  doc.text(formatRs(totColl), c2X + 5, currentY + 16.5);

  // Card 3: Balance Remaining
  const c3X = c2X + cardWidth + cardGap;
  doc.setFillColor(255, 251, 235); // Amber-50
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(c3X, currentY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('BALANCE DUE TO SETTLE', c3X + 5, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(180, 83, 9);
  doc.text(formatRs(balRem), c3X + 5, currentY + 16.5);

  currentY += cardHeight + 8;

  // --- Two Particulars Cards (Customer vs Property) ---
  const colGap = 6;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;
  const boxHeight = 44;

  // Left Card: Customer Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, boxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(99, 56, 235);
  doc.text('BUYER PARTICULARS', margin + 5, currentY + 7);

  const leftItems = [
    ['Customer Name:', custName],
    ['Contact Phone:', purchase.customer_phone || purchase.customerPhone || 'N/A'],
    ['Email Address:', purchase.customer_email || purchase.customerEmail || 'N/A'],
    ['Billing Address:', purchase.customer_address || purchase.customerAddress || 'On File'],
  ];

  let lineY = currentY + 14;
  leftItems.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, margin + 5, lineY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), margin + 30, lineY);
    lineY += 6.5;
  });

  // Right Card: Unit & Property Specification
  const rightX = margin + colWidth + colGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, currentY, colWidth, boxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(99, 56, 235);
  doc.text('PROPERTY & UNIT ALLOCATION', rightX + 5, currentY + 7);

  const rightItems = [
    ['Site / Project:', projectName],
    ['Category Type:', pType],
    ['Unit / Flat #:', uNum],
    ['Booking Status:', (purchase.status || 'Active').toUpperCase()],
  ];

  lineY = currentY + 14;
  rightItems.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, rightX + 5, lineY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), rightX + 30, lineY);
    lineY += 6.5;
  });

  currentY += boxHeight + 8;

  // --- Inward Payments History Ledger Table ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`INWARD COLLECTIONS & PAYMENT VOUCHERS (${payments.length}):`, margin, currentY);
  currentY += 3;

  const paymentRows = payments.map((p, idx) => {
    const vNo = p.receipt_voucher_no || p.receiptVoucherNo || '';
    const pDate = p.payment_date || p.paymentDate || '';
    const pMode = p.payment_mode || p.paymentMode || 'Cash';
    const ref = p.reference_no ?? p.referenceNo ?? '-';
    const rec = p.received_by ?? p.receivedBy ?? '-';
    const amt = Number(p.amount_paid ?? p.amountPaid ?? 0);
    return [
      String(idx + 1),
      vNo,
      pDate,
      pMode,
      ref,
      rec,
      formatRs(amt),
    ];
  });

  if (paymentRows.length === 0) {
    paymentRows.push(['-', 'No installments or advance payments recorded yet', '-', '-', '-', '-', 'Rs. 0']);
  }

  // Summary Row at the bottom of Table
  paymentRows.push([
    '',
    'TOTAL REALIZED PAYMENTS',
    '',
    '',
    '',
    '',
    formatRs(totColl),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Voucher #', 'Date', 'Payment Mode', 'Ref / Cheque #', 'Received By', 'Amount (Rs.)']],
    body: paymentRows,
    theme: 'grid',
    headStyles: {
      fillColor: [99, 56, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 28 },
      4: { cellWidth: 30 },
      5: { cellWidth: 26 },
      6: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Style the final Total summary row
      if (data.row.index === paymentRows.length - 1 && paymentRows.length > 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Notes Callout Box
  if (purchase.notes) {
    doc.setFillColor(254, 252, 232); // Amber-50
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 98, 7);
    doc.text('DEAL TERMS & PARTICULARS:', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(purchase.notes, margin + 4, currentY + 10);
    currentY += 18;
  }

  // Signatures block
  const signY = pageHeight - 38;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin + 10, signY, margin + 65, signY);
  doc.line(pageWidth - margin - 65, signY, pageWidth - margin - 10, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer / Buyer Signature', margin + 37.5, signY + 4.5, { align: 'center' });
  doc.text('Authorized Signatory & Seal', pageWidth - margin - 37.5, signY + 4.5, { align: 'center' });

  // Footer Watermark
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Deal Commercial Statement • Barcode: ${dealNo} • Generated automatically from Armee Enterprises PMS on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
}

export function downloadPaymentReceiptPdf(
  arg1: CustomerPurchase | CustomerPayment,
  arg2: CustomerPurchase | CustomerPayment,
  options?: string | PdfOptions
): void {
  const doc = generatePaymentReceiptSlipPdf(arg1, arg2, options);
  const p = ('receipt_voucher_no' in arg1 || 'receiptVoucherNo' in arg1) ? (arg1 as CustomerPayment) : (arg2 as CustomerPayment);
  const vNo = p.receipt_voucher_no || p.receiptVoucherNo || 'REC';
  doc.save(`${vNo}_Receipt_Slip.pdf`);
}

export function viewPaymentReceiptPdfInNewTab(
  arg1: CustomerPurchase | CustomerPayment,
  arg2: CustomerPurchase | CustomerPayment,
  options?: string | PdfOptions
): void {
  const doc = generatePaymentReceiptSlipPdf(arg1, arg2, options);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export function downloadPurchaseStatementPdf(purchase: CustomerPurchase, options?: string | PdfOptions): void {
  const doc = generatePurchaseStatementPdf(purchase, options);
  const dNo = purchase.deal_number || purchase.dealNumber || 'DEAL';
  doc.save(`${dNo}_Statement.pdf`);
}

export function viewPurchaseStatementPdfInNewTab(purchase: CustomerPurchase, options?: string | PdfOptions): void {
  const doc = generatePurchaseStatementPdf(purchase, options);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
