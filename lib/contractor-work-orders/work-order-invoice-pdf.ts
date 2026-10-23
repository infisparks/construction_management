'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ContractorWorkOrder, WorkOrderPayment } from './types';
import { drawBarcodeOnPdf } from '@/lib/common/pdf-barcode';

export function formatINR(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'Rs. 0.00';
  return `Rs. ${Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface WorkOrderPdfOptions {
  projectName?: string;
  projectCode?: string;
  projectLocation?: string;
  companyName?: string;
  companyContact?: string;
  activePayment?: WorkOrderPayment; // If generating a specific Payment Receipt Voucher
}

/**
 * Generate a certified, professional Contractor Work Order & Commercial Invoice PDF
 */
export function generateWorkOrderInvoicePdf(
  order: ContractorWorkOrder,
  options: WorkOrderPdfOptions = {}
): jsPDF {
  const {
    projectName = 'Noori Crest Tower',
    projectCode = 'NC-2026',
    projectLocation = 'Plot 48/A, Commercial Business Hub, Mumbai',
    companyName = 'Armee Enterprises',
    companyContact = 'Civil & Construction Office | Tel: +91 98201 55000',
    activePayment,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  const isReceipt = Boolean(activePayment);
  const docTitle = isReceipt ? 'CONTRACTOR PAYMENT DISBURSEMENT RECEIPT' : 'CONTRACTOR WORK ORDER & COMMERCIAL INVOICE';
  const voucherCode = isReceipt && activePayment ? activePayment.paymentVoucherNo : order.workOrderNumber;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(88, 28, 135); // Deep Purple 900 #581c87
  doc.rect(margin, currentY, pageWidth - margin * 2, 3.5, 'F');
  currentY += 8;

  // 2. Company / Contractor Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(companyName, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('General Contracting, Structural Works & High-Rise Infrastructure', margin, currentY + 4.5);
  doc.text(`${companyContact} • Site: ${projectName} (${projectCode})`, margin, currentY + 8.5);

  // Document Title & Barcode on Top-Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(109, 40, 217); // Purple 700
  doc.text(docTitle, pageWidth - margin, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(`DOC REF: ${voucherCode}`, pageWidth - margin, currentY + 5, { align: 'right' });

  const dateStr = isReceipt && activePayment ? activePayment.paymentDate : order.startDate;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`DATE: ${dateStr}`, pageWidth - margin, currentY + 9, { align: 'right' });

  // Draw Code 39 Barcode
  drawBarcodeOnPdf(doc, voucherCode, {
    x: pageWidth - margin - 46,
    y: currentY + 11.5,
    height: 6.5,
    narrowBarWidth: 0.22,
    includeText: false,
  });

  currentY += 23;

  // Horizontal Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // 3. Dual Information Panels: Project Site & Contractor / Vendor
  const colW = (pageWidth - margin * 2 - 4) / 2;

  // Left Box: Project Site Details
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, colW, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(109, 40, 217);
  doc.text('PROJECT SITE DETAILS', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  doc.text(`Project Name: ${projectName}`, margin + 4, currentY + 11);
  doc.text(`Project Code: ${projectCode}`, margin + 4, currentY + 15.5);
  doc.text(`Location: ${projectLocation}`, margin + 4, currentY + 20, { maxWidth: colW - 8 });
  doc.text(`Trade / Category: ${order.tradeCategory}`, margin + 4, currentY + 25);

  // Right Box: Vendor / Contractor Details
  const rightX = margin + colW + 4;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(rightX, currentY, colW, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(109, 40, 217);
  doc.text('CONTRACTOR / VENDOR DETAILS', rightX + 4, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(order.vendorName, rightX + 4, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text(`Contact Phone: ${order.vendorPhone || 'Not Specified'}`, rightX + 4, currentY + 15.5);
  const taxId = [order.vendorGstin ? `GSTIN: ${order.vendorGstin}` : '', order.vendorPan ? `PAN: ${order.vendorPan}` : '']
    .filter(Boolean)
    .join(' | ') || 'PAN/GST: N/A';
  doc.text(taxId, rightX + 4, currentY + 20);
  if (order.vendorBankUpi) {
    doc.text(`Bank/UPI: ${order.vendorBankUpi}`, rightX + 4, currentY + 25, { maxWidth: colW - 8 });
  }

  currentY += 34;

  // 4. Work Scope & Description Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 17, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('WORK ORDER TITLE & CONTRACT SCOPE:', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(order.title, margin + 4, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  const scopeTxt = order.scopeDescription || 'General site contractor work as per approved execution specifications.';
  doc.text(scopeTxt, margin + 4, currentY + 14.5, { maxWidth: pageWidth - margin * 2 - 8 });

  currentY += 21;

  // 5. Commercial Summary Highlights Bar
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'FD');

  const metricW = (pageWidth - margin * 2) / 4;

  // Metric 1: Initial Agreed
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('INITIAL AGREED AMOUNT', margin + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text(formatINR(order.initialAmount), margin + 4, currentY + 12);

  // Metric 2: Extra Work Added
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('EXTRA WORK VARIATIONS (+)', margin + metricW + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text(formatINR(order.extraAmount), margin + metricW + 4, currentY + 12);

  // Metric 3: Total Revised Amount
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('TOTAL REVISED CONTRACT', margin + metricW * 2 + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(109, 40, 217); // Purple
  doc.text(formatINR(order.totalRevisedAmount), margin + metricW * 2 + 4, currentY + 12);

  // Metric 4: Balance Remaining
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('BALANCE REMAINING', margin + metricW * 3 + 4, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const isPending = order.balanceRemaining > 0;
  doc.setTextColor(isPending ? 185 : 16, isPending ? 28 : 185, isPending ? 28 : 129); // Red or Green
  doc.text(formatINR(order.balanceRemaining), margin + metricW * 3 + 4, currentY + 12);

  currentY += 23;

  // 6. Extra Work Variations & Scope Additions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('1. CONTRACT VARIATIONS & EXTRA WORK AMENDMENT HISTORY', margin, currentY);
  currentY += 2;

  const revisions = order.revisions || [];
  const revisionRows = revisions.map((rev, idx) => [
    idx + 1,
    rev.revisionDate,
    rev.revisionType === 'initial_agreement' ? 'Initial Agreement' : 'Extra Work Addition',
    rev.reason + (rev.notes ? `\nNote: ${rev.notes}` : ''),
    formatINR(rev.previousAmount),
    (rev.additionalAmount >= 0 ? '+ ' : '') + formatINR(rev.additionalAmount),
    formatINR(rev.newTotalAmount),
  ]);

  if (revisionRows.length === 0) {
    revisionRows.push([1, order.startDate, 'Initial Contract', order.title, formatINR(0), formatINR(order.initialAmount), formatINR(order.initialAmount)]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Date', 'Type', 'Reason / Scope Description', 'Previous Amt', 'Extra Added', 'Revised Total']],
    body: revisionRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // Check if page overflow
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = margin;
  }

  // 7. Payment Disbursement History Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('2. PAYMENTS & DISBURSEMENTS GIVEN TO CONTRACTOR', margin, currentY);
  currentY += 2;

  const payments = order.payments || [];
  const paymentRows = payments.map((pay, idx) => [
    idx + 1,
    pay.paymentDate,
    pay.paymentVoucherNo,
    pay.paymentMode.toUpperCase(),
    pay.paidTo + (pay.referenceNumber ? `\nRef: ${pay.referenceNumber}` : ''),
    pay.notes || 'Payout release',
    formatINR(pay.amountPaid),
  ]);

  if (paymentRows.length === 0) {
    paymentRows.push(['—', '—', '—', '—', 'No payments released yet', '—', formatINR(0)]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Date', 'Voucher #', 'Mode', 'Paid To / Ref', 'Disbursement Note', 'Amount Given']],
    body: paymentRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 25 },
      3: { cellWidth: 18 },
      4: { cellWidth: 35 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check if page overflow
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin;
  }

  // 8. Commercial Total Summary Box
  const summaryBoxW = 90;
  const summaryX = pageWidth - margin - summaryBoxW;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(summaryX, currentY, summaryBoxW, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Total Agreed Contract:', summaryX + 4, currentY + 6);
  doc.text(formatINR(order.totalRevisedAmount), summaryX + summaryBoxW - 4, currentY + 6, { align: 'right' });

  doc.text('Total Amount Disbursed / Given:', summaryX + 4, currentY + 12);
  doc.text(formatINR(order.totalPaid), summaryX + summaryBoxW - 4, currentY + 12, { align: 'right' });

  doc.setDrawColor(209, 213, 219);
  doc.line(summaryX + 4, currentY + 15, summaryX + summaryBoxW - 4, currentY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('Outstanding Remaining Balance:', summaryX + 4, currentY + 21);
  doc.setTextColor(isPending ? 185 : 16, isPending ? 28 : 185, isPending ? 28 : 129);
  doc.text(formatINR(order.balanceRemaining), summaryX + summaryBoxW - 4, currentY + 21, { align: 'right' });

  currentY += 34;

  // Check if page overflow
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = margin + 10;
  }

  // 9. Signatures Block
  const sigW = (pageWidth - margin * 2 - 20) / 2;

  // Contractor Signature
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, currentY + 12, margin + sigW, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Contractor / Vendor Signature & Seal', margin, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`Name: ${order.vendorName}`, margin, currentY + 20);

  // Authorized Signatory
  const rightSigX = pageWidth - margin - sigW;
  doc.line(rightSigX, currentY + 12, rightSigX + sigW, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Authorized Project Manager / Commercial Incharge', rightSigX, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(`For: ${companyName}`, rightSigX, currentY + 20);

  // Footer text
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated by Armee Enterprises PMS System • System Verified Ledger • Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadWorkOrderPdf(order: ContractorWorkOrder, options?: WorkOrderPdfOptions): void {
  const doc = generateWorkOrderInvoicePdf(order, options);
  const filename = `${order.workOrderNumber}_${order.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

export function viewWorkOrderPdfInNewTab(order: ContractorWorkOrder, options?: WorkOrderPdfOptions): void {
  const doc = generateWorkOrderInvoicePdf(order, options);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
