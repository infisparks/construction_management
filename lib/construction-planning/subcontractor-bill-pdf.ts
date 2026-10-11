'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SubcontractorBill, ProjectInfo } from './types';

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);
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
  doc.text('InfiBuild Infrastructure & Construction', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text('Civil Engineering, High-Rise & Commercial General Contracting', margin, currentY + 4);
  doc.text('Reg Office: Plot 44, Tech Boulevard, Sector 62, Gurgaon, HR | GSTIN: 06AABCI9921D1ZZ', margin, currentY + 8);

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

  // --- Two-Column Meta Box ---
  const boxWidth = (pageWidth - margin * 2 - 6) / 2;
  const boxHeight = 32;

  // Box 1: Project Information
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
  doc.text(project?.name || 'The Grand Horizon Towers - Tower B', margin + 3, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Project Code: ${project?.code || 'PRJ-2026-GHT-B'}`, margin + 3, currentY + 15);
  doc.text(`Location: ${project?.location || 'Sector 74, Gurgaon, NCR'}`, margin + 3, currentY + 19);
  doc.text(`Client: ${project?.clientName || 'Horizon Realty & Infrastructure Ltd'}`, margin + 3, currentY + 23);
  doc.text(`Principal Contractor: ${project?.generalContractor || 'InfiBuild EPC Ltd'}`, margin + 3, currentY + 27);

  // Box 2: Vendor / Subcontractor Information
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
  doc.text(bill.vendorName || 'Apex Civil Contractors', box2X + 3, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Trade / Work: ${bill.vendorTrade || 'Civil & RCC Specialist'}`, box2X + 3, currentY + 15);
  doc.text(`Phone: ${bill.vendorPhone || '+91 98201 44512'}`, box2X + 3, currentY + 19);
  doc.text(`GSTIN: ${bill.vendorGstin || '27AABCS1429B1Z4'}  |  PAN: ${bill.vendorPan || 'AABCS1429B'}`, box2X + 3, currentY + 23);
  doc.text(`Bank: ${bill.vendorBankDetails || 'HDFC Bank A/C: 501002391024 (IFSC: HDFC0000128)'}`, box2X + 3, currentY + 27);

  currentY += boxHeight + 6;

  // --- Table of Items ---
  const tableRows = bill.items.map((item, idx) => [
    (idx + 1).toString(),
    item.name || 'Work item',
    `${item.billedQty || 0} / ${item.unbilledQty || item.quantity || 0}`,
    item.unit || 'sqm',
    `INR ${Number(item.rate || 0).toLocaleString('en-IN')}`,
    `${Number(item.quantity || 0).toLocaleString('en-IN')}`,
    `INR ${Number(item.amount || 0).toLocaleString('en-IN')}`,
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

  // Left Note & Breakdown Box
  const leftBoxWidth = sumBoxX - margin - 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, leftBoxWidth, 62, 2, 2, 'D');

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
      doc.text(`- ${d.name}: INR ${Number(d.amount).toLocaleString('en-IN')}`, margin + 5, leftY);
      leftY += 3.2;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('- No pre-tax deductions applied.', margin + 3, leftY);
    leftY += 3.5;
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
      doc.text(`- ${r.name}: INR ${Number(r.amount).toLocaleString('en-IN')}${dueInfo}`, margin + 5, leftY);
      leftY += 3.2;
    });
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
  doc.roundedRect(sumBoxX, currentY, sumBoxWidth, 62, 2, 2, 'FD');

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

  printRow('Item Subtotal', `INR ${Number(bill.itemSubtotal || 0).toLocaleString('en-IN')}`, false);
  printRow('(-) Pre-Tax Deduction', `- INR ${Number(bill.preTaxDeductionTotal || 0).toLocaleString('en-IN')}`, false, true);
  printRow('(-) Pre-Tax Retention', `- INR ${Number(bill.preTaxRetentionTotal || 0).toLocaleString('en-IN')}`, false, true);
  
  // Divider
  doc.setDrawColor(209, 213, 219);
  doc.line(sumBoxX + 3, rightY - 1.5, sumBoxX + sumBoxWidth - 3, rightY - 1.5);
  rightY += 1.5;

  printRow('Net Subtotal', `INR ${Number(bill.netSubtotal || 0).toLocaleString('en-IN')}`, true);
  printRow(`GST (${bill.gstRate || 0}%)`, `+ INR ${Number(bill.gstAmount || 0).toLocaleString('en-IN')}`, false);
  if (bill.additionalCharges > 0) {
    printRow('(+) Additional Charges', `+ INR ${Number(bill.additionalCharges || 0).toLocaleString('en-IN')}`, false);
  }

  // Highlight Box for Grand Total
  rightY += 1;
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(sumBoxX + 2, rightY - 1, sumBoxWidth - 4, 10, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAYABLE', sumBoxX + 5, rightY + 5.5);
  doc.text(`INR ${Number(bill.grandTotal || 0).toLocaleString('en-IN')}`, valX - 2, rightY + 5.5, { align: 'right' });

  currentY += 66;

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
  doc.text('This is a computer generated Sub-Contractor RA Bill created on InfiBuild PMS. Valid without physical signature when digital verification token is present.', margin, footerY);
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
