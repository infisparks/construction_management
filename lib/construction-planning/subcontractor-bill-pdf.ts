'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SubcontractorBill, ProjectInfo } from './types';

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

export function generateSubcontractorBillPdf(
  bill: SubcontractorBill,
  project?: Partial<ProjectInfo>
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

  // --- Header Brand Bar ---
  doc.setFillColor(79, 70, 229); // #4F46E5 (Indigo 600)
  doc.rect(margin, currentY, pageWidth - margin * 2, 3, 'F');
  currentY += 8;

  // Company / PMS Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39); // #111827
  doc.text('Armee Enterprises', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text('Civil Engineering, High-Rise & Commercial General Contracting', margin, currentY + 4);
  doc.text('Civil & Project Management Office | Contact: +91 98201 55000', margin, currentY + 8);

  // Title on right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229);
  doc.text('SUB-CONTRACTOR BILL', pageWidth - margin, currentY, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(`BILL #: ${bill.billNumber || 'SB-DRAFT'}`, pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Date: ${bill.billDate || new Date().toISOString().split('T')[0]}`, pageWidth - margin, currentY + 9, { align: 'right' });
  if (bill.dueDate) {
    doc.text(`Due: ${bill.dueDate}`, pageWidth - margin, currentY + 13, { align: 'right' });
  }

  currentY += 18;

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // --- Dynamic Project Details (Print ONLY details that are present) ---
  const projectLines: string[] = [];
  if (project?.code && project.code.trim()) {
    projectLines.push(`Project Code: ${project.code.trim()}`);
  }
  const loc = (project?.location || '').trim();
  if (loc) {
    projectLines.push(`Location: ${loc}`);
  }
  if (project?.clientName && project.clientName.trim()) {
    projectLines.push(`Client: ${project.clientName.trim()}`);
  }
  const contractor = (project?.generalContractor || '').trim();
  if (contractor) {
    projectLines.push(`Principal Contractor: ${contractor}`);
  }

  // --- Dynamic Vendor Details (Print ONLY details that are present) ---
  const vendorLines: string[] = [];
  if (bill.vendorTrade && bill.vendorTrade.trim()) {
    vendorLines.push(`Trade / Work: ${bill.vendorTrade.trim()}`);
  }
  if (bill.vendorPhone && bill.vendorPhone.trim()) {
    vendorLines.push(`Phone: ${bill.vendorPhone.trim()}`);
  }
  const taxIdParts: string[] = [];
  if (bill.vendorGstin && bill.vendorGstin.trim()) taxIdParts.push(`GSTIN: ${bill.vendorGstin.trim()}`);
  if (bill.vendorPan && bill.vendorPan.trim()) taxIdParts.push(`PAN: ${bill.vendorPan.trim()}`);
  if (taxIdParts.length > 0) {
    vendorLines.push(taxIdParts.join('  |  '));
  }
  if (bill.vendorBankDetails && bill.vendorBankDetails.trim()) {
    vendorLines.push(`Bank: ${bill.vendorBankDetails.trim()}`);
  }

  // --- Two-Column Meta Box ---
  const boxWidth = (pageWidth - margin * 2 - 6) / 2;
  const maxLines = Math.max(projectLines.length, vendorLines.length);
  const boxHeight = Math.max(28, 14 + maxLines * 4.5);

  // Box 1: Project Information (Only Present Details Printed)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  doc.text('PROJECT & SITE DETAILS', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(project?.name || 'Construction Site', margin + 3, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  let pLineY = currentY + 15;
  projectLines.forEach((line) => {
    doc.text(line, margin + 3, pLineY);
    pLineY += 4.5;
  });

  // Box 2: Vendor / Subcontractor Information (Only Present Details Printed)
  const box2X = margin + boxWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  doc.text('SUB-CONTRACTOR / VENDOR', box2X + 3, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text(bill.vendorName || 'Subcontractor', box2X + 3, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  let vLineY = currentY + 15;
  vendorLines.forEach((line) => {
    doc.text(line, box2X + 3, vLineY);
    vLineY += 4.5;
  });

  currentY += boxHeight + 6;

  // --- Table of Items ---
  const tableRows = bill.items.map((item, idx) => [
    (idx + 1).toString(),
    item.name || 'Work item',
    `${item.billedQty || 0} / ${item.unbilledQty || item.quantity || 0}`,
    item.unit || 'sqm',
    `Rs. ${Number(item.rate || 0).toLocaleString('en-IN')}`,
    `${Number(item.quantity || 0).toLocaleString('en-IN')}`,
    `Rs. ${Number(item.amount || 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item / Work Description', 'Billed / Scope', 'Unit', 'Rate', 'Quantity', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [31, 41, 55],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Position after table
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || currentY + 40;
  currentY = finalY + 4;

  // --- Financial Summary & Deductions/Retentions Breakdown ---
  const sumBoxWidth = 85;
  const sumBoxX = pageWidth - margin - sumBoxWidth;

  const hasDeductions = (bill.preTaxDeductionTotal || 0) > 0;
  const hasRetentions = (bill.preTaxRetentionTotal || 0) > 0;
  const hasSubtotalDivider = hasDeductions || hasRetentions;
  const hasGst = (bill.gstAmount || 0) > 0;
  const hasAddCharges = (bill.additionalCharges || 0) > 0;

  // Calculate box height dynamically based on active rows
  let rowCount = 1; // Item Subtotal
  if (hasDeductions) rowCount++;
  if (hasRetentions) rowCount++;
  if (hasSubtotalDivider) rowCount++; // Net Subtotal
  if (hasGst) rowCount++;
  if (hasAddCharges) rowCount++;

  const summaryBoxHeight = Math.max(38, rowCount * 5.2 + 20);

  // Left Note & Breakdown Box
  const leftBoxWidth = sumBoxX - margin - 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, leftBoxWidth, summaryBoxHeight, 2, 2, 'D');

  let leftY = currentY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(79, 70, 229);
  doc.text('DEDUCTIONS & RETENTIONS AUDIT', margin + 3, leftY);
  leftY += 4.5;

  // Active deductions list
  const activeDeductions = bill.deductions?.filter((d) => d.isSelected && d.amount > 0) || [];
  if (activeDeductions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text('Pre-Tax Deductions:', margin + 3, leftY);
    leftY += 3.5;
    activeDeductions.forEach((d) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(`- ${d.name}: Rs. ${Number(d.amount).toLocaleString('en-IN')}`, margin + 5, leftY);
      leftY += 3.2;
    });
  }

  // Active retentions list
  const activeRetentions = bill.retentions?.filter((r) => r.isSelected && r.amount > 0) || [];
  if (activeRetentions.length > 0) {
    leftY += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);
    doc.text('Pre-Tax Retentions Held:', margin + 3, leftY);
    leftY += 3.5;
    activeRetentions.forEach((r) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      const dueInfo = r.dueDate ? ` (Due: ${r.dueDate})` : '';
      doc.text(`- ${r.name}: Rs. ${Number(r.amount).toLocaleString('en-IN')}${dueInfo}`, margin + 5, leftY);
      leftY += 3.2;
    });
  }

  if (activeDeductions.length === 0 && activeRetentions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('- No pre-tax deductions or retentions applied.', margin + 3, leftY);
    leftY += 3.5;
  }

  // Bill Notes Section
  leftY += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(79, 70, 229);
  doc.text('BILL NOTES & REMARKS:', margin + 3, leftY);
  leftY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(75, 85, 99);
  const noteLines = doc.splitTextToSize(bill.notes || 'Work verified against site measurement sheets. Verified with technical specification drawings and passed for processing.', leftBoxWidth - 6);
  doc.text(noteLines, margin + 3, leftY);

  // Right Calculations Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(sumBoxX, currentY, sumBoxWidth, summaryBoxHeight, 2, 2, 'FD');

  let rightY = currentY + 5;
  const labelX = sumBoxX + 4;
  const valX = sumBoxX + sumBoxWidth - 4;

  const printRow = (label: string, value: string, isBold: boolean = false, isMinus: boolean = false, isPurple: boolean = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 8.5 : 8);
    if (isPurple) {
      doc.setTextColor(79, 70, 229);
    } else if (isMinus) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(31, 41, 55);
    }
    doc.text(label, labelX, rightY);
    doc.text(value, valX, rightY, { align: 'right' });
    rightY += 5.2;
  };

  printRow('Item Subtotal', `Rs. ${Number(bill.itemSubtotal || 0).toLocaleString('en-IN')}`, false);
  
  // Print (-) Pre-Tax Deduction ONLY if > 0
  if (hasDeductions) {
    printRow('(-) Pre-Tax Deduction', `- Rs. ${Number(bill.preTaxDeductionTotal).toLocaleString('en-IN')}`, false, true);
  }

  // Print (-) Pre-Tax Retention ONLY if > 0
  if (hasRetentions) {
    printRow('(-) Pre-Tax Retention', `- Rs. ${Number(bill.preTaxRetentionTotal).toLocaleString('en-IN')}`, false, true);
  }
  
  // Divider & Net Subtotal ONLY if deductions or retentions are applied
  if (hasSubtotalDivider) {
    doc.setDrawColor(209, 213, 219);
    doc.line(sumBoxX + 3, rightY - 1.5, sumBoxX + sumBoxWidth - 3, rightY - 1.5);
    rightY += 1.5;
    printRow('Net Subtotal', `Rs. ${Number(bill.netSubtotal || 0).toLocaleString('en-IN')}`, true);
  }

  // Print GST ONLY if applied (> 0)
  if (hasGst) {
    printRow(`GST (${bill.gstRate || 0}%)`, `+ Rs. ${Number(bill.gstAmount).toLocaleString('en-IN')}`, false);
  }

  // Print Additional Charges ONLY if applied (> 0)
  if (hasAddCharges) {
    printRow('(+) Additional Charges', `+ Rs. ${Number(bill.additionalCharges).toLocaleString('en-IN')}`, false);
  }

  // Highlight Box for Grand Total
  rightY += 1;
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(sumBoxX + 2, rightY - 1, sumBoxWidth - 4, 10, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAYABLE', sumBoxX + 5, rightY + 5.5);
  doc.text(`Rs. ${Number(bill.grandTotal || 0).toLocaleString('en-IN')}`, valX - 2, rightY + 5.5, { align: 'right' });

  currentY += summaryBoxHeight + 5;

  // --- Terms & Signatures Block ---
  const signBoxHeight = 26;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, signBoxHeight, 2, 2, 'D');

  const colWidth = (pageWidth - margin * 2) / 3;
  
  // Col 1: Prepared By
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('PREPARED BY', margin + 4, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Site Quantity Surveyor', margin + 4, currentY + 9);
  doc.text('Sign: ___________________', margin + 4, currentY + 20);

  // Col 2: Subcontractor Acceptance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SUB-CONTRACTOR ACCEPTANCE', margin + colWidth + 4, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Auth. Signatory (${bill.vendorName || 'Vendor'})`, margin + colWidth + 4, currentY + 9);
  doc.text('Sign & Stamp: ___________________', margin + colWidth + 4, currentY + 20);

  // Col 3: Approved By
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CERTIFIED & APPROVED BY', margin + colWidth * 2 + 4, currentY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Project Director / Resident Engineer', margin + colWidth * 2 + 4, currentY + 9);
  doc.text('Approval Stamp: ___________________', margin + colWidth * 2 + 4, currentY + 20);

  // --- Footer ---
  const footerY = pageHeight - 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text('This is a computer generated Sub-Contractor RA Bill created on Armee Enterprises PMS. Valid without physical signature when digital verification token is present.', margin, footerY);
  doc.text('Page 1 of 1', pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

/**
 * Downloads the PDF directly to the user's computer.
 */
export function downloadSubcontractorBillPdf(
  bill: SubcontractorBill,
  project?: Partial<ProjectInfo>
): void {
  const doc = generateSubcontractorBillPdf(bill, project);
  const fileName = `Subcontractor_Bill_${(bill.billNumber || bill.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(fileName);
}

/**
 * Creates a Blob URL for the PDF and opens it in a new window/tab,
 * and also returns the blob URL string so it can be viewed in an iframe / object preview.
 */
export function getSubcontractorBillPdfBlobUrl(
  bill: SubcontractorBill,
  project?: Partial<ProjectInfo>
): { blobUrl: string; blob: Blob } {
  const doc = generateSubcontractorBillPdf(bill, project);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return { blobUrl, blob };
}

/**
 * Directly opens the generated PDF Blob URL in a new browser tab.
 */
export function viewSubcontractorBillPdfInNewTab(
  bill: SubcontractorBill,
  project?: Partial<ProjectInfo>
): string {
  const { blobUrl } = getSubcontractorBillPdfBlobUrl(bill, project);
  window.open(blobUrl, '_blank');
  return blobUrl;
}
