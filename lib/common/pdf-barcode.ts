/**
 * PDF Barcode Generator (Code 39 standard)
 * Renders pure vector barcode rectangles directly into jsPDF documents.
 * High-precision, zero-dependency, crystal-clear at any print/screen resolution.
 */
import type jsPDF from 'jspdf';

// Code 39 encoding table (0 = narrow space/bar, 1 = wide space/bar)
// Format: 9 elements per char (5 bars, 4 spaces), total 3 wide, 6 narrow.
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100', // Start / Stop delimiter
};

export interface BarcodeRenderOptions {
  x: number;
  y: number;
  height?: number;
  narrowBarWidth?: number;
  wideBarMultiplier?: number;
  includeText?: boolean;
  textSize?: number;
  textColor?: [number, number, number];
  barColor?: [number, number, number];
}

/**
 * Draws a clean, scannable Code 39 barcode onto the jsPDF document.
 * Returns the total width consumed in mm.
 */
export function drawBarcodeOnPdf(
  doc: jsPDF,
  rawText: string,
  options: BarcodeRenderOptions
): number {
  if (!rawText || !rawText.trim()) return 0;

  const {
    x,
    y,
    height = 9,
    narrowBarWidth = 0.28,
    wideBarMultiplier = 2.4,
    includeText = true,
    textSize = 6.5,
    textColor = [55, 65, 81],
    barColor = [15, 23, 42],
  } = options;

  const wideBarWidth = narrowBarWidth * wideBarMultiplier;
  const interCharSpace = narrowBarWidth * 1.5;

  // Clean text and wrap with asterisk delimiters
  const clean = rawText.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '-');
  const encodedStr = `*${clean}*`;

  // Save current PDF graphics state
  const prevFillColor = doc.getFillColor();
  doc.setFillColor(barColor[0], barColor[1], barColor[2]);

  let currentX = x;

  for (let i = 0; i < encodedStr.length; i++) {
    const char = encodedStr[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let p = 0; p < pattern.length; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const elementWidth = isWide ? wideBarWidth : narrowBarWidth;

      if (isBar) {
        doc.rect(currentX, y, elementWidth, height, 'F');
      }
      currentX += elementWidth;
    }

    // Inter-character space
    if (i < encodedStr.length - 1) {
      currentX += interCharSpace;
    }
  }

  const totalWidth = currentX - x;

  // Human-readable text label below barcode
  if (includeText) {
    doc.setFont('courier', 'bold');
    doc.setFontSize(textSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const textCenter = x + totalWidth / 2;
    doc.text(clean, textCenter, y + height + 3, { align: 'center' });
  }

  return totalWidth;
}
